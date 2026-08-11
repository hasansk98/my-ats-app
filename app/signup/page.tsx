"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
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
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user && data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setMessage(
      "Account created successfully. Please check your email and verify your account before signing in."
    );

    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    setError("");
    setMessage("");
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT SIDE */}

        <section className="hidden flex-col justify-between bg-gradient-to-br from-indigo-700 via-violet-700 to-slate-950 p-14 lg:flex">
          <div className="text-2xl font-bold">ResumeAI</div>

          <div className="max-w-xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-indigo-200">
              Build your career
            </p>

            <h1 className="text-5xl font-bold leading-tight">
              Create a resume that matches the job.
            </h1>

            <p className="mt-6 text-lg leading-8 text-indigo-100">
              Build professional resumes, analyze job descriptions and improve
              your chances with an AI-powered career workspace.
            </p>

            <div className="mt-10 space-y-4 text-indigo-100">
              <div>✓ ATS Resume Analysis</div>
              <div>✓ Semantic Job Matching</div>
              <div>✓ Resume Tailoring</div>
              <div>✓ Job Tracking</div>
            </div>
          </div>

          <p className="text-sm text-indigo-200">ResumeAI</p>
        </section>

        {/* RIGHT SIDE */}

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold">Create account</h2>

            <p className="mt-2 text-slate-400">
              Start building your AI-powered career workspace.
            </p>

            <form onSubmit={handleSignup} className="mt-8 space-y-5">
              {/* FULL NAME */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Full name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-indigo-500"
                />
              </div>

              {/* EMAIL */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Email address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-indigo-500"
                />
              </div>

              {/* PASSWORD */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Create a password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-indigo-500"
                />
              </div>

              {/* CONFIRM PASSWORD */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Confirm password
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Confirm your password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-indigo-500"
                />
              </div>

              {/* ERROR */}

              {error && (
                <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* SUCCESS MESSAGE */}

              {message && (
                <div className="rounded-lg border border-green-800 bg-green-950/40 px-4 py-3 text-sm leading-6 text-green-300">
                  {message}
                </div>
              )}

              {/* EMAIL SIGNUP BUTTON */}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full rounded-xl bg-indigo-600 py-3 font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            {/* OR DIVIDER */}

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />

              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                or
              </span>

              <div className="h-px flex-1 bg-slate-800" />
            </div>

            {/* GOOGLE SIGNUP */}

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading || googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-white py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.35 12.27c0-.74-.07-1.45-.19-2.14H12v4.05h5.24a4.48 4.48 0 0 1-1.94 2.94v2.63h3.14c1.84-1.69 2.91-4.18 2.91-7.48Z"
                />

                <path
                  fill="#34A853"
                  d="M12 21.78c2.62 0 4.82-.87 6.43-2.36l-3.14-2.63c-.87.58-1.98.93-3.29.93-2.53 0-4.67-1.71-5.44-4.01H3.32v2.71A9.72 9.72 0 0 0 12 21.78Z"
                />

                <path
                  fill="#FBBC05"
                  d="M6.56 13.71A5.84 5.84 0 0 1 6.25 12c0-.59.1-1.16.31-1.71V7.58H3.32A9.74 9.74 0 0 0 2.28 12c0 1.57.38 3.05 1.04 4.42l3.24-2.71Z"
                />

                <path
                  fill="#EA4335"
                  d="M12 6.28c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.82 3.37 14.62 2.22 12 2.22a9.72 9.72 0 0 0-8.68 5.36l3.24 2.71C7.33 7.99 9.47 6.28 12 6.28Z"
                />
              </svg>

              {googleLoading
                ? "Connecting to Google..."
                : "Continue with Google"}
            </button>

            {/* LOGIN LINK */}

            <p className="mt-8 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Sign in
              </Link>
            </p>

            <p className="mt-6 text-center text-xs leading-5 text-slate-600">
              By creating an account, you agree to use ResumeAI responsibly and
              provide truthful resume information.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}