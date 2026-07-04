import { PageHeader, Badge } from "@/components/ui";
import { Plug } from "lucide-react";

const CONNECTORS = [
  {
    stage: "Company universe",
    items: [
      { name: "SEC EDGAR (US)", status: "live" as const, note: "Free, no key. Real public companies + websites." },
      { name: "OpenCorporates (global)", status: "planned" as const, note: "Free tier, rate-limited." },
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
    ],
  },
  {
    stage: "Name discovery",
    items: [
      { name: "Seed demo data", status: "demo" as const, note: "Fictional, clearly labeled." },
      { name: "Company's own /about page", status: "planned" as const, note: "Never a third-party platform." },
      { name: "DEF 14A / proxy filings (US)", status: "planned" as const, note: "Free, public, names real officers." },
    ],
  },
  {
    stage: "Email verification",
    items: [
      { name: "MX/DNS lookup", status: "live" as const, note: "Confirms domain accepts mail. No send." },
      { name: "ZeroBounce", status: "planned" as const, note: "Free tier, 100/mo — mailbox-level confidence." },
    ],
  },
  {
    stage: "Optional paid upgrades",
    items: [
      { name: "Apollo.io", status: "bring-your-own-key" as const, note: "Faster coverage if you already pay for it." },
      { name: "Hunter.io", status: "bring-your-own-key" as const, note: "Same — not required to run this." },
      { name: "Clearbit", status: "bring-your-own-key" as const, note: "Enterprise-grade, optional." },
    ],
  },
];

const STATUS_STYLE: Record<string, { tone: "teal" | "amber" | "neutral" | "violet"; label: string }> = {
  live: { tone: "teal", label: "Live" },
  demo: { tone: "amber", label: "Demo data" },
  planned: { tone: "neutral", label: "Planned" },
  "bring-your-own-key": { tone: "violet", label: "Optional · your key" },
};

export default function IntegrationsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Integrations"
        title="Connector status"
        description="What's actually live today, what's demo data, and what's next — organized by pipeline stage. No LinkedIn appears anywhere in this list, by design."
      />

      <div className="space-y-6">
        {CONNECTORS.map((group) => (
          <div key={group.stage}>
            <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-2.5 flex items-center gap-2">
              <Plug size={12} /> {group.stage}
            </div>
            <div className="glass rounded-2xl divide-y divide-[var(--glass-border)]">
              {group.items.map((item) => {
                const style = STATUS_STYLE[item.status];
                return (
                  <div key={item.name} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-[11.5px] text-[var(--ink-dim)] mt-0.5">{item.note}</div>
                    </div>
                    <Badge tone={style.tone}>{style.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
