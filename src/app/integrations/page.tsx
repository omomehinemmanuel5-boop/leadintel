"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge } from "@/components/ui";
import { Plug, CheckCircle2, XCircle } from "lucide-react";

interface Status {
  apollo: boolean;
  google: boolean;
}

const CONNECTORS = [
  {
    stage: "Company universe",
    items: [
      { name: "SEC EDGAR (US)", status: "live" as const, note: "Free, no key. Real public companies + websites." },
      { name: "Apollo.io (organization search)", status: "apollo" as const, note: "Not yet wired for company universe — currently used for name+email discovery only." },
      { name: "Australian Business Register", status: "planned" as const, note: "Free ABN lookup." },
      { name: "Corporations Canada", status: "planned" as const, note: "Free federal registry search." },
      { name: "Unternehmensregister (DE)", status: "planned" as const, note: "Free search, no bulk API." },
    ],
  },
  {
    stage: "Domain resolution",
    items: [
      { name: "Heuristic + DNS", status: "live" as const, note: "Slug guess, MX/A record confirms it." },
      { name: "Registry-provided website", status: "live" as const, note: "Used directly when SEC provides it." },
      { name: "Google Custom Search fallback", status: "google" as const, note: "Used when the heuristic guess fails to resolve." },
    ],
  },
  {
    stage: "Name discovery",
    items: [
      { name: "Apollo.io (people search + match)", status: "apollo" as const, note: "Real database match. Costs credits — capped at 5 enrichments/run." },
      { name: "Google Search (heuristic extraction)", status: "google" as const, note: "Reads the company's own site only. Lower confidence than Apollo." },
      { name: "Seed demo data", status: "demo" as const, note: "Fictional, clearly labeled. Used only when no provider finds a match." },
    ],
  },
  {
    stage: "Email",
    items: [
      { name: "Apollo direct match", status: "apollo" as const, note: "When Apollo enrichment includes an email, it's used as-is — no guessing." },
      { name: "Pattern inference", status: "live" as const, note: "first.last@domain and variants, used when no provider supplies an email." },
      { name: "MX/DNS verification", status: "live" as const, note: "Confirms domain accepts mail. No send." },
    ],
  },
];

export default function IntegrationsPage() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => r.json())
      .then(setStatus);
  }, []);

  function renderStatus(kind: "live" | "demo" | "planned" | "apollo" | "google") {
    if (kind === "live") return <Badge tone="teal">Live</Badge>;
    if (kind === "demo") return <Badge tone="amber">Demo data</Badge>;
    if (kind === "planned") return <Badge tone="neutral">Planned</Badge>;
    if (kind === "apollo") {
      if (!status) return <Badge tone="neutral">Checking…</Badge>;
      return status.apollo ? <Badge tone="violet">Apollo · configured</Badge> : <Badge tone="neutral">Apollo · no key set</Badge>;
    }
    if (kind === "google") {
      if (!status) return <Badge tone="neutral">Checking…</Badge>;
      return status.google ? <Badge tone="blue">Google · configured</Badge> : <Badge tone="neutral">Google · no key set</Badge>;
    }
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Integrations"
        title="Connector status"
        description="What's actually live today, what needs a key you haven't added yet, and what's still planned — organized by pipeline stage. No LinkedIn appears anywhere in this list, by design."
      />

      {status && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            {status.apollo ? (
              <CheckCircle2 size={18} className="text-[var(--violet)]" />
            ) : (
              <XCircle size={18} className="text-[var(--ink-faint)]" />
            )}
            <div>
              <div className="text-sm font-medium">Apollo.io</div>
              <div className="text-[11px] text-[var(--ink-dim)]">
                {status.apollo ? "API key configured" : "APOLLO_API_KEY not set"}
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            {status.google ? (
              <CheckCircle2 size={18} className="text-[var(--blue)]" />
            ) : (
              <XCircle size={18} className="text-[var(--ink-faint)]" />
            )}
            <div>
              <div className="text-sm font-medium">Google Custom Search</div>
              <div className="text-[11px] text-[var(--ink-dim)]">
                {status.google ? "API key + CSE ID configured" : "GOOGLE_API_KEY / GOOGLE_CSE_ID not set"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {CONNECTORS.map((group) => (
          <div key={group.stage}>
            <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-2.5 flex items-center gap-2">
              <Plug size={12} /> {group.stage}
            </div>
            <div className="glass rounded-2xl divide-y divide-[var(--glass-border)]">
              {group.items.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-[11.5px] text-[var(--ink-dim)] mt-0.5">{item.note}</div>
                  </div>
                  {renderStatus(item.status)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
