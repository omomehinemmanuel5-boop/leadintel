import Link from "next/link";
import { Compass, LayoutDashboard, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <div className="glass rounded-2xl p-8 md:p-10 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--glass-strong)] border border-[var(--glass-border)] flex items-center justify-center mb-5">
          <Compass size={24} className="text-[var(--teal)]" />
        </div>
        <div className="mono text-[11px] tracking-[0.14em] uppercase text-[var(--ink-faint)] mb-1.5">
          404
        </div>
        <h1 className="font-display font-bold text-lg mb-2">No provenance for this page</h1>
        <p className="text-sm text-[var(--ink-dim)] leading-relaxed max-w-md mb-8">
          Nothing in LeadIntel lives at this address — the link may be stale, or a job ID may have
          been deleted along with its run.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--teal)] text-[#05201d] font-semibold text-sm hover:brightness-110 transition"
          >
            <LayoutDashboard size={14} />
            Back to dashboard
          </Link>
          <Link
            href="/jobs"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass glass-hover text-sm font-medium"
          >
            <Search size={14} />
            Search jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
