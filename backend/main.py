import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer


# ---------------------------------------------------------
# ENV
# ---------------------------------------------------------

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY was not found in backend/.env"
    )


# ---------------------------------------------------------
# APP
# ---------------------------------------------------------

app = FastAPI(
    title="ResumeAI Backend",
    version="3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# MODELS
# ---------------------------------------------------------

semantic_model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)

gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)


# ---------------------------------------------------------
# REQUEST MODELS
# ---------------------------------------------------------

class SemanticRequest(BaseModel):
    resume_text: str
    job_description: str


class TailorResumeRequest(BaseModel):
    resume: dict
    job_description: str
    job_title: str | None = None
    company_name: str | None = None


# ---------------------------------------------------------
# ROOT
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "ResumeAI backend is running",
        "semantic_matching": True,
        "resume_tailoring": True,
    }


# ---------------------------------------------------------
# SEMANTIC MATCH
# ---------------------------------------------------------

@app.post("/semantic-match")
def semantic_match(request: SemanticRequest):

    texts = [
        request.resume_text,
        request.job_description,
    ]

    embeddings = semantic_model.encode(texts)

    similarity_matrix = semantic_model.similarity(
        embeddings,
        embeddings,
    )

    similarity = float(
        similarity_matrix[0][1]
    )

    similarity = max(
        0.0,
        min(similarity, 1.0)
    )

    score = round(
        similarity * 100
    )

    if score >= 80:
        level = "Strong semantic match"

    elif score >= 65:
        level = "Good semantic match"

    elif score >= 50:
        level = "Moderate semantic match"

    else:
        level = "Low semantic match"

    return {
        "semantic_score": score,
        "similarity": round(
            similarity,
            4
        ),
        "level": level,
    }


# ---------------------------------------------------------
# RESUME TAILORING
# ---------------------------------------------------------

@app.post("/tailor-resume")
def tailor_resume(
    request: TailorResumeRequest
):
    try:

        resume_json = json.dumps(
            request.resume,
            indent=2,
            ensure_ascii=False
        )

        job_title = (
            request.job_title
            or "Not provided"
        )

        company_name = (
            request.company_name
            or "Not provided"
        )

        prompt = f"""
You are an expert ATS resume editor.

Your task is to tailor an existing resume toward a specific job
description while preserving complete factual accuracy.

STRICT RULES:

1. NEVER invent employment history.
2. NEVER invent companies.
3. NEVER invent job titles.
4. NEVER invent education.
5. NEVER invent degrees.
6. NEVER invent certifications.
7. NEVER invent projects.
8. NEVER invent technologies or skills.
9. NEVER invent numbers, percentages, metrics, achievements,
   revenue figures, user counts or performance improvements.
10. NEVER claim the candidate knows a skill unless that skill or
    closely related evidence already exists in the supplied resume.
11. Do not change names, dates, employers, colleges or factual
    identifiers.
12. Improve wording, clarity, ATS alignment and relevance only.
13. Use strong action-oriented language where justified by the
    original resume.
14. If the job description requests a skill that is not supported
    by the resume, put it inside "missing_skill_suggestions".
15. Do NOT insert unsupported missing skills into the tailored
    resume.

TARGET JOB TITLE:
{job_title}

TARGET COMPANY:
{company_name}

JOB DESCRIPTION:
{request.job_description}

ORIGINAL RESUME:
{resume_json}


Return ONLY valid JSON.

Use exactly this structure:

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

Important:

- Preserve factual content from the original resume.
- Rewrite only what can truthfully be supported.
- "recommended_existing_skills" must contain only skills that
  already exist or are clearly demonstrated in the resume.
- "missing_skill_suggestions" may contain job requirements not
  demonstrated in the resume.
- Output JSON only.
"""

        response = (
            gemini_client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
            )
        )

        if not response.text:
            raise HTTPException(
                status_code=500,
                detail="Gemini returned an empty response."
            )

        raw_text = response.text.strip()

        # Sometimes an LLM may wrap JSON in markdown fences.
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]

        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]

        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        raw_text = raw_text.strip()

        try:
            tailored_data = json.loads(
                raw_text
            )

        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Gemini response was not valid JSON."
                )
            )

        return {
            "success": True,
            "tailored_resume": tailored_data,
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "Tailor resume error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )