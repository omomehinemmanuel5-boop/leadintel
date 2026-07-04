"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader, Badge } from "@/components/ui";
import { ArrowLeft } from "lucide-react";

const STAGE_ORDER = [
  "company_universe",
  "domain_resolution",
  "name_discovery",
  "consent_gate",
  "email_pattern",
  "verification",
  "suppression_gate",
  "outreach_queue",
] as const;

const STAGE_LABELS: Record<string, string> = {
  company_universe: "Company universe",
  domain_resolution: "Domain resolution",
  name_discovery: "Name discovery",
  consent_gate: "Consent classification (gate)",
  email_pattern: "Email pattern inference",
  verification: "Verification",
  suppression_gate: "Suppression check (gate)",
  outreach_queue: "Outreach queue",
};

const GATE_STAGES = ["consent_gate", "suppression_gate"];

interface StageResult {
  status: string;
  input: number;
  output: number;
  blocked: number;
  log: string[];
}

interface Contact {
  id: string;
  name: string;
  title: string;
  country: string;
  email?: string;
  consentBasis?: string;
  verified?: boolean;
  suppressed?: boolean;
}

interface Run {
  id: string;
  createdAt: string;
  countries: string[];
  stages: Record<string, StageResult>;
  contacts: Contact[];
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [openStage, setOpenStage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => setRun(d.run))
      .catch(() => setNotFound(true));
  }, [params.id]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 text-center">
        <p className="text-sm text-[var(--ink-dim)] mb-4">
          Job not found — this can happen after a redeploy since job history is in-memory for now.
        </p>
        <Link href="/jobs" className="text-[var(--teal)] text-sm">
          Back to Search Jobs
        </Link>
      </div>
    );
  }

  if (!run) {
    return <div className="max-w-4xl mx-auto px-6 py-10 text-sm text-[var(--ink-dim)]">Loading…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <Link href="/jobs" className="flex items-center gap-1.5 text-xs text-[var(--ink-dim)] mb-4 hover:text-[var(--ink)]">
        <ArrowLeft size={13} /> Search Jobs
      </Link>

      <PageHeader
        eyebrow={run.countries.join(" · ")}
        title={`Job ${run.id.replace("run_", "#")}`}
        description={`Run on ${new Date(run.createdAt).toLocaleString()}`}
      />

      <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-3">Stages</div>
      <div className="flex flex-col mb-10">
        {STAGE_ORDER.map((stageId, i) => {
          const stage = run.stages[stageId];
          if (!stage) return null;
          const isGate = GATE_STAGES.includes(stageId);
          const isOpen = openStage === stageId;
          return (
            <div key={stageId}>
              {i > 0 && <div className="w-px h-5 bg-[var(--glass-border)] ml-6" />}
              <div
                onClick={() => setOpenStage(isOpen ? null : stageId)}
                className={`rounded-xl border px-4 py-3.5 cursor-pointer transition-colors ${
                  isGate ? "border-[var(--amber-border)] bg-[var(--amber-dim)]" : "glass"
                } ${isOpen ? "bg-[var(--glass-strong)]" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{STAGE_LABELS[stageId]}</div>
                    <div className="mono text-[10.5px] text-[var(--ink-dim)] mt-0.5">
                      in: {stage.input} · out: {stage.output}
                      {stage.blocked > 0 ? ` · blocked: ${stage.blocked}` : ""}
                    </div>
                  </div>
                  <Badge tone={stage.status === "done" ? "teal" : "neutral"}>{stage.status}</Badge>
                </div>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-[var(--glass-border)] space-y-1 max-h-64 overflow-y-auto">
                    {stage.log.map((line, idx) => (
                      <div key={idx} className="mono text-[11.5px] text-[#c3cbd6] leading-relaxed">
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-3">
        Contacts ({run.contacts.length})
      </div>
      <div className="overflow-x-auto rounded-xl glass">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left text-[var(--ink-dim)] mono text-[10.5px] uppercase tracking-wide border-b border-[var(--glass-border)]">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Email (guess)</th>
              <th className="px-3 py-2">Consent</th>
              <th className="px-3 py-2">Verified</th>
              <th className="px-3 py-2">Suppressed</th>
            </tr>
          </thead>
          <tbody>
            {run.contacts.map((c) => (
              <tr key={c.id} className="border-b border-[var(--glass-border)] last:border-0">
                <td className="px-3 py-2">
                  {c.name}
                  <div className="text-[var(--ink-dim)] text-[11px]">{c.title}</div>
                </td>
                <td className="px-3 py-2">{c.country}</td>
                <td className="px-3 py-2 mono text-[11.5px]">{c.email ?? "—"}</td>
                <td className="px-3 py-2">
                  <Badge tone={c.consentBasis === "requires_optin" || c.consentBasis === "blocked" ? "red" : "teal"}>
                    {c.consentBasis ?? "pending"}
                  </Badge>
                </td>
                <td className="px-3 py-2">{c.verified ? "✅" : "—"}</td>
                <td className="px-3 py-2">{c.suppressed ? "🚫" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
