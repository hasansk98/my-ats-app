import os
import re
import time

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from google import genai
from google.genai import types


# --------------------------------------------------
# ENV
# --------------------------------------------------

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing.")

gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)


# --------------------------------------------------
# FASTAPI
# --------------------------------------------------

app = FastAPI(
    title="ResumeAI Backend",
    version="1.1.0",
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


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class SemanticMatchRequest(BaseModel):
    resume_text: str
    job_description: str


class TailorResumeRequest(BaseModel):
    resume: dict
    job_description: str
    job_title: str | None = None
    company_name: str | None = None


# --------------------------------------------------
# GEMINI RESPONSE MODELS
# --------------------------------------------------

class TailoredExperience(BaseModel):
    company: str
    role: str
    startDate: str
    endDate: str
    description: str


class TailoredProject(BaseModel):
    name: str
    description: str
    technologies: str


class TailoredResumeResponse(BaseModel):
    tailored_summary: str

    tailored_experience: list[TailoredExperience] = Field(
        default_factory=list
    )

    tailored_projects: list[TailoredProject] = Field(
        default_factory=list
    )

    recommended_existing_skills: list[str] = Field(
        default_factory=list
    )

    missing_skill_suggestions: list[str] = Field(
        default_factory=list
    )

    improvement_notes: list[str] = Field(
        default_factory=list
    )


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def clean_text(text: str) -> str:
    text = text.lower()

    text = re.sub(
        r"[^\w\s+#.-]",
        " ",
        text,
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


def clean_resume_for_ai(
    resume: dict
) -> dict:
    """
    Send only resume fields that are useful for tailoring.

    This reduces prompt size and avoids sending unnecessary
    database/internal fields to Gemini.
    """

    allowed_fields = [
        "full_name",
        "summary",
        "skills",
        "education",
        "experience",
        "projects",
        "certifications",
    ]

    cleaned_resume = {}

    for field in allowed_fields:
        value = resume.get(field)

        if value not in [
            None,
            "",
            [],
            {},
        ]:
            cleaned_resume[field] = value

    return cleaned_resume


# --------------------------------------------------
# BASIC ROUTES
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "ResumeAI backend is running",
        "version": "1.1.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


# --------------------------------------------------
# SEMANTIC MATCH
# --------------------------------------------------

@app.post("/semantic-match")
def semantic_match(
    request: SemanticMatchRequest
):
    started_at = time.perf_counter()

    try:
        resume_text = clean_text(
            request.resume_text
        )

        job_description = clean_text(
            request.job_description
        )

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

        score = round(
            float(similarity) * 100
        )

        score = max(
            0,
            min(score, 100),
        )

        if score >= 75:
            level = "Strong Match"

        elif score >= 50:
            level = "Good Match"

        elif score >= 30:
            level = "Moderate Match"

        else:
            level = "Low Match"

        elapsed = round(
            time.perf_counter()
            - started_at,
            3,
        )

        print(
            f"Semantic match completed in "
            f"{elapsed}s"
        )

        return {
            "similarity": round(
                float(similarity),
                4,
            ),
            "semantic_score": score,
            "level": level,
            "method":
                "TF-IDF cosine similarity",
        }

    except HTTPException:
        raise

    except ValueError:
        return {
            "similarity": 0,
            "semantic_score": 0,
            "level": "Low Match",
            "method":
                "TF-IDF cosine similarity",
        }

    except Exception as exc:
        print(
            "Semantic match error:",
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail=
                "Unable to calculate semantic match.",
        )


# --------------------------------------------------
# TAILOR RESUME
# --------------------------------------------------

@app.post("/tailor-resume")
def tailor_resume(
    request: TailorResumeRequest
):
    request_started = time.perf_counter()

    try:
        job_description = (
            request.job_description
            .strip()
        )

        if not job_description:
            raise HTTPException(
                status_code=400,
                detail=
                    "Job description is required.",
            )

        cleaned_resume = (
            clean_resume_for_ai(
                request.resume
            )
        )

        if not cleaned_resume:
            raise HTTPException(
                status_code=400,
                detail=
                    "Resume content is required.",
            )

        # Prevent extremely large job descriptions
        # from unnecessarily increasing model latency.
        job_description = (
            job_description[:12000]
        )

        prompt = f"""
Tailor the resume below for the target job.

TRUTHFULNESS RULES:
- Use only facts already present in the resume.
- Never invent employers, roles, dates, education,
  certifications, projects, skills, technologies,
  metrics, numbers or achievements.
- Preserve factual company names, roles, dates,
  project names and technologies.
- Missing requirements belong only in
  missing_skill_suggestions.
- Rewrite only for clarity, relevance, ATS wording
  and stronger professional language.
- Keep all output concise.
- Summary: maximum 90 words.
- Each experience description: maximum 90 words.
- Each project description: maximum 80 words.
- improvement_notes: maximum 5 short items.
- recommended_existing_skills: maximum 12 items.
- missing_skill_suggestions: maximum 12 items.

TARGET JOB TITLE:
{request.job_title or "Not provided"}

TARGET COMPANY:
{request.company_name or "Not provided"}

JOB DESCRIPTION:
{job_description}

RESUME:
{cleaned_resume}
"""

        gemini_started = (
            time.perf_counter()
        )

        response = (
            gemini_client
            .models
            .generate_content(
                model="gemini-3.6-flash",
                contents=prompt,

                config=
                    types.GenerateContentConfig(
                        response_mime_type=
                            "application/json",

                        response_schema=
                            TailoredResumeResponse,

                        max_output_tokens=1800,
                    ),
            )
        )

        gemini_elapsed = round(
            time.perf_counter()
            - gemini_started,
            3,
        )

        print(
            f"Gemini generation completed "
            f"in {gemini_elapsed}s"
        )

        raw_text = response.text

        if not raw_text:
            raise HTTPException(
                status_code=500,
                detail=
                    "Gemini returned an empty response.",
            )

        try:
            result = (
                TailoredResumeResponse
                .model_validate_json(
                    raw_text
                )
            )

        except Exception as exc:
            print(
                "Gemini validation error:",
                exc,
            )

            print(
                "Gemini raw response:",
                raw_text,
            )

            raise HTTPException(
                status_code=500,
                detail=
                    "Gemini returned an invalid structured response.",
            )

        total_elapsed = round(
            time.perf_counter()
            - request_started,
            3,
        )

        print(
            f"Tailor request completed "
            f"in {total_elapsed}s"
        )

        return result.model_dump()

    except HTTPException:
        raise

    except Exception as exc:
        print(
            "Tailor resume error:",
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail=
                "Unable to tailor resume.",
        )