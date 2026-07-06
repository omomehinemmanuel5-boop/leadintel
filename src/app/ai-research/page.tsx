"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, EmptyState, ErrorBanner } from "@/components/ui";
import { providerBadge } from "@/lib/providerBadge";
import { Sparkles, FileText, Target, MessageSquare, Wand2, Loader2, Mail } from "lucide-react";

interface Company {
  id: string;
  name: string;
  country: string;
  domain?: string;
  provider: string;
}

interface Contact {
  id: string;
  companyId: string;
  name: string;
  title: string;
  email?: string;
  provider: string;
  consentBasis?: string;
  suppressed?: boolean;
  verified?: boolean;
}

const FLAGS: Record<string, string> = { AU: "🇦🇺", DE: "🇩🇪", US: "🇺🇸", CA: "🇨🇦" };

const PLANNED = [
  { icon: FileText, title: "Company summaries", desc: "Live now — grounded strictly in verified pipeline data." },
  { icon: Target, title: "Lead scoring", desc: "Not built yet — needs more volume to rank against." },
  { icon: MessageSquare, title: "Search assistance", desc: "Not built yet." },
  { icon: Wand2, title: "Outreach drafting", desc: "Live now — inherits the same consent/suppression gates." },
];

export default function AIResearchPage() {
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [valueProp, setValueProp] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loadingDraft, setLoadingDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/ai/status").then((r) => r.json()),
      fetch("/api/companies").then((r) => r.json()),
      fetch("/api/contacts").then((r) => r.json()),
    ]).then(([status, c, ct]) => {
      setAiOn(!!status.activeProvider);
      setModel(status.model);
      setActiveProvider(status.activeProvider);
      setCompanies(c.companies);
      setContacts(ct.contacts);
    });
  }, []);

  async function generateSummary(companyId: string) {
    setLoadingSummary(companyId);
    setError(null);
    try {
      const res = await fetch("/api/ai/company-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate summary");
      setSummaries((prev) => ({ ...prev, [companyId]: data.summary }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate summary");
    } finally {
      setLoadingSummary(null);
    }
  }

  async function generateDraft(contactId: string) {
    if (!productName.trim() || !valueProp.trim()) {
      setError("Fill in product name and value proposition first.");
      return;
    }
    setLoadingDraft(contactId);
    setError(null);
    try {
      const res = await fetch("/api/ai/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, productName, valueProposition: valueProp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to draft email");
      setDraft((prev) => ({ ...prev, [contactId]: data.draft }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to draft email");
    } finally {
      setLoadingDraft(null);
    }
  }

  if (aiOn === false) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <PageHeader
          eyebrow="Volume V · AI Systems"
          title="AI Research"
          description="Not configured yet — set GEMINI_API_KEY to activate company summaries and outreach drafting."
        />
        <div className="glass rounded-2xl p-6 mb-6 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--teal-dim)] to-[var(--violet-dim)] flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-[var(--violet)]" />
          </div>
          <div>
            <div className="font-semibold text-sm mb-1">Grounded in real data, not vibes</div>
            <p className="text-xs text-[var(--ink-dim)] leading-relaxed">
              Every prompt this module sends is built entirely from facts already verified elsewhere in
              the pipeline — company registry data, discovered leader names, consent status. It will not
              invent industry, size, or personal details that aren&apos;t already known.
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {PLANNED.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="glass rounded-2xl p-5">
                <div className="w-9 h-9 rounded-lg bg-[var(--glass-strong)] flex items-center justify-center mb-3">
                  <Icon size={16} className="text-[var(--teal)]" />
                </div>
                <div className="font-semibold text-sm mb-1">{item.title}</div>
                <p className="text-xs text-[var(--ink-dim)] leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <PageHeader
        eyebrow={model ? `Powered by ${activeProvider === "groq" ? "Groq" : "Gemini"} · ${model}` : "AI Research"}
        title="AI Research"
        description="Company summaries and outreach drafts, grounded strictly in verified pipeline data — nothing invented."
        action={<Badge tone="violet">{activeProvider === "groq" ? "Groq" : "Gemini"} connected</Badge>}
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="glass rounded-2xl p-5 mb-6">
        <div className="mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-dim)] mb-3">
          Outreach context (used for drafts below)
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Your product name"
            className="bg-[var(--glass-strong)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--violet-border)] placeholder:text-[var(--ink-faint)]"
          />
          <input
            value={valueProp}
            onChange={(e) => setValueProp(e.target.value)}
            placeholder="One-line value proposition"
            className="bg-[var(--glass-strong)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--violet-border)] placeholder:text-[var(--ink-faint)]"
          />
        </div>
      </div>

      {companies.length === 0 ? (
        <EmptyState icon={Sparkles} title="No companies yet" description="Run a search job first." />
      ) : (
        <div className="space-y-3">
          {companies.map((company) => {
            const contact = contacts.find((c) => c.companyId === company.id);
            const blocked = contact && (contact.suppressed || contact.consentBasis === "requires_optin" || contact.consentBasis === "blocked");
            return (
              <div key={company.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {FLAGS[company.country]} {company.name}
                    </div>
                    {contact && (
                      <div className="text-xs text-[var(--ink-dim)] mt-0.5">
                        {contact.name} · {contact.title}
                      </div>
                    )}
                  </div>
                  <Badge tone={providerBadge(company.provider).tone}>{providerBadge(company.provider).label}</Badge>
                </div>

                {summaries[company.id] ? (
                  <p className="text-sm text-[var(--ink)] leading-relaxed bg-[var(--glass-strong)] rounded-lg p-3 mt-2">
                    {summaries[company.id]}
                  </p>
                ) : (
                  <button
                    onClick={() => generateSummary(company.id)}
                    disabled={loadingSummary === company.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass glass-hover text-xs font-medium mt-1"
                  >
                    {loadingSummary === company.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Generate summary
                  </button>
                )}

                {contact?.email && !blocked && (
                  <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
                    {draft[contact.id] ? (
                      <div className="text-sm bg-[var(--glass-strong)] rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                        {draft[contact.id]}
                      </div>
                    ) : (
                      <button
                        onClick={() => generateDraft(contact.id)}
                        disabled={loadingDraft === contact.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--violet-dim)] border border-[var(--violet-border)] text-[var(--violet)] text-xs font-medium"
                      >
                        {loadingDraft === contact.id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                        Draft outreach email
                      </button>
                    )}
                  </div>
                )}

                {blocked && (
                  <div className="mt-3 pt-3 border-t border-[var(--glass-border)] text-[11px] text-[var(--red)]">
                    Outreach drafting blocked — this contact failed consent or suppression checks.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
