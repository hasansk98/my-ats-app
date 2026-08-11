"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Education = {
  degree?: string;
  college?: string;
  startYear?: string;
  endYear?: string;
  cgpa?: string;
};

type Project = {
  name?: string;
  description?: string;
  technologies?: string;
};

type Experience = {
  company?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
};

type Certification = {
  name?: string;
  issuer?: string;
  year?: string;
};

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
  education: Education[] | null;
  projects: Project[] | null;
  experience: Experience[] | null;
  certifications: Certification[] | null;
};

export default function ResumePreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResume = async () => {
      setLoading(true);
      setError("");

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
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        console.error(error);
        setError("Resume not found.");
        setLoading(false);
        return;
      }

      setResume(data);
      setLoading(false);
    };

    loadResume();
  }, [params.id, router, supabase]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading resume...</p>
      </main>
    );
  }

  if (error || !resume) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <p className="text-red-300">{error}</p>

          <button
            onClick={() => router.push("/resumes")}
            className="mt-5 text-indigo-400 hover:text-indigo-300"
          >
            ← Back to My Resumes
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-5xl">

        {/* TOP ACTIONS */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-white">
          <button
            onClick={() => router.push("/resumes")}
            className="text-indigo-400 hover:text-indigo-300"
          >
            ← My Resumes
          </button>

          <div className="flex gap-3">
            <button
              onClick={() =>
                router.push(`/resumes/${resume.id}/edit`)
              }
              className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800"
            >
              Edit
            </button>

            <button
              onClick={() => window.print()}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500"
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* RESUME */}

        <div className="mx-auto min-h-[1120px] max-w-[850px] bg-white px-12 py-12 text-slate-900 shadow-2xl">

          {/* HEADER */}

          <header className="border-b border-slate-300 pb-6 text-center">
            <h1 className="text-4xl font-bold">
              {resume.full_name || "Your Name"}
            </h1>

            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-600">
              {resume.email && <span>{resume.email}</span>}
              {resume.phone && <span>{resume.phone}</span>}
              {resume.location && <span>{resume.location}</span>}
            </div>

            <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm text-slate-700">
              {resume.linkedin && (
                <span>{resume.linkedin}</span>
              )}

              {resume.github && (
                <span>{resume.github}</span>
              )}
            </div>
          </header>

          {/* SUMMARY */}

          {resume.summary && (
            <ResumeSection title="Professional Summary">
              <p className="leading-7">
                {resume.summary}
              </p>
            </ResumeSection>
          )}

          {/* SKILLS */}

          {resume.skills && resume.skills.length > 0 && (
            <ResumeSection title="Skills">
              <p className="leading-7">
                {resume.skills.join(" • ")}
              </p>
            </ResumeSection>
          )}

          {/* EDUCATION */}

          {resume.education &&
            resume.education.some(
              (item) => item.degree || item.college
            ) && (
              <ResumeSection title="Education">
                <div className="space-y-4">
                  {resume.education
                    .filter(
                      (item) =>
                        item.degree || item.college
                    )
                    .map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between gap-4">

                          <div>
                            <p className="font-semibold">
                              {item.degree}
                            </p>

                            <p>
                              {item.college}
                            </p>
                          </div>

                          <p className="text-sm text-slate-600">
                            {item.startYear}
                            {item.startYear || item.endYear
                              ? " - "
                              : ""}
                            {item.endYear}
                          </p>

                        </div>

                        {item.cgpa && (
                          <p className="mt-1 text-sm">
                            CGPA: {item.cgpa}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </ResumeSection>
            )}

          {/* EXPERIENCE */}

          {resume.experience &&
            resume.experience.some(
              (item) =>
                item.company ||
                item.role ||
                item.description
            ) && (
              <ResumeSection title="Experience">
                <div className="space-y-5">

                  {resume.experience
                    .filter(
                      (item) =>
                        item.company ||
                        item.role ||
                        item.description
                    )
                    .map((item, index) => (
                      <div key={index}>

                        <div className="flex justify-between gap-4">
                          <div>
                            <p className="font-semibold">
                              {item.role}
                            </p>

                            <p>
                              {item.company}
                            </p>
                          </div>

                          <p className="text-sm text-slate-600">
                            {item.startDate}
                            {item.startDate || item.endDate
                              ? " - "
                              : ""}
                            {item.endDate}
                          </p>
                        </div>

                        {item.description && (
                          <p className="mt-2 whitespace-pre-line leading-6">
                            {item.description}
                          </p>
                        )}

                      </div>
                    ))}

                </div>
              </ResumeSection>
            )}

          {/* PROJECTS */}

          {resume.projects &&
            resume.projects.some(
              (item) =>
                item.name || item.description
            ) && (
              <ResumeSection title="Projects">

                <div className="space-y-5">

                  {resume.projects
                    .filter(
                      (item) =>
                        item.name || item.description
                    )
                    .map((item, index) => (
                      <div key={index}>

                        <p className="font-semibold">
                          {item.name}
                        </p>

                        {item.technologies && (
                          <p className="text-sm font-medium text-slate-600">
                            {item.technologies}
                          </p>
                        )}

                        {item.description && (
                          <p className="mt-1 whitespace-pre-line leading-6">
                            {item.description}
                          </p>
                        )}

                      </div>
                    ))}

                </div>
              </ResumeSection>
            )}

          {/* CERTIFICATIONS */}

          {resume.certifications &&
            resume.certifications.some(
              (item) => item.name
            ) && (
              <ResumeSection title="Certifications">

                <div className="space-y-2">

                  {resume.certifications
                    .filter(
                      (item) => item.name
                    )
                    .map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between gap-4"
                      >
                        <p>
                          <span className="font-semibold">
                            {item.name}
                          </span>

                          {item.issuer
                            ? ` — ${item.issuer}`
                            : ""}
                        </p>

                        {item.year && (
                          <p className="text-sm text-slate-600">
                            {item.year}
                          </p>
                        )}

                      </div>
                    ))}

                </div>
              </ResumeSection>
            )}

        </div>
      </div>
    </main>
  );
}

function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">

      <h2 className="mb-3 border-b border-slate-300 pb-1 text-lg font-bold uppercase tracking-wide">
        {title}
      </h2>

      {children}

    </section>
  );
}