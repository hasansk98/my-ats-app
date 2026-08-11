"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Resume = {
  id: string;
  title: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

export default function ResumesPage() {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResumes = async () => {
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
        .select("id, title, full_name, email, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setResumes(data ?? []);
      setLoading(false);
    };

    loadResumes();
  }, [router, supabase]);

  const deleteResume = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this resume?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("resumes")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setResumes((previous) =>
      previous.filter((resume) => resume.id !== id)
    );
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading resumes...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* HEADER */}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-4 text-sm font-medium text-indigo-400 hover:text-indigo-300"
            >
              ← Back to Dashboard
            </button>

            <h1 className="text-3xl font-bold">
              My Resumes
            </h1>

            <p className="mt-2 text-slate-400">
              Create and manage your resume versions.
            </p>
          </div>

          <button
            onClick={() => router.push("/resumes/new")}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold transition hover:bg-indigo-500"
          >
            + Create Resume
          </button>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* EMPTY */}

        {resumes.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">

            <div className="text-5xl">
              📄
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              You haven't created a resume yet
            </h2>

            <p className="mt-2 text-slate-400">
              Create your first professional resume.
            </p>

            <button
              onClick={() => router.push("/resumes/new")}
              className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500"
            >
              Create Resume
            </button>

          </div>
        ) : (

          /* RESUME CARDS */

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700"
              >

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-2xl">
                  📄
                </div>

                <h2 className="mt-5 text-xl font-semibold">
                  {resume.title || "Untitled Resume"}
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  {resume.full_name || "No name"}
                </p>

                <p className="mt-1 truncate text-sm text-slate-500">
                  {resume.email}
                </p>

                <p className="mt-5 text-xs text-slate-500">
                  Created{" "}
                  {new Date(
                    resume.created_at
                  ).toLocaleDateString()}
                </p>

                <div className="mt-6 flex gap-2">

                  <button
                    onClick={() =>
                      router.push(
                        `/resumes/${resume.id}`
                      )
                    }
                    className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500"
                  >
                    View
                  </button>

                  <button
                    onClick={() =>
                      router.push(
                        `/resumes/${resume.id}/edit`
                      )
                    }
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      deleteResume(resume.id)
                    }
                    className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950/50"
                  >
                    Delete
                  </button>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>
    </main>
  );
}