"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Resume = {
  id: string;
  title: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  summary: string | null;
  skills: string[] | null;
  education: unknown;
  projects: unknown;
  experience: unknown;
  certifications: unknown;
};

type SemanticResponse = {
  semantic_score: number;
  similarity: number;
  level: string;
};

type ScoreBreakdown = {
  skills: number;
  keywords: number;
  semantic: number;
  experience: number;
  education: number;
  completeness: number;
};

type AnalysisResult = {
  overallScore: number;
  breakdown: ScoreBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  detectedJobSkills: string[];
  semanticLevel: string;
  recommendations: string[];
};

const SKILL_GROUPS: Record<string, string[]> = {
  python: ["python"],
  java: ["java"],

  javascript: [
    "javascript",
    "java script",
    "js",
  ],

  typescript: [
    "typescript",
    "type script",
    "ts",
  ],

  react: [
    "react",
    "react.js",
    "reactjs",
  ],

  nextjs: [
    "next.js",
    "nextjs",
    "next js",
  ],

  nodejs: [
    "node.js",
    "nodejs",
    "node js",
  ],

  sql: ["sql"],
  mysql: ["mysql"],

  postgresql: [
    "postgresql",
    "postgres",
  ],

  mongodb: [
    "mongodb",
    "mongo db",
  ],

  "machine learning": [
    "machine learning",
    "ml",
  ],

  "deep learning": [
    "deep learning",
    "dl",
  ],

  "artificial intelligence": [
    "artificial intelligence",
    "ai",
  ],

  nlp: [
    "nlp",
    "natural language processing",
  ],

  "computer vision": [
    "computer vision",
    "cv",
  ],

  "generative ai": [
    "generative ai",
    "genai",
    "gen ai",
  ],

  llm: [
    "llm",
    "large language model",
    "large language models",
  ],

  rag: [
    "rag",
    "retrieval augmented generation",
    "retrieval-augmented generation",
  ],

  tensorflow: ["tensorflow"],

  pytorch: [
    "pytorch",
    "torch",
  ],

  "scikit-learn": [
    "scikit-learn",
    "scikit learn",
    "sklearn",
  ],

  keras: ["keras"],
  pandas: ["pandas"],
  numpy: ["numpy"],

  opencv: [
    "opencv",
    "open cv",
  ],

  langchain: ["langchain"],

  huggingface: [
    "huggingface",
    "hugging face",
  ],

  aws: [
    "aws",
    "amazon web services",
  ],

  azure: [
    "azure",
    "microsoft azure",
  ],

  gcp: [
    "gcp",
    "google cloud",
    "google cloud platform",
  ],

  docker: ["docker"],

  kubernetes: [
    "kubernetes",
    "k8s",
  ],

  git: ["git"],
  github: ["github"],
  linux: ["linux"],

  fastapi: [
    "fastapi",
    "fast api",
  ],

  flask: ["flask"],
  django: ["django"],

  "rest api": [
    "rest api",
    "restful api",
  ],

  "data science": [
    "data science",
  ],

  "data analysis": [
    "data analysis",
    "data analytics",
  ],

  "data visualization": [
    "data visualization",
    "data visualisation",
  ],

  statistics: [
    "statistics",
    "statistical analysis",
  ],

  "power bi": [
    "power bi",
    "powerbi",
  ],

  tableau: ["tableau"],

  excel: [
    "excel",
    "microsoft excel",
  ],

  communication: [
    "communication",
    "communication skills",
  ],

  leadership: ["leadership"],

  "problem solving": [
    "problem solving",
    "problem-solving",
  ],

  teamwork: [
    "teamwork",
    "team player",
    "collaboration",
  ],

  agile: ["agile"],
  scrum: ["scrum"],
};

