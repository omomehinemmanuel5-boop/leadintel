"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui";
import { Download, ShieldCheck, AlertTriangle } from "lucide-react";

interface Analytics {
  totalContacts: number;
  queueEligible: number;
  suppressed: number;
}

export default function ExportsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Exports"
        title="Export contacts"
        description="Two exports are available — one filtered to what's actually safe to contact, one raw for your own review."
      />

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-5 border-[var(--teal-border)]">
          <div className="w-9 h-9 rounded-lg bg-[var(--teal-dim)] flex items-center justify-center mb-3">
            <ShieldCheck size={17} className="text-[var(--teal)]" />
          </div>
          <div className="font-semibold text-sm mb-1">Outreach-eligible only</div>
          <p className="text-xs text-[var(--ink-dim)] leading-relaxed mb-4">
            Verified email, cleared both the consent gate and the suppression gate. This is what the
            outreach queue itself would use.
          </p>
          <div className="text-2xl font-bold font-display mb-4">{data?.queueEligible ?? "—"}</div>
          <a
            href="/api/export/contacts"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[var(--teal)] text-[#05201d] font-semibold text-sm"
          >
            <Download size={14} /> Download CSV
          </a>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="w-9 h-9 rounded-lg bg-[var(--amber-dim)] flex items-center justify-center mb-3">
            <AlertTriangle size={17} className="text-[var(--amber)]" />
          </div>
          <div className="font-semibold text-sm mb-1">All contacts (raw)</div>
          <p className="text-xs text-[var(--ink-dim)] leading-relaxed mb-4">
            Everything found, including unverified guesses, suppressed entries, and anyone blocked by
            the consent gate. For your own review only — not for sending.
          </p>
          <div className="text-2xl font-bold font-display mb-4">{data?.totalContacts ?? "—"}</div>
          <a
            href="/api/export/contacts?all=true"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl glass glass-hover font-medium text-sm"
          >
            <Download size={14} /> Download CSV
          </a>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-3">
          CSV columns
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "name",
            "title",
            "country",
            "email",
            "email_confidence",
            "verified",
            "consent_basis",
            "consent_notes",
            "suppressed",
            "discovery_source",
          ].map((col) => (
            <span key={col} className="mono text-[11px] px-2.5 py-1 rounded-lg bg-[var(--glass-strong)] border border-[var(--glass-border)]">
              {col}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
