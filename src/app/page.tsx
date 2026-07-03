"use client";

import { useState } from "react";
import { Country, PipelineRun, STAGE_LABELS, STAGE_ORDER, GATE_STAGES } from "@/lib/types";

const COUNTRIES: { code: Country; label: string; flag: string }[] = [
  { code: "AU", label: "Australia", flag: "🇦🇺" },
  { code: "DE", label: "Germany", flag: "🇩🇪" },
  { code: "US", label: "United States", flag: "🇺🇸" },
  { code: "CA", label: "Canada", flag: "🇨🇦" },
];

export default function Home() {
  const [selected, setSelected] = useState<Country[]>(["AU", "DE", "US", "CA"]);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [openStage, setOpenStage] = useState<string | null>(null);

  function toggleCountry(code: Country) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function runPipeline() {
    setRunning(true);
    setRun(null);
    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countries: selected }),
      });
      const data = await res.json();
      setRun(data.run);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-8 w-full">
      <header className="mb-8">
        <div className="mono text-[11px] tracking-[0.14em] uppercase text-[var(--accent)] mb-2">
          leadintel — demo mode
        </div>
        <h1 className="text-2xl font-bold mb-2">Executive contact enrichment pipeline</h1>
        <p className="text-sm text-[var(--muted)] leading-relaxed max-w-xl">
          Runs entirely on public registries and demo data — no paid API keys, no LinkedIn.
          Every contact passes through a consent gate and a suppression gate before it can
          reach an outreach queue.
        </p>
        <div className="mt-4 border border-[var(--danger-dim)] bg-[rgba(224,82,82,0.06)] rounded-lg px-4 py-3 text-[13px] text-[#e8b4b4] leading-relaxed">
          <b className="text-[var(--danger)]">Demo data notice:</b> the company universe and
          name-discovery stages ship with fictional seed data (
          <code className="mono">data/seed-companies.json</code>) so the pipeline is runnable
          out of the box. Swap in real registry connectors before using this for actual outreach —
          see comments in <code className="mono">src/lib/pipeline/</code>.
        </div>
      </header>

      <section className="mb-8">
        <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">
          Countries
        </div>
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => toggleCountry(c.code)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                selected.includes(c.code)
                  ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]"
              }`}
            >
              <span>{c.flag}</span>
              {c.label}
            </button>
          ))}
        </div>

        <button
          onClick={runPipeline}
          disabled={running || selected.length === 0}
          className="mt-5 w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[var(--accent)] text-[#06201d] font-semibold text-sm disabled:opacity-40 transition-opacity"
        >
          {running ? "Running pipeline…" : "Run pipeline"}
        </button>
      </section>

      {run && (
        <>
          <section className="mb-10">
            <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">
              Stages
            </div>
            <div className="flex flex-col gap-0">
              {STAGE_ORDER.map((stageId, i) => {
                const stage = run.stages[stageId];
                const isGate = GATE_STAGES.includes(stageId);
                const isOpen = openStage === stageId;
                return (
                  <div key={stageId}>
                    {i > 0 && <div className="w-px h-5 bg-[var(--line)] ml-6" />}
                    <div
                      onClick={() => setOpenStage(isOpen ? null : stageId)}
                      className={`rounded-xl border px-4 py-3.5 cursor-pointer transition-colors ${
                        isGate
                          ? "border-[var(--warn)] bg-[rgba(224,164,88,0.06)]"
                          : "border-[var(--line)] bg-[var(--panel)]"
                      } ${isOpen ? "bg-[var(--panel-2)]" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{STAGE_LABELS[stageId]}</div>
                          <div className="mono text-[10.5px] text-[var(--muted)] mt-0.5">
                            in: {stage.input} · out: {stage.output}
                            {stage.blocked > 0 ? ` · blocked: ${stage.blocked}` : ""}
                          </div>
                        </div>
                        <span
                          className={`mono text-[10px] px-2 py-1 rounded-full border ${
                            stage.status === "done"
                              ? "border-[var(--accent-dim)] text-[var(--accent)]"
                              : "border-[var(--line)] text-[var(--muted)]"
                          }`}
                        >
                          {stage.status}
                        </span>
                      </div>
                      {isOpen && (
                        <div className="mt-3 pt-3 border-t border-[var(--line)] text-[12.5px] text-[#c3cbd6] leading-relaxed space-y-1">
                          {stage.log.map((line, idx) => (
                            <div key={idx} className="mono text-[11.5px]">
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
          </section>

          <section>
            <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] mb-3">
              Contacts ({run.contacts.length})
            </div>
            <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-[var(--muted)] mono text-[10.5px] uppercase tracking-wide border-b border-[var(--line)]">
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
                    <tr key={c.id} className="border-b border-[var(--line)] last:border-0">
                      <td className="px-3 py-2">
                        {c.name}
                        <div className="text-[var(--muted)] text-[11px]">{c.title}</div>
                      </td>
                      <td className="px-3 py-2">{c.country}</td>
                      <td className="px-3 py-2 mono text-[11.5px]">{c.email ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`mono text-[10px] px-2 py-0.5 rounded-full border ${
                            c.consentBasis === "requires_optin" || c.consentBasis === "blocked"
                              ? "border-[var(--danger)] text-[var(--danger)]"
                              : "border-[var(--accent-dim)] text-[var(--accent)]"
                          }`}
                        >
                          {c.consentBasis ?? "pending"}
                        </span>
                      </td>
                      <td className="px-3 py-2">{c.verified ? "✅" : "—"}</td>
                      <td className="px-3 py-2">{c.suppressed ? "🚫" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <footer className="mt-12 pt-5 border-t border-[var(--line)] text-[12px] text-[var(--muted)] leading-relaxed">
        Built for zero paid API keys. Free-tier connectors are stubbed with clear TODOs in{" "}
        <code className="mono">src/lib/pipeline/</code> — swap in real registry calls one stage
        at a time and keep them under their documented rate limits.
      </footer>
    </div>
  );
}
