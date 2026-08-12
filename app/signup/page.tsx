"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = useMemo(() => createClient(), []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        window.location.origin;

      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
            emailRedirectTo: `${siteUrl}/login`,
          },
        });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (data.session) {
        setMessage(
          "Account created successfully. You can continue to your account."
        );
      } else {
        setMessage(
          "Account created. Please check your email and verify your account before signing in."
        );
      }

      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Signup error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError("");
    setMessage("");
    setGoogleLoading(true);

    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        window.location.origin;

      const { error: googleError } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
          },
        });

      if (googleError) {
        setError(googleError.message);
        setGoogleLoading(false);
      }
    } catch (err) {
      console.error("Google signup error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to continue with Google."
      );

      setGoogleLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        {/* LEFT SIDE */}

        <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-700 to-slate-950 p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-400/30 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />

          <div className="relative z-10">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight"
            >
              ResumeAI
            </Link>
          </div>

          <div className="relative z-10 max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-200">
              Build smarter
            </p>

            <h1 className="mt-5 text-5xl font-bold leading-tight">
              Turn your resume into a stronger application.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-indigo-100/80">
              Create resumes, compare them with job
              descriptions, tailor content using AI and track
              your job applications.
            </p>

            <div className="mt-10 space-y-4 text-sm text-indigo-100">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  ✓
                </span>
                Resume Builder
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  ✓
                </span>
                ATS Compatibility Analysis
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  ✓
                </span>
                AI Resume Tailoring
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  ✓
                </span>
                Job Application Tracking
              </div>
            </div>
          </div>

          <p className="relative z-10 text-xs text-indigo-200/70">
            ResumeAI
          </p>
        </section>

        {/* RIGHT SIDE */}

        <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <Link
                href="/"
                className="text-xl font-bold text-indigo-400"
              >
                ResumeAI
              </Link>
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
              Get started
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Create your account
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Start building and tailoring your resumes.
            </p>

            {error && (
              <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-6 rounded-xl border border-green-800 bg-green-950/40 p-4 text-sm leading-6 text-green-300">
                {message}
              </div>
            )}

            <form
              onSubmit={handleSignup}
              className="mt-8 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Full name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  autoComplete="name"
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Email address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Confirm password
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  placeholder="Enter password again"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Creating account..."
                  : "Create account"}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-800" />

              <span className="text-xs uppercase tracking-wider text-slate-500">
                or
              </span>

              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading || googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3.5 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.805 10.023h-9.18v3.955h5.285c-.228 1.272-.922 2.35-1.97 3.071v2.55h3.19c1.867-1.72 2.945-4.255 2.945-7.263 0-.78-.07-1.53-.2-2.313z"
                />
                <path
                  fill="#34A853"
                  d="M12.625 21.5c2.67 0 4.91-.885 6.545-2.4l-3.19-2.55c-.885.595-2.015.95-3.355.95-2.575 0-4.755-1.74-5.535-4.08H3.8v2.63A9.875 9.875 0 0 0 12.625 21.5z"
                />
                <path
                  fill="#FBBC05"
                  d="M7.09 13.42a5.94 5.94 0 0 1 0-3.84V6.95H3.8a9.875 9.875 0 0 0 0 9.1l3.29-2.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12.625 5.5c1.45 0 2.75.5 3.775 1.48l2.83-2.83C17.53 2.565 15.29 1.5 12.625 1.5A9.875 9.875 0 0 0 3.8 6.95l3.29 2.63c.78-2.34 2.96-4.08 5.535-4.08z"
                />
              </svg>

              {googleLoading
                ? "Connecting to Google..."
                : "Continue with Google"}
            </button>

            <p className="mt-8 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}