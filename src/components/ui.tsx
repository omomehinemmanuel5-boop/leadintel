import { LucideIcon, AlertCircle, RotateCw } from "lucide-react";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass rounded-2xl p-5 border-[var(--red-border)] bg-[var(--red-dim)] flex items-start gap-3">
      <AlertCircle size={18} className="text-[var(--red)] shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-medium text-[var(--red)] mb-1">Something went wrong</div>
        <p className="text-xs text-[var(--ink-dim)] leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass glass-hover text-xs font-medium shrink-0"
        >
          <RotateCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <div className="mono text-[11px] tracking-[0.14em] uppercase text-[var(--teal)] mb-1.5">
            {eyebrow}
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-bold font-display">{title}</h1>
        {description && (
          <p className="text-sm text-[var(--ink-dim)] mt-1.5 max-w-xl leading-relaxed">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  accent = "teal",
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: "teal" | "violet" | "amber" | "red";
  hint?: string;
}) {
  const colorVar = { teal: "var(--teal)", violet: "var(--violet)", amber: "var(--amber)", red: "var(--red)" }[
    accent
  ];
  const dimVar = { teal: "var(--teal-dim)", violet: "var(--violet-dim)", amber: "var(--amber-dim)", red: "var(--red-dim)" }[
    accent
  ];

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: dimVar }}
        >
          <Icon size={15} style={{ color: colorVar }} />
        </div>
      </div>
      <div className="text-2xl font-bold font-display">{value}</div>
      <div className="text-xs text-[var(--ink-dim)] mt-0.5">{label}</div>
      {hint && <div className="text-[10.5px] text-[var(--ink-faint)] mt-1.5">{hint}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "teal" | "amber" | "red" | "violet" | "blue";
}) {
  const styles: Record<string, string> = {
    neutral: "border-[var(--glass-border)] text-[var(--ink-dim)]",
    teal: "border-[var(--teal-border)] text-[var(--teal)] bg-[var(--teal-dim)]",
    amber: "border-[var(--amber-border)] text-[var(--amber)] bg-[var(--amber-dim)]",
    red: "border-[var(--red-border)] text-[var(--red)] bg-[var(--red-dim)]",
    violet: "border-[var(--violet-border)] text-[var(--violet)] bg-[var(--violet-dim)]",
    blue: "border-[var(--blue-border)] text-[var(--blue)] bg-[var(--blue-dim)]",
  };
  return (
    <span className={`mono text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-10 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-xl bg-[var(--glass-strong)] flex items-center justify-center mb-4">
        <Icon size={20} className="text-[var(--ink-dim)]" />
      </div>
      <div className="font-semibold text-sm mb-1">{title}</div>
      <p className="text-xs text-[var(--ink-dim)] max-w-xs leading-relaxed mb-4">{description}</p>
      {action}
    </div>
  );
}
