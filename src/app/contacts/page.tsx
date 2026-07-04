"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Badge, EmptyState, ErrorBanner } from "@/components/ui";
import { providerBadge } from "@/lib/providerBadge";
import { Users, Download } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  title: string;
  country: string;
  email?: string;
  emailConfidence?: number;
  emailSource?: string;
  verified?: boolean;
  consentBasis?: string;
  suppressed?: boolean;
  discoverySource: string;
  provider: string;
}

const FLAGS: Record<string, string> = { AU: "🇦🇺", DE: "🇩🇪", US: "🇺🇸", CA: "🇨🇦" };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [country, setCountry] = useState("ALL");
  const [onlyEligible, setOnlyEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/contacts")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load contacts (${r.status})`);
        return r.json();
      })
      .then((d) => setContacts(d.contacts))
      .catch((e) => setError(e.message || "Failed to load contacts."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    load();
  }, []);

  const countries = Array.from(new Set(contacts.map((c) => c.country)));

  const visible = useMemo(() => {
    return contacts.filter((c) => {
      if (country !== "ALL" && c.country !== country) return false;
      if (onlyEligible) {
        const eligible =
          c.email && c.verified && !c.suppressed && c.consentBasis !== "requires_optin" && c.consentBasis !== "blocked";
        if (!eligible) return false;
      }
      return true;
    });
  }, [contacts, country, onlyEligible]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <PageHeader
        eyebrow={`${contacts.length} found`}
        title="Contacts"
        description="Every leader discovered, with the consent basis and verification status that decides whether they can be contacted."
        action={
          <a
            href="/api/export/contacts"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass glass-hover text-sm font-medium shrink-0"
          >
            <Download size={14} />
            Export eligible (CSV)
          </a>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      {!loading && !error && contacts.length === 0 ? (
        <EmptyState icon={Users} title="No contacts yet" description="Run a search job to populate this view." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <button
              onClick={() => setCountry("ALL")}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                country === "ALL"
                  ? "border-[var(--teal-border)] bg-[var(--teal-dim)] text-[var(--teal)]"
                  : "border-[var(--glass-border)] text-[var(--ink-dim)]"
              }`}
            >
              All countries
            </button>
            {countries.map((c) => (
              <button
                key={c}
                onClick={() => setCountry(c)}
                className={`px-3 py-1.5 rounded-full text-xs border flex items-center gap-1.5 ${
                  country === c
                    ? "border-[var(--teal-border)] bg-[var(--teal-dim)] text-[var(--teal)]"
                    : "border-[var(--glass-border)] text-[var(--ink-dim)]"
                }`}
              >
                {FLAGS[c]} {c}
              </button>
            ))}
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-[var(--glass-border)] text-[var(--ink-dim)] cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={onlyEligible}
                onChange={(e) => setOnlyEligible(e.target.checked)}
                className="accent-[var(--teal)]"
              />
              Outreach-eligible only
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl glass">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[var(--ink-dim)] mono text-[10.5px] uppercase tracking-wide border-b border-[var(--glass-border)]">
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Country</th>
                  <th className="px-3 py-2.5">Source</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Consent</th>
                  <th className="px-3 py-2.5">Verified</th>
                  <th className="px-3 py-2.5">Suppressed</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--glass-border)] last:border-0">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-[var(--ink-dim)] text-[11px]">{c.title}</div>
                    </td>
                    <td className="px-3 py-2.5">{FLAGS[c.country]} {c.country}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={providerBadge(c.provider).tone}>{providerBadge(c.provider).label}</Badge>
                    </td>
                    <td className="px-3 py-2.5 mono text-[11.5px]">
                      {c.email ?? "—"}
                      {c.emailConfidence !== undefined && (
                        <div className="text-[10px] text-[var(--ink-faint)]">
                          {Math.round(c.emailConfidence * 100)}% pattern confidence
                        </div>
                      )}
                      {c.emailSource === "apollo" && (
                        <div className="text-[10px] text-[var(--violet)]">direct from Apollo</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={c.consentBasis === "requires_optin" || c.consentBasis === "blocked" ? "red" : "teal"}>
                        {c.consentBasis ?? "pending"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">{c.verified ? "✅" : "—"}</td>
                    <td className="px-3 py-2.5">{c.suppressed ? "🚫" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
