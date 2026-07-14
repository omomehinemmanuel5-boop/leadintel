"use client";

import {
  Building2,
  Globe,
  UserSearch,
  ShieldCheck,
  AtSign,
  BadgeCheck,
  ShieldOff,
  Send,
  type LucideIcon,
} from "lucide-react";

interface Checkpoint {
  key: string;
  label: string;
  icon: LucideIcon;
  isGate: boolean;
}

const CHECKPOINTS: Checkpoint[] = [
  { key: "company_universe", label: "Discover", icon: Building2, isGate: false },
  { key: "domain_resolution", label: "Resolve", icon: Globe, isGate: false },
  { key: "name_discovery", label: "Identify", icon: UserSearch, isGate: false },
  { key: "consent_gate", label: "Consent", icon: ShieldCheck, isGate: true },
  { key: "email_pattern", label: "Infer", icon: AtSign, isGate: false },
  { key: "verification", label: "Verify", icon: BadgeCheck, isGate: false },
  { key: "suppression_gate", label: "Suppress", icon: ShieldOff, isGate: true },
  { key: "outreach_queue", label: "Queue", icon: Send, isGate: false },
];

interface ProvenanceRibbonProps {
  funnel?: Record<string, number>;
  compact?: boolean;
}

/**
 * The signature element. This product's entire differentiator is that
 * every contact carries a checkable chain of custody — discovered,
 * resolved, identified, checked against consent law, inferred, verified
 * by DNS, checked against a suppression list, and only then queued.
 * That's not a detail to bury in a job's stage log — it's the whole
 * point of the product, so it's visualized persistently instead of
 * decorated around.
 */
export default function ProvenanceRibbon({ funnel, compact = false }: ProvenanceRibbonProps) {
  const maxValue = funnel ? Math.max(...CHECKPOINTS.map((c) => funnel[c.key] ?? 0), 1) : 1;

  return (
    <div className={compact ? "" : "glass rounded-2xl p-5 md:p-6"}>
      {!compact && (
        <div className="mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--ink-faint)] mb-4">
          Chain of custody — every contact, every run
        </div>
      )}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className={`flex items-center ${compact ? "gap-0 min-w-[420px]" : "gap-0 min-w-[640px] md:min-w-0"}`}>
          {CHECKPOINTS.map((cp, i) => {
            const Icon = cp.icon;
            const value = funnel?.[cp.key] ?? 0;
            const isActive = value > 0;
            const intensity = funnel ? Math.min(1, value / maxValue) : 0;

            return (
              <div key={cp.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div
                    className={`relative flex items-center justify-center border transition-colors ${
                      cp.isGate ? "rounded-lg rotate-45" : "rounded-full"
                    } ${compact ? "w-7 h-7" : "w-10 h-10"} ${
                      isActive
                        ? cp.isGate
                          ? "border-[var(--amber-border)] bg-[var(--amber-dim)]"
                          : "border-[var(--teal-border)] bg-[var(--teal-dim)] checkpoint-active"
                        : "border-[var(--glass-border)] bg-[var(--glass)]"
                    }`}
                    style={isActive && !cp.isGate ? { opacity: 0.55 + intensity * 0.45 } : undefined}
                  >
                    <Icon
                      size={compact ? 12 : 16}
                      className={cp.isGate ? "-rotate-45" : ""}
                      style={{
                        color: isActive ? (cp.isGate ? "var(--amber)" : "var(--teal)") : "var(--ink-faint)",
                      }}
                    />
                  </div>
                  {!compact && (
                    <div className="text-center">
                      <div
                        className={`text-[10.5px] font-medium ${isActive ? "text-[var(--ink)]" : "text-[var(--ink-faint)]"}`}
                      >
                        {cp.label}
                      </div>
                      {funnel && <div className="mono text-[9.5px] text-[var(--ink-faint)]">{value}</div>}
                    </div>
                  )}
                </div>
                {i < CHECKPOINTS.length - 1 && (
                  <svg className={compact ? "flex-1 h-3 min-w-[10px]" : "flex-1 h-4 min-w-[16px]"} preserveAspectRatio="none">
                    <line
                      x1="0"
                      y1="50%"
                      x2="100%"
                      y2="50%"
                      stroke={isActive && (funnel?.[CHECKPOINTS[i + 1].key] ?? 0) > 0 ? "var(--teal)" : "var(--glass-border-strong)"}
                      strokeWidth="1.5"
                      className={isActive ? "ribbon-line" : ""}
                      opacity={isActive ? 0.6 : 1}
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {!compact && (
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--glass-border)]">
          <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--ink-dim)]">
            <div className="w-2.5 h-2.5 rounded-full border border-[var(--teal-border)] bg-[var(--teal-dim)]" />
            Discovery stage
          </div>
          <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--ink-dim)]">
            <div className="w-2.5 h-2.5 rounded-[3px] border border-[var(--amber-border)] bg-[var(--amber-dim)] rotate-45" />
            Compliance gate
          </div>
        </div>
      )}
    </div>
  );
}
