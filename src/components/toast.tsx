"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Check, Copy, AlertCircle } from "lucide-react";

type Tone = "success" | "error";

interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((message: string, tone: Tone = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass-strong rounded-xl px-4 py-2.5 text-[13px] flex items-center gap-2.5 shadow-2xl animate-toast-in"
          >
            {t.tone === "success" ? (
              <Check size={14} className="text-[var(--teal)] shrink-0" />
            ) : (
              <AlertCircle size={14} className="text-[var(--red)] shrink-0" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Icon button that copies `text` and confirms via toast — used on emails,
 *  AI drafts, anything the user's real workflow is "take this elsewhere". */
export function CopyButton({
  text,
  label = "Copy",
  showLabel = false,
  copiedMessage = "Copied to clipboard",
}: {
  text: string;
  label?: string;
  showLabel?: boolean;
  copiedMessage?: string;
}) {
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast(copiedMessage);
    } catch {
      toast("Couldn't access the clipboard", "error");
    }
  }

  return (
    <button
      onClick={copy}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-lg text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--glass-strong)] transition-colors ${
        showLabel ? "px-2.5 py-1.5 text-[11px] font-medium border border-[var(--glass-border)]" : "p-1.5"
      }`}
    >
      <Copy size={showLabel ? 11 : 12} />
      {showLabel && label}
    </button>
  );
}
