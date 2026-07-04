"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import CommandPalette from "@/components/CommandPalette";
import { Menu, X, Command, Radio } from "lucide-react";

const SECTIONS: { key: "core" | "intelligence" | "system"; label: string }[] = [
  { key: "core", label: "Workspace" },
  { key: "intelligence", label: "Intelligence" },
  { key: "system", label: "System" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = NAV_ITEMS.find((i) => i.href === pathname);

  return (
    <div className="relative z-10 flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col shrink-0 border-r border-[var(--glass-border)] glass">
        <SidebarContent pathname={pathname} onNavigate={() => {}} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 glass-strong flex flex-col animate-fade-in">
            <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 md:px-6 h-16 border-b border-[var(--glass-border)] glass shrink-0">
          <button
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--glass-strong)]"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0">
            <div className="text-sm font-semibold font-display truncate">
              {activeItem?.label ?? "LeadIntel"}
            </div>
            {activeItem?.description && (
              <div className="text-[11px] text-[var(--ink-dim)] truncate hidden sm:block">
                {activeItem.description}
              </div>
            )}
          </div>

          <div className="flex-1" />

          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg glass glass-hover text-xs text-[var(--ink-dim)]"
          >
            <Command size={13} />
            <span>Search</span>
            <kbd className="mono text-[10px] border border-[var(--glass-border)] rounded px-1 py-0.5">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full glass text-[11px] text-[var(--ink-dim)]">
            <Radio size={11} className="text-[var(--teal)] pulse-dot" />
            <span className="hidden sm:inline">Demo mode</span>
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <CommandPalette />
    </div>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between h-16 px-5 border-b border-[var(--glass-border)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--teal)] to-[var(--violet)] flex items-center justify-center">
            <span className="font-display font-bold text-[13px] text-[#05070a]">LI</span>
          </div>
          <div>
            <div className="font-display font-semibold text-[13.5px] leading-none">LeadIntel</div>
            <div className="mono text-[9.5px] text-[var(--ink-faint)] mt-0.5">v0.2 foundation</div>
          </div>
        </div>
        <button className="md:hidden w-8 h-8 flex items-center justify-center" onClick={onNavigate}>
          <X size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.key}>
            <div className="mono text-[10px] tracking-[0.12em] uppercase text-[var(--ink-faint)] px-2.5 mb-1.5">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter((i) => i.section === section.key).map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-[var(--teal-dim)] text-[var(--teal)] border border-[var(--teal-border)]"
                        : "text-[var(--ink-dim)] hover:bg-[var(--glass-strong)] hover:text-[var(--ink)] border border-transparent"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--glass-border)]">
        <div className="glass rounded-xl px-3 py-2.5 text-[11px] text-[var(--ink-dim)] leading-relaxed">
          Built on free/public sources only.{" "}
          <span className="text-[var(--teal)]">No LinkedIn, no scraping.</span>
        </div>
      </div>
    </>
  );
}
