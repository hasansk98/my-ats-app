import { Suspense } from "react";
import AtsAnalyzerClient from "./AtsAnalyzerClient";

export default function AtsAnalyzerPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading ATS Analyzer...
        </main>
      }
    >
      <AtsAnalyzerClient />
    </Suspense>
  );
}