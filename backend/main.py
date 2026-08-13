import os
import json
import re

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from google import genai


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing.")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI(
    title="ResumeAI Backend",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://my-ats-app-16.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SemanticMatchRequest(BaseModel):
    resume_text: str
    job_description: str


class TailorResumeRequest(BaseModel):
    resume: dict
    job_description: str
    job_title: str | None = None
    company_name: str | None = None


def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s+#.-]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "ResumeAI backend is running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.post("/semantic-match")
def semantic_match(request: SemanticMatchRequest):
    try:
        resume_text = clean_text(request.resume_text)
        job_description = clean_text(request.job_description)

        if not resume_text:
            raise HTTPException(
                status_code=400,
                detail="Resume text is required.",
            )

        if not job_description:
            raise HTTPException(
                status_code=400,
                detail="Job description is required.",
            )

        vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            max_features=5000,
        )

        vectors = vectorizer.fit_transform(
            [
                resume_text,
                job_description,
            ]
        )

        similarity = cosine_similarity(
            vectors[0:1],
            vectors[1:2],
        )[0][0]

        score = round(float(similarity) * 100)

        score = max(0, min(score, 100))

        if score >= 75:
            level = "Strong Match"
        elif score >= 50:
            level = "Good Match"
        elif score >= 30:
            level = "Moderate Match"
        else:
            level = "Low Match"

        return {
            "similarity": round(float(similarity), 4),
            "semantic_score": score,
            "level": level,
            "method": "TF-IDF cosine similarity",
        }

    except HTTPException:
        raise

    except ValueError:
        return {
            "similarity": 0,
            "semantic_score": 0,
            "level": "Low Match",
            "method": "TF-IDF cosine similarity",
        }

    except Exception as exc:
        print("Semantic match error:", exc)

        raise HTTPException(
            status_code=500,
            detail="Unable to calculate semantic match.",
        )


@app.post("/tailor-resume")
def tailor_resume(request: TailorResumeRequest):
    try:
        if not request.job_description.strip():
            raise HTTPException(
                status_code=400,
                detail="Job description is required.",
            )

        resume = request.resume

        prompt = f"""
You are an expert resume tailoring assistant.

Your job is to improve an existing resume for a specific job description.

CRITICAL TRUTHFULNESS RULES:

1. Do NOT invent employment history.
2. Do NOT invent company names.
3. Do NOT invent job titles.
4. Do NOT invent education.
5. Do NOT invent degrees.
6. Do NOT invent certifications.
7. Do NOT invent projects.
8. Do NOT invent technologies or tools the candidate has never used.
9. Do NOT invent skills.
10. Do NOT invent numbers, percentages, revenue, impact metrics, team sizes,
    performance gains, customer counts, or achievements.
11. Do NOT claim the candidate has experience they do not have.
12. Missing job requirements must only appear under
    "missing_skill_suggestions".
13. You may rewrite existing experience and project descriptions to improve
    clarity, ATS wording, action verbs, and relevance.
14. Preserve all factual dates, employers, roles, project names, and technologies.
15. Keep the output concise and professional.

JOB TITLE:
{request.job_title or "Not provided"}

COMPANY:
{request.company_name or "Not provided"}

JOB DESCRIPTION:
{request.job_description}

CURRENT RESUME JSON:
{json.dumps(resume, ensure_ascii=False)}

Return ONLY valid JSON.

Do not use markdown fences.

Return exactly this structure:

{{
  "tailored_summary": "string",
  "tailored_experience": [
    {{
      "company": "string",
      "role": "string",
      "startDate": "string",
      "endDate": "string",
      "description": "string"
    }}
  ],
  "tailored_projects": [
    {{
      "name": "string",
      "description": "string",
      "technologies": "string"
    }}
  ],
  "recommended_existing_skills": [
    "string"
  ],
  "missing_skill_suggestions": [
    "string"
  ],
  "improvement_notes": [
    "string"
  ]
}}
"""

        response = gemini_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
        )

        raw_text = response.text

        if not raw_text:
            raise HTTPException(
                status_code=500,
                detail="Gemini returned an empty response.",
            )

        cleaned = raw_text.strip()

        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]

        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]

        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        cleaned = cleaned.strip()

        try:
            result = json.loads(cleaned)

        except json.JSONDecodeError as exc:
            print("Gemini raw response:")
            print(raw_text)
            print("JSON error:", exc)

            raise HTTPException(
                status_code=500,
                detail="Gemini returned invalid JSON.",
            )

        required_keys = [
            "tailored_summary",
            "tailored_experience",
            "tailored_projects",
            "recommended_existing_skills",
            "missing_skill_suggestions",
            "improvement_notes",
        ]

        for key in required_keys:
            if key not in result:
                raise HTTPException(
                    status_code=500,
                    detail=f"Gemini response is missing: {key}",
                )

        return result

    except HTTPException:
        raise

    except Exception as exc:
        print("Tailor resume error:", exc)

        raise HTTPException(
            status_code=500,
            detail="Unable to tailor resume.",
        )