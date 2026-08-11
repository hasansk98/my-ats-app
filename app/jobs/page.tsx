"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type JobStatus =
  | "Saved"
  | "Applied"
  | "Interview"
  | "Offer"
  | "Rejected";

type JobApplication = {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  job_url: string | null;
  job_description: string | null;
  location: string | null;
  status: JobStatus;
  notes: string | null;
  applied_date: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS: JobStatus[] = [
  "Saved",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
];

export default function JobsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<JobStatus>("Saved");
  const [appliedDate, setAppliedDate] = useState("");
  const [notes, setNotes] = useState("");

  const [filterStatus, setFilterStatus] = useState<"All" | JobStatus>("All");

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
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
      .from("job_applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Unable to load job applications.");
      setLoading(false);
      return;
    }

    setJobs((data ?? []) as JobApplication[]);
    setLoading(false);
  }

  function resetForm() {
    setCompanyName("");
    setJobTitle("");
    setJobUrl("");
    setJobDescription("");
    setLocation("");
    setStatus("Saved");
    setAppliedDate("");
    setNotes("");
    setEditingJobId(null);
  }

  function handleEditJob(job: JobApplication) {
    setError("");
    setSuccessMessage("");

    setEditingJobId(job.id);

    setCompanyName(job.company_name);
    setJobTitle(job.job_title);
    setJobUrl(job.job_url ?? "");
    setJobDescription(job.job_description ?? "");
    setLocation(job.location ?? "");
    setStatus(job.status);
    setAppliedDate(job.applied_date ?? "");
    setNotes(job.notes ?? "");

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSaveJob(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!companyName.trim()) {
      setError("Please enter the company name.");
      return;
    }

    if (!jobTitle.trim()) {
      setError("Please enter the job title.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const payload = {
        company_name: companyName.trim(),
        job_title: jobTitle.trim(),
        job_url: jobUrl.trim() || null,
        job_description: jobDescription.trim() || null,
        location: location.trim() || null,
        status,
        applied_date: appliedDate || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingJobId) {
        const { data, error } = await supabase
          .from("job_applications")
          .update(payload)
          .eq("id", editingJobId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        setJobs((current) =>
          current.map((job) =>
            job.id === editingJobId
              ? (data as JobApplication)
              : job
          )
        );

        setSuccessMessage("Job updated successfully.");
      } else {
        const { data, error } = await supabase
          .from("job_applications")
          .insert({
            user_id: user.id,
            ...payload,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        setJobs((current) => [
          data as JobApplication,
          ...current,
        ]);

        setSuccessMessage("Job added successfully.");
      }

      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save job."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(
    jobId: string,
    newStatus: JobStatus
  ) {
    setError("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("job_applications")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      console.error(error);
      setError("Unable to update job status.");
      return;
    }

    setJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: newStatus,
              updated_at: new Date().toISOString(),
            }
          : job
      )
    );
  }

  async function handleDeleteJob(jobId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this job?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("job_applications")
      .delete()
      .eq("id", jobId);

    if (error) {
      console.error(error);
      setError("Unable to delete this job.");
      return;
    }

    setJobs((current) =>
      current.filter((job) => job.id !== jobId)
    );

    setSuccessMessage("Job deleted.");
  }

  function handleAnalyzeJob(job: JobApplication) {
    const params = new URLSearchParams();

    params.set("jobId", job.id);
    params.set("jobTitle", job.job_title);
    params.set("company", job.company_name);

    router.push(`/ats-analyzer?${params.toString()}`);
  }

  function handleTailorJob(job: JobApplication) {
    const params = new URLSearchParams();

    params.set("jobId", job.id);
    params.set("jobTitle", job.job_title);
    params.set("company", job.company_name);

    router.push(`/tailor-resume?${params.toString()}`);
  }

  const filteredJobs =
    filterStatus === "All"
      ? jobs
      : jobs.filter((job) => job.status === filterStatus);

  const statusCounts = {
    All: jobs.length,
    Saved: jobs.filter((job) => job.status === "Saved").length,
    Applied: jobs.filter((job) => job.status === "Applied").length,
    Interview: jobs.filter((job) => job.status === "Interview").length,
    Offer: jobs.filter((job) => job.status === "Offer").length,
    Rejected: jobs.filter((job) => job.status === "Rejected").length,
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading Job Tracker...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
            >
              ← Dashboard
            </button>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
              Job Tracker
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Manage your job applications
            </h1>

            <p className="mt-2 text-slate-400">
              Save jobs, analyze resume fit, tailor resumes and track progress.
            </p>
          </div>

          <button
            onClick={() => {
              if (showForm) {
                resetForm();
                setShowForm(false);
              } else {
                resetForm();
                setShowForm(true);
              }
            }}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
          >
            {showForm ? "Close Form" : "+ Add Job"}
          </button>
        </div>

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

        {showForm && (
          <form
            onSubmit={handleSaveJob}
            className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                {editingJobId ? "Edit Job" : "Add Job"}
              </h2>

              {editingJobId && (
                <span className="rounded-full border border-indigo-800 bg-indigo-950/40 px-3 py-1 text-xs font-medium text-indigo-300">
                  Editing existing job
                </span>
              )}
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Company Name
                </label>

                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="Google"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Job Title
                </label>

                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                  placeholder="Machine Learning Engineer"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Location
                </label>

                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Hyderabad, India"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as JobStatus)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                >
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Job URL
                </label>

                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Applied Date
                </label>

                <input
                  type="date"
                  value={appliedDate}
                  onChange={(e) => setAppliedDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium">
                Job Description
              </label>

              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={10}
                placeholder="Paste full job description here..."
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Recruiter details, referral, interview notes..."
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingJobId
                  ? "Update Job"
                  : "Save Job"}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {(
            [
              "All",
              "Saved",
              "Applied",
              "Interview",
              "Offer",
              "Rejected",
            ] as const
          ).map((item) => (
            <button
              key={item}
              onClick={() => setFilterStatus(item)}
              className={`rounded-2xl border p-4 text-left ${
                filterStatus === item
                  ? "border-indigo-500 bg-indigo-950/40"
                  : "border-slate-800 bg-slate-900"
              }`}
            >
              <p className="text-sm text-slate-400">{item}</p>

              <p className="mt-2 text-2xl font-bold">
                {statusCounts[item]}
              </p>
            </button>
          ))}
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">
              {filterStatus === "All"
                ? "All Jobs"
                : `${filterStatus} Jobs`}
            </h2>

            <p className="text-sm text-slate-500">
              {filteredJobs.length} job
              {filteredJobs.length === 1 ? "" : "s"}
            </p>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-700 p-12 text-center">
              <div className="text-5xl">💼</div>

              <h3 className="mt-4 text-lg font-semibold">
                No jobs found
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Add a job application to start tracking it.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {filteredJobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-indigo-400">
                        {job.company_name}
                      </p>

                      <h3 className="mt-1 text-xl font-semibold">
                        {job.job_title}
                      </h3>

                      {job.location && (
                        <p className="mt-2 text-sm text-slate-400">
                          📍 {job.location}
                        </p>
                      )}

                      {job.applied_date && (
                        <p className="mt-2 text-sm text-slate-500">
                          Applied: {job.applied_date}
                        </p>
                      )}

                      {job.job_description && (
                        <div className="mt-4 rounded-xl bg-slate-950 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Job Description
                          </p>

                          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                            {job.job_description}
                          </p>
                        </div>
                      )}

                      {job.notes && (
                        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Notes
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                            {job.notes}
                          </p>
                        </div>
                      )}

                      {job.job_url && (
                        <a
                          href={job.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-block text-sm font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          Open Job Posting ↗
                        </a>
                      )}

                      <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-800 pt-5">
                        <button
                          onClick={() => handleAnalyzeJob(job)}
                          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-500"
                        >
                          🧠 Analyze Resume
                        </button>

                        <button
                          onClick={() => handleTailorJob(job)}
                          className="rounded-xl border border-violet-700 px-4 py-2.5 text-sm font-semibold text-violet-300 hover:bg-violet-950/40"
                        >
                          ✨ Tailor Resume
                        </button>

                        <button
                          onClick={() => handleEditJob(job)}
                          className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={job.status}
                        onChange={(e) =>
                          handleStatusChange(
                            job.id,
                            e.target.value as JobStatus
                          )
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
                      >
                        {STATUS_OPTIONS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="rounded-xl border border-red-900 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}