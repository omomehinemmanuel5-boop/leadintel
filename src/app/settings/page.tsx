"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui";
import { Trash2, Plus, ShieldOff, Database } from "lucide-react";

interface SuppressionEntry {
  email: string;
  reason: string;
  addedAt: string;
}

export default function SettingsPage() {
  const [list, setList] = useState<SuppressionEntry[]>([]);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/suppression")
      .then((r) => r.json())
      .then((d) => {
        setList(d.suppressions);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function addEntry() {
    if (!email.trim()) return;
    await fetch("/api/suppression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, reason: reason || undefined }),
    });
    setEmail("");
    setReason("");
    load();
  }

  async function removeEntry(e: string) {
    await fetch(`/api/suppression?email=${encodeURIComponent(e)}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Settings"
        title="Suppression list & limits"
        description="Anyone on this list is blocked from the outreach queue automatically, regardless of consent status."
      />

      <div className="glass rounded-2xl p-5 mb-6">
        <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-3">
          Add to suppression list
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@company.com"
            className="flex-1 bg-[var(--glass-strong)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--teal-border)] placeholder:text-[var(--ink-faint)]"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 bg-[var(--glass-strong)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--teal-border)] placeholder:text-[var(--ink-faint)]"
          />
          <button
            onClick={addEntry}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--teal)] text-[#05201d] text-sm font-semibold shrink-0"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-3">
        {list.length} suppressed {list.length === 1 ? "address" : "addresses"}
      </div>

      {!loading && list.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-[var(--ink-dim)] mb-6">
          <ShieldOff size={20} className="mx-auto mb-2 text-[var(--ink-faint)]" />
          Nothing suppressed yet.
        </div>
      ) : (
        <div className="glass rounded-2xl divide-y divide-[var(--glass-border)] mb-6">
          {list.map((entry) => (
            <div key={entry.email} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="mono text-sm truncate">{entry.email}</div>
                <div className="text-[11px] text-[var(--ink-dim)] mt-0.5">
                  {entry.reason} · {new Date(entry.addedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => removeEntry(entry.email)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-dim)] hover:bg-[var(--red-dim)] hover:text-[var(--red)] transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="glass rounded-2xl p-5 flex gap-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--amber-dim)] flex items-center justify-center shrink-0">
          <Database size={16} className="text-[var(--amber)]" />
        </div>
        <div>
          <div className="font-semibold text-sm mb-1">Storage is temporary right now</div>
          <p className="text-xs text-[var(--ink-dim)] leading-relaxed">
            Search jobs, companies, and contacts live in server memory — they reset on redeploy or cold
            start. The suppression list is file-based locally but won&apos;t persist reliably once deployed.
            Both need a real database (Volume VI: Infrastructure &amp; Deployment) — Vercel Postgres or
            Supabase&apos;s free tier are both zero-cost places to start when you&apos;re ready.
          </p>
        </div>
      </div>
    </div>
  );
}
