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
  experience: unknown;
  projects: unknown;
  certifications: unknown;
};

type TailoredExperience = {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
};

type TailoredProject = {
  name: string;
  description: string;
  technologies: string;
};

type TailoredResume = {
  tailored_summary: string;
  tailored_experience: TailoredExperience[];
  tailored_projects: TailoredProject[];
  recommended_existing_skills: string[];
  missing_skill_suggestions: string[];
  improvement_notes: string[];
};

type TailorApiResponse = {
  success: boolean;
  tailored_resume: TailoredResume;
};

export default function TailorResumePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = useMemo(() => createClient(), []);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");

  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingJob, setLoadingJob] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [result, setResult] = useState<TailoredResume | null>(null);

  // --------------------------------------------------
  // LOAD RESUMES
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
          experience,
          projects,
          certifications
        `)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);

        setError(
          "Unable to load your resumes."
        );

        setLoading(false);
        return;
      }

      const resumeData = data ?? [];

      setResumes(resumeData);

      if (resumeData.length > 0) {
        setSelectedResumeId(
          resumeData[0].id
        );
      }

      setLoading(false);
    };

    loadResumes();
  }, [router, supabase]);

  // --------------------------------------------------
  // AUTO-LOAD SAVED JOB
  // --------------------------------------------------

  useEffect(() => {
    const loadSavedJob = async () => {
      const jobId =
        searchParams.get("jobId");

      if (!jobId) {
        return;
      }

      setLoadingJob(true);
      setError("");

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

      setJobTitle(
        data.job_title ?? ""
      );

      setCompanyName(
        data.company_name ?? ""
      );

      setJobDescription(
        data.job_description ?? ""
      );

      setLoadingJob(false);
    };

    loadSavedJob();
  }, [searchParams, supabase]);

  const selectedResume =
    resumes.find(
      (resume) =>
        resume.id === selectedResumeId
    ) ?? null;

  // --------------------------------------------------
  // TAILOR RESUME
  // --------------------------------------------------

  const handleTailor = async () => {
    setError("");
    setSuccessMessage("");
    setResult(null);

    if (!selectedResume) {
      setError(
        "Please select a resume."
      );
      return;
    }

    if (!jobDescription.trim()) {
      setError(
        "Please paste the job description."
      );
      return;
    }

    setTailoring(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/tailor-resume",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            resume: selectedResume,
            job_description:
              jobDescription,
            job_title:
              jobTitle || null,
            company_name:
              companyName || null,
          }),
        }
      );

      const data =
        (await response.json()) as
          | TailorApiResponse
          | {
              detail?: string;
            };

      if (!response.ok) {
        const message =
          "detail" in data &&
          data.detail
            ? data.detail
            : "Unable to tailor resume.";

        throw new Error(message);
      }

      if (
        !(
          "tailored_resume" in data
        )
      ) {
        throw new Error(
          "Invalid response from tailoring backend."
        );
      }

      setResult(
        data.tailored_resume
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the AI tailoring backend."
      );
    } finally {
      setTailoring(false);
    }
  };

  // --------------------------------------------------
  // SAVE AS NEW RESUME VERSION
  // --------------------------------------------------

  const handleSaveNewVersion =
    async () => {
      setError("");
      setSuccessMessage("");

      if (!selectedResume) {
        setError(
          "Original resume was not found."
        );
        return;
      }

      if (!result) {
        setError(
          "Please tailor the resume first."
        );
        return;
      }

      setSaving(true);

      try {
        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          router.push("/login");
          return;
        }

        const tailoredTitleParts = [
          selectedResume.title,
          jobTitle
            ? `for ${jobTitle}`
            : "",
          companyName
            ? `at ${companyName}`
            : "",
        ].filter(Boolean);

        const newTitle =
          `${tailoredTitleParts.join(
            " "
          )} - Tailored`;

        const finalSkills =
          result
            .recommended_existing_skills
            .length > 0
            ? Array.from(
                new Set([
                  ...(
                    selectedResume.skills ??
                    []
                  ),
                  ...result
                    .recommended_existing_skills,
                ])
              )
            : selectedResume.skills ??
              [];

        const finalExperience =
          result
            .tailored_experience
            .length > 0
            ? result
                .tailored_experience
            : selectedResume.experience;

        const finalProjects =
          result.tailored_projects
            .length > 0
            ? result.tailored_projects
            : selectedResume.projects;

        const { data, error } =
          await supabase
            .from("resumes")
            .insert({
              user_id:
                user.id,

              title:
                newTitle,

              full_name:
                selectedResume.full_name,

              email:
                selectedResume.email,

              phone:
                selectedResume.phone,

              location:
                selectedResume.location,

              linkedin:
                selectedResume.linkedin,

              github:
                selectedResume.github,

              summary:
                result
                  .tailored_summary
                  ?.trim() ||
                selectedResume.summary,

              skills:
                finalSkills,

              education:
                selectedResume.education,

              experience:
                finalExperience,

              projects:
                finalProjects,

              certifications:
                selectedResume.certifications,

              updated_at:
                new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
          console.error(
            "Save tailored resume error:",
            error
          );

          throw new Error(
            error.message
          );
        }

        setSuccessMessage(
          "Tailored resume saved successfully as a new resume version."
        );

        if (data?.id) {
          setTimeout(() => {
            router.push(
              `/resumes/${data.id}`
            );
          }, 1000);
        }
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to save tailored resume."
        );
      } finally {
        setSaving(false);
      }
    };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading Resume Tailor...
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
            AI Resume Tailoring
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Tailor your resume for a
            specific job
          </h1>

          <p className="mt-2 max-w-3xl text-slate-400">
            ResumeAI improves wording and
            relevance using only
            information already supported
            by your resume.
          </p>
        </div>

        {loadingJob && (
          <div className="mt-6 rounded-xl border border-indigo-800 bg-indigo-950/30 p-4 text-indigo-300">
            Loading saved job details...
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-xl border border-green-800 bg-green-950/40 p-4 text-green-300">
            {successMessage}
          </div>
        )}

        {resumes.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-700 p-10 text-center">
            <h2 className="text-xl font-semibold">
              No resumes found
            </h2>

            <p className="mt-2 text-slate-400">
              Create a resume before using
              AI tailoring.
            </p>

            <button
              onClick={() =>
                router.push(
                  "/resumes/new"
                )
              }
              className="mt-5 rounded-xl bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500"
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
                  Select Resume
                </label>

                <select
                  value={
                    selectedResumeId
                  }
                  onChange={(e) => {
                    setSelectedResumeId(
                      e.target.value
                    );
                    setResult(null);
                    setSuccessMessage("");
                  }}
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
                  placeholder="Example Company"
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
                  placeholder="Paste the full job description here..."
                  className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={
                  handleTailor
                }
                disabled={
                  tailoring ||
                  saving ||
                  loadingJob
                }
                className="mt-6 w-full rounded-xl bg-indigo-600 py-4 font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {tailoring
                  ? "AI is tailoring your resume..."
                  : "Tailor Resume"}
              </button>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs leading-5 text-slate-500">
                  ResumeAI will not
                  intentionally invent
                  employers, education,
                  projects, skills,
                  certifications or
                  unsupported achievements.
                  Always review AI-generated
                  wording before using it.
                </p>
              </div>
            </section>

            {/* RIGHT */}

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              {!result ? (
                <div className="flex min-h-[650px] items-center justify-center text-center">
                  <div>
                    <div className="text-6xl">
                      ✨
                    </div>

                    <h2 className="mt-5 text-xl font-semibold">
                      AI-tailored resume
                    </h2>

                    <p className="mt-2 max-w-md text-slate-400">
                      Select a saved resume,
                      load or paste a job
                      description and click
                      Tailor Resume.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-indigo-400">
                        Tailoring complete
                      </p>

                      <h2 className="mt-1 text-2xl font-bold">
                        Suggested Improvements
                      </h2>
                    </div>

                    <button
                      onClick={
                        handleTailor
                      }
                      disabled={
                        tailoring ||
                        saving
                      }
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
                    >
                      Regenerate
                    </button>
                  </div>

                  {/* SUMMARY */}

                  <section className="mt-8">
                    <h3 className="text-lg font-semibold">
                      Summary
                    </h3>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Original
                        </p>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                          {selectedResume?.summary?.trim() ||
                            "No summary in the original resume."}
                        </p>
                      </div>

                      <div className="rounded-xl border border-indigo-800/50 bg-indigo-950/20 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                          AI Tailored
                        </p>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                          {result.tailored_summary ||
                            "No tailored summary generated."}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* EXPERIENCE */}

                  <section className="mt-8">
                    <h3 className="text-lg font-semibold">
                      Tailored Experience
                    </h3>

                    {result
                      .tailored_experience
                      .length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        No experience entries
                        were available to
                        rewrite.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {result.tailored_experience.map(
                          (
                            experience,
                            index
                          ) => (
                            <div
                              key={`${experience.company}-${index}`}
                              className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                            >
                              <div className="flex flex-wrap justify-between gap-3">
                                <div>
                                  <p className="font-semibold">
                                    {experience.role ||
                                      "Role"}
                                  </p>

                                  <p className="mt-1 text-sm text-slate-400">
                                    {
                                      experience.company
                                    }
                                  </p>
                                </div>

                                <p className="text-sm text-slate-500">
                                  {
                                    experience.startDate
                                  }

                                  {experience.startDate ||
                                  experience.endDate
                                    ? " - "
                                    : ""}

                                  {
                                    experience.endDate
                                  }
                                </p>
                              </div>

                              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                                {
                                  experience.description
                                }
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </section>

                  {/* PROJECTS */}

                  <section className="mt-8">
                    <h3 className="text-lg font-semibold">
                      Tailored Projects
                    </h3>

                    {result
                      .tailored_projects
                      .length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        No project entries were
                        available to rewrite.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {result.tailored_projects.map(
                          (
                            project,
                            index
                          ) => (
                            <div
                              key={`${project.name}-${index}`}
                              className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                            >
                              <p className="font-semibold">
                                {
                                  project.name
                                }
                              </p>

                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                                {
                                  project.description
                                }
                              </p>

                              {project.technologies && (
                                <p className="mt-4 text-sm text-indigo-300">
                                  {
                                    project.technologies
                                  }
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </section>

                  {/* EXISTING SKILLS */}

                  <section className="mt-8">
                    <h3 className="text-lg font-semibold text-green-400">
                      Relevant Existing Skills
                    </h3>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {result
                        .recommended_existing_skills
                        .length > 0 ? (
                        result.recommended_existing_skills.map(
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
                          No matching existing
                          skills were
                          identified.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* MISSING SKILLS */}

                  <section className="mt-8">
                    <h3 className="text-lg font-semibold text-orange-400">
                      Missing Job Skills
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      These were requested by
                      the job description but
                      were not supported by the
                      original resume.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {result
                        .missing_skill_suggestions
                        .length > 0 ? (
                        result.missing_skill_suggestions.map(
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
                          No unsupported
                          missing skills were
                          identified.
                        </p>
                      )}
                    </div>

                    {result
                      .missing_skill_suggestions
                      .length > 0 && (
                      <div className="mt-4 rounded-xl border border-orange-900/50 bg-orange-950/20 p-4">
                        <p className="text-sm leading-6 text-orange-200">
                          Do not add these
                          skills unless you
                          genuinely have
                          experience or
                          knowledge in them.
                        </p>
                      </div>
                    )}
                  </section>

                  {/* NOTES */}

                  <section className="mt-8">
                    <h3 className="text-lg font-semibold">
                      Improvement Notes
                    </h3>

                    <div className="mt-4 space-y-3">
                      {result
                        .improvement_notes
                        .length > 0 ? (
                        result.improvement_notes.map(
                          (
                            note,
                            index
                          ) => (
                            <div
                              key={index}
                              className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                            >
                              <p className="text-sm leading-6 text-slate-300">
                                💡 {note}
                              </p>
                            </div>
                          )
                        )
                      ) : (
                        <p className="text-sm text-slate-500">
                          No additional
                          improvement notes.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* SAVE */}

                  <div className="mt-10 border-t border-slate-800 pt-6">
                    <button
                      type="button"
                      onClick={
                        handleSaveNewVersion
                      }
                      disabled={
                        saving ||
                        tailoring
                      }
                      className="w-full rounded-xl bg-green-600 py-4 font-semibold transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving
                        ? "Saving New Resume Version..."
                        : "Save as New Resume Version"}
                    </button>

                    <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                      Your original resume
                      remains unchanged. A
                      separate tailored
                      version will be saved.
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