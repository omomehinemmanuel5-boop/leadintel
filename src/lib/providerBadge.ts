export const PROVIDER_BADGE: Record<string, { label: string; tone: "teal" | "violet" | "blue" | "amber" | "neutral" }> = {
  sec_edgar: { label: "SEC EDGAR", tone: "teal" },
  sec_proxy: { label: "SEC Proxy Filing", tone: "teal" },
  apollo: { label: "Apollo.io", tone: "violet" },
  google_search: { label: "Google Search", tone: "blue" },
  serper: { label: "Serper Search", tone: "blue" },
  abr: { label: "ABR", tone: "teal" },
  corporations_canada: { label: "Corporations Canada", tone: "teal" },
  demo: { label: "Demo data", tone: "amber" },
  manual: { label: "Manual", tone: "neutral" },
};

export function providerBadge(provider?: string) {
  return PROVIDER_BADGE[provider ?? ""] ?? { label: provider ?? "Unknown", tone: "neutral" as const };
}