export default function ATSAnalyzerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");

  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [result, setResult] =
    useState<AnalysisResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingJob, setLoadingJob] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // LOAD SAVED RESUMES
  // --------------------------------------------------

  useEffect(() => {
    const loadResumes = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("resumes")
        .select(`
          id,
          title,
          full_name,
          email,
          phone,
          location,
          linkedin,
          github,
          summary,
          skills,
          education,
          projects,
          experience,
          certifications
        `)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        setError("Unable to load resumes.");
        setLoading(false);
        return;
      }

      setResumes(data ?? []);

      if (data && data.length > 0) {
        setSelectedResumeId(data[0].id);
      }

      setLoading(false);
    };

    loadResumes();
  }, [router, supabase]);

  // --------------------------------------------------
  // LOAD JOB FROM JOB TRACKER
  // --------------------------------------------------

  useEffect(() => {
    const loadSavedJob = async () => {
      const jobId = searchParams.get("jobId");

      // If ATS Analyzer was opened directly,
      // do nothing.
      if (!jobId) {
        return;
      }

      setLoadingJob(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoadingJob(false);
        return;
      }

      const { data, error } = await supabase
        .from("job_applications")
        .select(
          "job_title, company_name, job_description"
        )
        .eq("id", jobId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(
          "Unable to load saved job:",
          error
        );

        setError(
          "The saved job could not be loaded."
        );

        setLoadingJob(false);
        return;
      }

      setJobTitle(data.job_title ?? "");
      setCompanyName(data.company_name ?? "");
      setJobDescription(
        data.job_description ?? ""
      );

      setLoadingJob(false);
    };

    loadSavedJob();
  }, [searchParams, supabase]);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  function normalize(text: string) {
    return text
      .toLowerCase()
      .replace(/[^\w+#.\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasPhrase(
    text: string,
    variants: string[]
  ) {
    const normalizedText = normalize(text);

    return variants.some((variant) => {
      const normalizedVariant =
        normalize(variant);

      if (normalizedVariant.length <= 2) {
        const escaped =
          normalizedVariant.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        const regex = new RegExp(
          `(^|\\s)${escaped}($|\\s)`,
          "i"
        );

        return regex.test(normalizedText);
      }

      return normalizedText.includes(
        normalizedVariant
      );
    });
  }

  function extractSkills(text: string) {
    const detected: string[] = [];

    Object.entries(SKILL_GROUPS).forEach(
      ([canonical, variants]) => {
        if (hasPhrase(text, variants)) {
          detected.push(canonical);
        }
      }
    );

    return Array.from(
      new Set(detected)
    );
  }

  function buildResumeText(
    resume: Resume
  ) {
    return [
      resume.full_name ?? "",
      resume.summary ?? "",
      resume.skills?.join(" ") ?? "",
      JSON.stringify(
        resume.education ?? ""
      ),
      JSON.stringify(
        resume.projects ?? ""
      ),
      JSON.stringify(
        resume.experience ?? ""
      ),
      JSON.stringify(
        resume.certifications ?? ""
      ),
    ].join(" ");
  }

  function hasUsefulArrayData(
    value: unknown
  ) {
    if (!Array.isArray(value)) {
      return false;
    }

    return value.some((item) => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return false;
      }

      return Object.values(
        item as Record<string, unknown>
      ).some(
        (value) =>
          typeof value === "string" &&
          value.trim().length > 0
      );
    });
  }

  function calculateCompleteness(
    resume: Resume
  ) {
    const checks = [
      Boolean(resume.full_name),
      Boolean(resume.email),
      Boolean(resume.phone),
      Boolean(resume.location),
      Boolean(resume.summary),

      Boolean(
        resume.skills &&
          resume.skills.length > 0
      ),

      hasUsefulArrayData(
        resume.education
      ),

      hasUsefulArrayData(
        resume.projects
      ),

      hasUsefulArrayData(
        resume.experience
      ),

      Boolean(
        resume.linkedin ||
          resume.github
      ),
    ];

    const complete =
      checks.filter(Boolean).length;

    return Math.round(
      (complete / checks.length) * 100
    );
  }

  function calculateExperienceMatch(
    resume: Resume,
    jd: string
  ) {
    const hasExperience =
      hasUsefulArrayData(
        resume.experience
      );

    const hasProjects =
      hasUsefulArrayData(
        resume.projects
      );

    const normalizedJD =
      normalize(jd);

    const asksExperience =
      normalizedJD.includes("experience") ||
      normalizedJD.includes("years") ||
      normalizedJD.includes("year");

    if (!asksExperience) {
      if (
        hasExperience ||
        hasProjects
      ) {
        return 100;
      }

      return 75;
    }

    if (hasExperience) {
      return 100;
    }

    if (hasProjects) {
      return 70;
    }

    return 30;
  }

  function calculateEducationMatch(
    resume: Resume,
    jd: string
  ) {
    const hasEducation =
      hasUsefulArrayData(
        resume.education
      );

    const normalizedJD =
      normalize(jd);

    const requiresEducation =
      normalizedJD.includes("bachelor") ||
      normalizedJD.includes("master") ||
      normalizedJD.includes("degree") ||
      normalizedJD.includes("b.tech") ||
      normalizedJD.includes("btech") ||
      normalizedJD.includes(
        "computer science"
      );

    if (!requiresEducation) {
      return hasEducation ? 100 : 80;
    }

    return hasEducation ? 100 : 30;
  }

  async function getSemanticScore(
    resumeText: string,
    jd: string
  ) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/semantic-match`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jd,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Semantic backend request failed."
      );
    }

    const data =
      (await response.json()) as SemanticResponse;

    return data;
  }

  function generateRecommendations(
    data: {
      skills: number;
      semantic: number;
      experience: number;
      education: number;
      completeness: number;
      missingSkills: string[];
    }
  ) {
    const recommendations: string[] = [];

    if (data.skills < 70) {
      recommendations.push(
        "Your resume has a low direct skills match for this role."
      );
    }

    if (data.semantic < 60) {
      recommendations.push(
        "Your resume content is not strongly aligned with the overall meaning of this job description. Tailor your summary, projects and experience toward the role."
      );
    }

    if (
      data.missingSkills.length > 0
    ) {
      recommendations.push(
        `Review these missing skills: ${data.missingSkills
          .slice(0, 6)
          .join(
            ", "
          )}. Add them only if you genuinely have experience with them.`
      );
    }

    if (data.experience < 70) {
      recommendations.push(
        "Add relevant project, internship, freelance or professional experience that demonstrates the required work."
      );
    }

    if (data.education < 70) {
      recommendations.push(
        "The job appears to mention an education requirement. Ensure your education details are complete."
      );
    }

    if (data.completeness < 80) {
      recommendations.push(
        "Complete missing resume sections such as summary, skills, education, projects, experience, contact details or professional links."
      );
    }

    if (
      data.skills >= 80 &&
      data.semantic >= 70
    ) {
      recommendations.push(
        "Your resume has a strong foundation for this role. Focus on stronger achievement-based bullet points and job-specific wording."
      );
    }

    return recommendations;
  }

  // --------------------------------------------------
  // ANALYZE
  // --------------------------------------------------

  const analyzeResume = async () => {
    setError("");
    setResult(null);

    if (!selectedResumeId) {
      setError(
        "Please select a resume."
      );
      return;
    }

    if (!jobDescription.trim()) {
      setError(
        "Please paste a job description."
      );
      return;
    }

    setAnalyzing(true);

    try {
      const resume = resumes.find(
        (item) =>
          item.id === selectedResumeId
      );

      if (!resume) {
        setError(
          "Selected resume was not found."
        );
        return;
      }

      const resumeText =
        buildResumeText(resume);

      const jobSkills =
        extractSkills(jobDescription);

      const resumeSkills =
        extractSkills(resumeText);

      const matchedSkills =
        jobSkills.filter((skill) =>
          resumeSkills.includes(skill)
        );

      const missingSkills =
        jobSkills.filter(
          (skill) =>
            !resumeSkills.includes(skill)
        );

      const skillsScore =
        jobSkills.length > 0
          ? Math.round(
              (matchedSkills.length /
                jobSkills.length) *
                100
            )
          : 50;

      const keywordScore =
        skillsScore;

      const experienceScore =
        calculateExperienceMatch(
          resume,
          jobDescription
        );

      const educationScore =
        calculateEducationMatch(
          resume,
          jobDescription
        );

      const completenessScore =
        calculateCompleteness(resume);

      const semantic =
        await getSemanticScore(
          resumeText,
          jobDescription
        );

      const semanticScore =
        semantic.semantic_score;

      const overallScore =
        Math.round(
          skillsScore * 0.3 +
            keywordScore * 0.1 +
            semanticScore * 0.25 +
            experienceScore * 0.15 +
            educationScore * 0.1 +
            completenessScore * 0.1
        );

      const recommendations =
        generateRecommendations({
          skills: skillsScore,
          semantic: semanticScore,
          experience: experienceScore,
          education: educationScore,
          completeness:
            completenessScore,
          missingSkills,
        });

      const finalResult:
        AnalysisResult = {
        overallScore,

        breakdown: {
          skills: skillsScore,
          keywords: keywordScore,
          semantic: semanticScore,
          experience:
            experienceScore,
          education:
            educationScore,
          completeness:
            completenessScore,
        },

        matchedSkills,
        missingSkills,
        detectedJobSkills:
          jobSkills,

        semanticLevel:
          semantic.level,

        recommendations,
      };

      setResult(finalResult);

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (user) {
        const { error: saveError } =
          await supabase
            .from("ats_analyses")
            .insert({
              user_id: user.id,
              resume_id: resume.id,
              job_title:
                jobTitle || null,
              company_name:
                companyName || null,
              job_description:
                jobDescription,
              match_score:
                overallScore,
              matched_keywords:
                matchedSkills,
              missing_keywords:
                missingSkills,
            });

        if (saveError) {
          console.error(
            "Unable to save analysis:",
            saveError
          );
        }
      }
    } catch (err) {
      console.error(err);

      setError(
        "Semantic ATS backend is unavailable. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading ATS Analyzer...
      </main>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <button
          onClick={() =>
            router.push(
              "/dashboard"
            )
          }
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          ← Dashboard
        </button>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
            ATS Analyzer V3
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            AI Resume Job Match
          </h1>

          <p className="mt-2 max-w-3xl text-slate-400">
            Analyze your resume using direct skills,
            keywords and semantic similarity.
          </p>
        </div>

        {loadingJob && (
          <div className="mt-6 rounded-xl border border-indigo-800 bg-indigo-950/30 p-4 text-indigo-300">
            Loading saved job description...
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300">
            {error}
          </div>
        )}

        {resumes.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-700 p-10 text-center">
            <h2 className="text-xl font-semibold">
              Create a resume first
            </h2>

            <button
              onClick={() =>
                router.push(
                  "/resumes/new"
                )
              }
              className="mt-5 rounded-xl bg-indigo-600 px-6 py-3 font-semibold"
            >
              Create Resume
            </button>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
            {/* LEFT */}

            <section className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Resume
                </label>

                <select
                  value={
                    selectedResumeId
                  }
                  onChange={(e) =>
                    setSelectedResumeId(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                >
                  {resumes.map(
                    (resume) => (
                      <option
                        key={resume.id}
                        value={resume.id}
                      >
                        {resume.title}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium">
                  Job Title
                </label>

                <input
                  value={jobTitle}
                  onChange={(e) =>
                    setJobTitle(
                      e.target.value
                    )
                  }
                  placeholder="Machine Learning Engineer"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium">
                  Company
                </label>

                <input
                  value={companyName}
                  onChange={(e) =>
                    setCompanyName(
                      e.target.value
                    )
                  }
                  placeholder="Company"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium">
                  Job Description
                </label>

                <textarea
                  value={
                    jobDescription
                  }
                  onChange={(e) =>
                    setJobDescription(
                      e.target.value
                    )
                  }
                  rows={18}
                  placeholder="Paste full job description..."
                  className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={
                  analyzeResume
                }
                disabled={
                  analyzing ||
                  loadingJob
                }
                className="mt-6 w-full rounded-xl bg-indigo-600 py-4 font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analyzing
                  ? "Running AI analysis..."
                  : "Analyze Resume"}
              </button>
            </section>

            {/* RESULTS */}

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              {!result ? (
                <div className="flex min-h-[650px] items-center justify-center text-center">
                  <div>
                    <div className="text-6xl">
                      🧠
                    </div>

                    <h2 className="mt-5 text-xl font-semibold">
                      AI ATS analysis
                    </h2>

                    <p className="mt-2 max-w-md text-slate-400">
                      Select your resume,
                      load or paste a job
                      description and run
                      the analysis.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
                    <p className="text-sm text-slate-400">
                      Estimated Job Match
                    </p>

                    <div className="mt-3 flex items-end gap-2">
                      <p className="text-6xl font-bold">
                        {
                          result.overallScore
                        }
                      </p>

                      <p className="mb-2 text-2xl text-slate-500">
                        /100
                      </p>
                    </div>

                    <ScoreBar
                      score={
                        result.overallScore
                      }
                    />

                    <p className="mt-4 text-xs leading-5 text-slate-500">
                      This is our own estimated compatibility
                      score. It is not an employer ATS score.
                    </p>
                  </div>

                  <div className="mt-8">
                    <h2 className="text-xl font-semibold">
                      Score Breakdown
                    </h2>

                    <div className="mt-5 space-y-5">
                      <ScoreRow
                        name="Skills Match"
                        score={
                          result.breakdown.skills
                        }
                        weight="30%"
                      />

                      <ScoreRow
                        name="Keyword Match"
                        score={
                          result.breakdown.keywords
                        }
                        weight="10%"
                      />

                      <ScoreRow
                        name="Semantic AI Match"
                        score={
                          result.breakdown.semantic
                        }
                        weight="25%"
                      />

                      <ScoreRow
                        name="Experience Match"
                        score={
                          result.breakdown.experience
                        }
                        weight="15%"
                      />

                      <ScoreRow
                        name="Education Match"
                        score={
                          result.breakdown.education
                        }
                        weight="10%"
                      />

                      <ScoreRow
                        name="Resume Completeness"
                        score={
                          result.breakdown.completeness
                        }
                        weight="10%"
                      />
                    </div>
                  </div>

                  <div className="mt-8 rounded-xl border border-indigo-800/50 bg-indigo-950/20 p-5">
                    <p className="text-sm text-indigo-300">
                      Semantic AI Analysis
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {
                        result.breakdown.semantic
                      }
                      %
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      {
                        result.semanticLevel
                      }
                    </p>
                  </div>

                  <div className="mt-8">
                    <h2 className="text-lg font-semibold text-green-400">
                      Matched Skills (
                      {
                        result.matchedSkills.length
                      }
                      )
                    </h2>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {result.matchedSkills.length >
                      0 ? (
                        result.matchedSkills.map(
                          (skill) => (
                            <span
                              key={skill}
                              className="rounded-full border border-green-700 bg-green-950/40 px-3 py-1.5 text-sm text-green-300"
                            >
                              ✓ {skill}
                            </span>
                          )
                        )
                      ) : (
                        <p className="text-sm text-slate-500">
                          No direct skills matched.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <h2 className="text-lg font-semibold text-orange-400">
                      Missing Skills (
                      {
                        result.missingSkills.length
                      }
                      )
                    </h2>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {result.missingSkills.length >
                      0 ? (
                        result.missingSkills.map(
                          (skill) => (
                            <span
                              key={skill}
                              className="rounded-full border border-orange-800 bg-orange-950/40 px-3 py-1.5 text-sm text-orange-300"
                            >
                              ⚠ {skill}
                            </span>
                          )
                        )
                      ) : (
                        <p className="text-sm text-green-400">
                          No missing detected skills.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <h2 className="text-xl font-semibold">
                      Recommendations
                    </h2>

                    <div className="mt-4 space-y-3">
                      {result.recommendations.map(
                        (
                          recommendation,
                          index
                        ) => (
                          <div
                            key={index}
                            className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                          >
                            <p className="text-sm leading-6 text-slate-300">
                              💡{" "}
                              {
                                recommendation
                              }
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="mt-8 border-t border-slate-800 pt-6">
                    <p className="text-sm font-medium text-slate-400">
                      Detected Job Skills
                    </p>

                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {result.detectedJobSkills.length >
                      0
                        ? result.detectedJobSkills.join(
                            " • "
                          )
                        : "No predefined skills detected."}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function ScoreRow({
  name,
  score,
  weight,
}: {
  name: string;
  score: number;
  weight: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-5">
        <div>
          <p className="font-medium">
            {name}
          </p>

          <p className="text-xs text-slate-500">
            Weight {weight}
          </p>
        </div>

        <p className="font-semibold">
          {score}%
        </p>
      </div>

      <ScoreBar score={score} />
    </div>
  );
}

function ScoreBar({
  score,
}: {
  score: number;
}) {
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
        style={{
          width: `${Math.min(
            100,
            Math.max(0, score)
          )}%`,
        }}
      />
    </div>
  );
}