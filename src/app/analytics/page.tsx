"use client";

import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/ui";
import { BarChart3 } from "lucide-react";

interface Analytics {
  totalRuns: number;
  totalCompanies: number;
  totalContacts: number;
  verified: number;
  suppressed: number;
  queueEligible: number;
  byCountry: Record<string, number>;
  byConsent: Record<string, number>;
  funnel: Record<string, number>;
}

const STAGE_ORDER = [
  "company_universe",
  "domain_resolution",
  "name_discovery",
  "consent_gate",
  "email_pattern",
  "verification",
  "suppression_gate",
  "outreach_queue",
];

const STAGE_LABELS: Record<string, string> = {
  company_universe: "Company universe",
  domain_resolution: "Domain resolution",
  name_discovery: "Name discovery",
  consent_gate: "Consent cleared",
  email_pattern: "Email inferred",
  verification: "Verified",
  suppression_gate: "Suppression cleared",
  outreach_queue: "Queued for outreach",
};

const CONSENT_LABELS: Record<string, string> = {
  public_interest_b2b: "Public interest B2B (AU/US/CA)",
  legitimate_interest_gdpr: "Legitimate interest — GDPR (flagged for review)",
  requires_optin: "Requires opt-in (blocked)",
  blocked: "Blocked",
  pending: "Pending classification",
};

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[var(--ink-dim)]">{label}</span>
        <span className="mono">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--glass-strong)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (data && data.totalRuns === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <PageHeader eyebrow="Analytics" title="Pipeline analytics" />
        <EmptyState
          icon={BarChart3}
          title="Nothing to analyze yet"
          description="Run a search job first — analytics populate from real pipeline runs."
        />
      </div>
    );
  }

  const funnelMax = data ? Math.max(...STAGE_ORDER.map((s) => data.funnel[s] ?? 0), 1) : 1;
  const consentMax = data ? Math.max(...Object.values(data.byConsent), 1) : 1;
  const countryMax = data ? Math.max(...Object.values(data.byCountry), 1) : 1;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Analytics"
        title="Pipeline health"
        description="Where contacts move through the pipeline, and why they drop off — aggregated across every search job."
      />

      <div className="grid md:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5">
          <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-4">
            Stage funnel
          </div>
          <div className="space-y-3.5">
            {STAGE_ORDER.map((stage) => (
              <Bar
                key={stage}
                label={STAGE_LABELS[stage]}
                value={data?.funnel[stage] ?? 0}
                max={funnelMax}
                color="linear-gradient(90deg, var(--teal), var(--violet))"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="glass rounded-2xl p-5">
            <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-4">
              Consent basis
            </div>
            <div className="space-y-3.5">
              {data &&
                Object.entries(data.byConsent).map(([basis, count]) => (
                  <Bar
                    key={basis}
                    label={CONSENT_LABELS[basis] ?? basis}
                    value={count}
                    max={consentMax}
                    color={basis === "requires_optin" || basis === "blocked" ? "var(--red)" : "var(--teal)"}
                  />
                ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-4">
              By country
            </div>
            <div className="space-y-3.5">
              {data &&
                Object.entries(data.byCountry).map(([country, count]) => (
                  <Bar key={country} label={country} value={count} max={countryMax} color="var(--violet)" />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
