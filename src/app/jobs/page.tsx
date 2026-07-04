"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Badge, EmptyState, ErrorBanner } from "@/components/ui";
import { Search, Loader2 } from "lucide-react";

type Country = "AU" | "DE" | "US" | "CA";

const COUNTRIES: { code: Country; label: string; flag: string }[] = [
  { code: "AU", label: "Australia", flag: "🇦🇺" },
  { code: "DE", label: "Germany", flag: "🇩🇪" },
  { code: "US", label: "United States", flag: "🇺🇸" },
  { code: "CA", label: "Canada", flag: "🇨🇦" },
];

interface JobSummary {
  id: string;
  createdAt: string;
  countries: string[];
  label?: string;
  companyCount: number;
  contactCount: number;
  verifiedCount: number;
}

export default function JobsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Country[]>(["AU", "DE", "US", "CA"]);
  const [label, setLabel] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function loadJobs() {
    setLoading(true);
    setLoadError(null);
    fetch("/api/jobs")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load jobs (${r.status})`);
        return r.json();
      })
      .then((d) => setJobs(d.runs))
      .catch((e) => setLoadError(e.message || "Failed to load job history."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    loadJobs();
  }, []);

  function toggleCountry(code: Country) {
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function runJob() {
    setRunning(true);
    setRunError(null);
    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countries: selected, label: label || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Run failed (${res.status})`);
      }
      const data = await res.json();
      router.push(`/jobs/${data.run.id}`);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Failed to run search job.");
      setRunning(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Search Jobs"
        title="Run a new search job"
        description="Each run pulls a company universe, discovers leadership, applies both compliance gates, and verifies emails — no LinkedIn, no paid keys."
      />

      <div className="glass rounded-2xl p-5 mb-8">
        <label className="mono text-[10px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-2 block">
          Job label (optional)
        </label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Q3 outbound — enterprise SaaS"
          className="w-full bg-[var(--glass-strong)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--teal-border)] mb-5 placeholder:text-[var(--ink-faint)]"
        />

        <label className="mono text-[10px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-2 block">
          Countries
        </label>
        <div className="flex flex-wrap gap-2 mb-5">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => toggleCountry(c.code)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                selected.includes(c.code)
                  ? "border-[var(--teal-border)] bg-[var(--teal-dim)] text-[var(--teal)]"
                  : "border-[var(--glass-border)] text-[var(--ink-dim)]"
              }`}
            >
              <span>{c.flag}</span>
              {c.label}
            </button>
          ))}
        </div>

        {runError && (
          <div className="mb-4">
            <ErrorBanner message={runError} onRetry={runJob} />
          </div>
        )}

        <button
          onClick={runJob}
          disabled={running || selected.length === 0}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--teal)] text-[#05201d] font-semibold text-sm disabled:opacity-40 transition-opacity"
        >
          {running ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          {running ? "Running…" : "Run search job"}
        </button>
      </div>

      <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-3">
        Job history
      </div>

      {loadError && (
        <div className="mb-4">
          <ErrorBanner message={loadError} onRetry={loadJobs} />
        </div>
      )}

      {!loading && !loadError && jobs.length === 0 ? (
        <EmptyState icon={Search} title="No jobs yet" description="Run your first job above to see it here." />
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <a
              key={job.id}
              href={`/jobs/${job.id}`}
              className="glass glass-hover rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div>
                <div className="text-sm font-medium">
                  {job.label || `Search job · ${job.countries.join(", ")}`}
                </div>
                <div className="text-[11px] text-[var(--ink-dim)] mt-0.5">
                  {new Date(job.createdAt).toLocaleString()} · {job.companyCount} companies
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="violet">{job.contactCount} contacts</Badge>
                <Badge tone="teal">{job.verifiedCount} verified</Badge>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
