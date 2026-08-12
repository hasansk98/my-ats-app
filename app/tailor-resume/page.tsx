import { Suspense } from "react";
import TailorResumeClient from "./TailorResumeClient";

export default function TailorResumePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading Resume Tailor...
        </main>
      }
    >
      <TailorResumeClient />
    </Suspense>
  );
}
