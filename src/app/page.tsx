"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, StatCard, Badge, EmptyState } from "@/components/ui";
import { Building2, Users, ShieldCheck, Send, Search, ArrowRight, Plus } from "lucide-react";

interface Analytics {
  totalRuns: number;
  totalCompanies: number;
  totalContacts: number;
  verified: number;
  suppressed: number;
  queueEligible: number;
  byCountry: Record<string, number>;
  byConsent: Record<string, number>;
}

interface JobSummary {
  id: string;
  createdAt: string;
  countries: string[];
  label?: string;
  companyCount: number;
  contactCount: number;
  verifiedCount: number;
}

const FLAGS: Record<string, string> = { AU: "🇦🇺", DE: "🇩🇪", US: "🇺🇸", CA: "🇨🇦" };

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()),
      fetch("/api/jobs").then((r) => r.json()),
    ]).then(([a, j]) => {
      setAnalytics(a);
      setJobs(j.runs.slice(0, 6));
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="A live view across every search job — companies discovered, contacts cleared for outreach, and where the pipeline drew the line."
        action={
          <Link
            href="/jobs"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--teal)] text-[#05201d] font-semibold text-sm shrink-0 hover:brightness-110 transition"
          >
            <Plus size={15} />
            New search job
          </Link>
        }
      />

      {!loading && analytics && analytics.totalRuns === 0 ? (
        <EmptyState
          icon={Search}
          title="No search jobs yet"
          description="Run your first search job to see companies, contacts, and consent status populate here."
          action={
            <Link
              href="/jobs"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--teal)] text-[#05201d] text-xs font-semibold"
            >
              Launch a search job <ArrowRight size={13} />
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <StatCard
              icon={Building2}
              label="Companies discovered"
              value={analytics?.totalCompanies ?? "—"}
              accent="teal"
            />
            <StatCard
              icon={Users}
              label="Contacts found"
              value={analytics?.totalContacts ?? "—"}
              accent="violet"
            />
            <StatCard
              icon={ShieldCheck}
              label="Verified emails"
              value={analytics?.verified ?? "—"}
              accent="teal"
              hint="MX-confirmed, not just guessed"
            />
            <StatCard
              icon={Send}
              label="Queue-eligible"
              value={analytics?.queueEligible ?? "—"}
              accent="amber"
              hint="Cleared both compliance gates"
            />
          </div>

          <div className="grid lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)]">
                  Recent search jobs
                </div>
                <Link href="/jobs" className="text-xs text-[var(--teal)] flex items-center gap-1">
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-2">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="glass glass-hover rounded-xl px-4 py-3 flex items-center justify-between gap-3 block"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {job.label || `Search job · ${job.countries.join(", ")}`}
                      </div>
                      <div className="text-[11px] text-[var(--ink-dim)] mt-0.5">
                        {new Date(job.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {job.countries.map((c) => (
                        <span key={c}>{FLAGS[c]}</span>
                      ))}
                      <Badge tone="teal">{job.contactCount} contacts</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-3">
                Contacts by country
              </div>
              <div className="glass rounded-2xl p-4 space-y-3">
                {analytics &&
                  Object.entries(analytics.byCountry).map(([country, count]) => {
                    const max = Math.max(...Object.values(analytics.byCountry), 1);
                    return (
                      <div key={country}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>
                            {FLAGS[country]} {country}
                          </span>
                          <span className="mono text-[var(--ink-dim)]">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--glass-strong)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--teal)] to-[var(--violet)]"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {analytics && Object.keys(analytics.byCountry).length === 0 && (
                  <div className="text-xs text-[var(--ink-faint)] text-center py-4">No data yet</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
