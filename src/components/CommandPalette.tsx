"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { Search, CornerDownLeft } from "lucide-react";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setActive(0);
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
    setActive(0);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[active]) {
      e.preventDefault();
      go(filtered[active].href);
    }
  }

  // Keep the active row in view as arrow keys move past the scroll edge.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const clamped = Math.min(active, Math.max(filtered.length - 1, 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 cmdk-overlay bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="glass-strong w-full max-w-lg rounded-2xl overflow-hidden animate-fade-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--glass-border)]">
          <Search size={16} className="text-[var(--ink-dim)] shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Jump to a module…"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={filtered[clamped] ? `cmdk-item-${clamped}` : undefined}
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-[var(--ink-faint)]"
          />
          <kbd className="mono text-[10px] text-[var(--ink-faint)] border border-[var(--glass-border)] rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>
        <div ref={listRef} id="cmdk-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="text-sm text-[var(--ink-dim)] px-3 py-6 text-center">No matches</div>
          )}
          {filtered.map((item, i) => {
            const Icon = item.icon;
            const isActive = i === clamped;
            return (
              <button
                key={item.href}
                id={`cmdk-item-${i}`}
                role="option"
                aria-selected={isActive}
                data-active={isActive}
                onClick={() => go(item.href)}
                onMouseMove={() => setActive(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isActive ? "bg-[var(--glass-strong)]" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-[var(--teal-dim)] border-[var(--teal-border)]"
                      : "bg-[var(--glass)] border-[var(--glass-border)]"
                  }`}
                >
                  <Icon size={15} className="text-[var(--teal)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-[var(--ink-dim)] truncate">{item.description}</div>
                </div>
                {isActive && (
                  <CornerDownLeft size={13} className="text-[var(--ink-faint)] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
        <div className="px-4 py-2 border-t border-[var(--glass-border)] flex items-center gap-3 text-[10px] text-[var(--ink-faint)] mono">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
