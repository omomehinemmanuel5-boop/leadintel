"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { Search } from "lucide-react";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = NAV_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );

  function go(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 cmdk-overlay bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="glass-strong w-full max-w-lg rounded-2xl overflow-hidden animate-fade-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--glass-border)]">
          <Search size={16} className="text-[var(--ink-dim)] shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a module…"
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-[var(--ink-faint)]"
          />
          <kbd className="mono text-[10px] text-[var(--ink-faint)] border border-[var(--glass-border)] rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="text-sm text-[var(--ink-dim)] px-3 py-6 text-center">No matches</div>
          )}
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => go(item.href)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[var(--glass-strong)] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-[var(--teal)]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-[var(--ink-dim)] truncate">{item.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
