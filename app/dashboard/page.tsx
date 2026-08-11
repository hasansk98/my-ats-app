"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  full_name: string | null;
  email: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [resumeCount, setResumeCount] = useState(0);
  const [jobCount, setJobCount] = useState(0);
  const [latestAtsScore, setLatestAtsScore] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const [
        profileResult,
        resumesResult,
        jobsResult,
        atsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single(),

        supabase
          .from("resumes")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("user_id", user.id),

        supabase
          .from("job_applications")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("user_id", user.id),

        supabase
          .from("ats_analyses")
          .select("match_score, created_at")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileResult.error) {
        console.error(
          "Profile error:",
          profileResult.error
        );

        setProfile({
          full_name:
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            null,
          email: user.email ?? null,
        });
      } else {
        setProfile(profileResult.data);
      }

      if (resumesResult.error) {
        console.error(
          "Resume count error:",
          resumesResult.error
        );
      } else {
        setResumeCount(
          resumesResult.count ?? 0
        );
      }

      if (jobsResult.error) {
        console.error(
          "Job count error:",
          jobsResult.error
        );
      } else {
        setJobCount(
          jobsResult.count ?? 0
        );
      }

      if (atsResult.error) {
        console.error(
          "ATS score error:",
          atsResult.error
        );
      } else {
        setLatestAtsScore(
          atsResult.data?.match_score ??
            null
        );
      }

      setLoading(false);
    };

    loadDashboard();
  }, [router, supabase]);

  const handleLogout = async () => {
    setLoggingOut(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      setLoggingOut(false);
      return;
    }

    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading dashboard...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
              ResumeAI Dashboard
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Welcome
              {profile?.full_name
                ? `, ${profile.full_name}`
                : ""}
            </h1>

            {profile?.email && (
              <p className="mt-2 text-slate-400">
                {profile.email}
              </p>
            )}
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:bg-slate-900 disabled:opacity-60"
          >
            {loggingOut
              ? "Signing out..."
              : "Sign out"}
          </button>
        </header>

        {error && (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300">
            {error}
          </div>
        )}

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <button
            onClick={() =>
              router.push("/resumes")
            }
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-indigo-700 hover:bg-slate-900/80"
          >
            <p className="text-sm text-slate-400">
              Resumes
            </p>

            <p className="mt-3 text-4xl font-bold">
              {resumeCount}
            </p>

            <p className="mt-3 text-sm text-indigo-400">
              View My Resumes →
            </p>
          </button>

          <button
            onClick={() =>
              router.push("/jobs")
            }
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-indigo-700 hover:bg-slate-900/80"
          >
            <p className="text-sm text-slate-400">
              Job Applications
            </p>

            <p className="mt-3 text-4xl font-bold">
              {jobCount}
            </p>

            <p className="mt-3 text-sm text-indigo-400">
              Open Job Tracker →
            </p>
          </button>

          <button
            onClick={() =>
              router.push(
                "/ats-analyzer"
              )
            }
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-indigo-700 hover:bg-slate-900/80"
          >
            <p className="text-sm text-slate-400">
              Latest ATS Score
            </p>

            <p className="mt-3 text-4xl font-bold">
              {latestAtsScore !== null
                ? `${latestAtsScore}%`
                : "--"}
            </p>

            <p className="mt-3 text-sm text-indigo-400">
              Run ATS Analysis →
            </p>
          </button>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">
            Career Tools
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <button
              onClick={() =>
                router.push(
                  "/resumes/new"
                )
              }
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:-translate-y-0.5 hover:border-indigo-600"
            >
              <div className="text-3xl">
                📄
              </div>

              <h3 className="mt-4 font-semibold">
                Create Resume
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Build and save a new
                professional resume.
              </p>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/ats-analyzer"
                )
              }
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:-translate-y-0.5 hover:border-indigo-600"
            >
              <div className="text-3xl">
                🧠
              </div>

              <h3 className="mt-4 font-semibold">
                ATS Analyzer
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Compare your resume with a
                job description.
              </p>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/tailor-resume"
                )
              }
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:-translate-y-0.5 hover:border-indigo-600"
            >
              <div className="text-3xl">
                ✨
              </div>

              <h3 className="mt-4 font-semibold">
                AI Resume Tailor
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Create a job-specific
                tailored resume version.
              </p>
            </button>

            <button
              onClick={() =>
                router.push("/jobs")
              }
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:-translate-y-0.5 hover:border-indigo-600"
            >
              <div className="text-3xl">
                💼
              </div>

              <h3 className="mt-4 font-semibold">
                Job Tracker
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Track saved jobs,
                applications and interviews.
              </p>
            </button>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-indigo-900/60 bg-indigo-950/20 p-6">
          <p className="text-sm font-medium text-indigo-300">
            ResumeAI Workflow
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="rounded-lg bg-slate-900 px-3 py-2">
              Create Resume
            </span>

            <span className="text-slate-600">
              →
            </span>

            <span className="rounded-lg bg-slate-900 px-3 py-2">
              Find Job
            </span>

            <span className="text-slate-600">
              →
            </span>

            <span className="rounded-lg bg-slate-900 px-3 py-2">
              ATS Analysis
            </span>

            <span className="text-slate-600">
              →
            </span>

            <span className="rounded-lg bg-slate-900 px-3 py-2">
              AI Tailor
            </span>

            <span className="text-slate-600">
              →
            </span>

            <span className="rounded-lg bg-slate-900 px-3 py-2">
              Apply & Track
            </span>
          </div>
        </section>
      </div>
    </main>
  );
} 