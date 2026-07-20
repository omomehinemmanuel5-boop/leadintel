"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, LayoutDashboard } from "lucide-react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <div className="glass rounded-2xl p-8 md:p-10 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--red-dim)] border border-[var(--red-border)] flex items-center justify-center mb-5">
          <AlertTriangle size={24} className="text-[var(--red)]" />
        </div>
        <h1 className="font-display font-bold text-lg mb-2">This view hit an error</h1>
        <p className="text-sm text-[var(--ink-dim)] leading-relaxed max-w-md mb-2">
          The rest of the app is still fine — this is an isolated failure in the current page.
          Retrying re-fetches its data from scratch.
        </p>
        {error.digest && (
          <p className="mono text-[10.5px] text-[var(--ink-faint)] mb-6">
            error digest: {error.digest}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
          <button
            onClick={() => unstable_retry()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--teal)] text-[#05201d] font-semibold text-sm hover:brightness-110 transition"
          >
            <RotateCw size={14} />
            Try again
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass glass-hover text-sm font-medium"
          >
            <LayoutDashboard size={14} />
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
