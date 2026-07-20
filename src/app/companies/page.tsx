"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, EmptyState, ErrorBanner, SkeletonRows } from "@/components/ui";
import { providerBadge } from "@/lib/providerBadge";
import { Building2, ExternalLink, Search } from "lucide-react";

interface Company {
  id: string;
  name: string;
  country: string;
  domain?: string;
  registryId?: string;
  source: string;
  provider: string;
  runId: string;
}

const FLAGS: Record<string, string> = { AU: "🇦🇺", DE: "🇩🇪", US: "🇺🇸", CA: "🇨🇦" };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/companies")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load companies (${r.status})`);
        return r.json();
      })
      .then((d) => setCompanies(d.companies))
      .catch((e) => setError(e.message || "Failed to load companies."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    load();
  }, []);

  const countries = Array.from(new Set(companies.map((c) => c.country)));
  const q = search.trim().toLowerCase();
  const visible = companies.filter((c) => {
    if (filter !== "ALL" && c.country !== filter) return false;
    if (q && ![c.name, c.domain ?? "", c.registryId ?? ""].some((f) => f.toLowerCase().includes(q)))
      return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <PageHeader
        eyebrow={loading ? "Companies" : `${companies.length} discovered`}
        title="Companies"
        description="Every company surfaced across your search jobs, deduplicated, with its source registry."
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      {loading && !error ? (
        <SkeletonRows count={6} />
      ) : !error && companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Run a search job to populate this view."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <div className="relative w-full sm:w-64">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, domain, registry ID…"
                className="w-full bg-[var(--glass-strong)] border border-[var(--glass-border)] rounded-full pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[var(--teal-border)] placeholder:text-[var(--ink-faint)]"
              />
            </div>
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                filter === "ALL"
                  ? "border-[var(--teal-border)] bg-[var(--teal-dim)] text-[var(--teal)]"
                  : "border-[var(--glass-border)] text-[var(--ink-dim)]"
              }`}
            >
              All
            </button>
            {countries.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-3 py-1.5 rounded-full text-xs border flex items-center gap-1.5 ${
                  filter === c
                    ? "border-[var(--teal-border)] bg-[var(--teal-dim)] text-[var(--teal)]"
                    : "border-[var(--glass-border)] text-[var(--ink-dim)]"
                }`}
              >
                {FLAGS[c]} {c}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl glass">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[var(--ink-dim)] mono text-[10.5px] uppercase tracking-wide border-b border-[var(--glass-border)]">
                  <th className="px-3 py-2.5">Company</th>
                  <th className="px-3 py-2.5">Country</th>
                  <th className="px-3 py-2.5">Domain</th>
                  <th className="px-3 py-2.5">Registry ID</th>
                  <th className="px-3 py-2.5">Source</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-xs text-[var(--ink-faint)]">
                      No companies match the current filters.
                    </td>
                  </tr>
                )}
                {visible.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--glass-border)] last:border-0">
                    <td className="px-3 py-2.5 font-medium">{c.name}</td>
                    <td className="px-3 py-2.5">{FLAGS[c.country]} {c.country}</td>
                    <td className="px-3 py-2.5 mono text-[11.5px]">
                      {c.domain ? (
                        <a
                          href={`https://${c.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[var(--teal)] hover:underline"
                        >
                          {c.domain} <ExternalLink size={10} />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 mono text-[11px] text-[var(--ink-dim)]">
                      {c.registryId ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={providerBadge(c.provider).tone}>{providerBadge(c.provider).label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
