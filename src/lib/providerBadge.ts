export const PROVIDER_BADGE: Record<string, { label: string; tone: "teal" | "violet" | "blue" | "amber" | "neutral" }> = {
  sec_edgar: { label: "SEC EDGAR", tone: "teal" },
  apollo: { label: "Apollo.io", tone: "violet" },
  google_search: { label: "Google Search", tone: "blue" },
  abr: { label: "ABR", tone: "teal" },
  demo: { label: "Demo data", tone: "amber" },
  manual: { label: "Manual", tone: "neutral" },
};

export function providerBadge(provider?: string) {
  return PROVIDER_BADGE[provider ?? ""] ?? { label: provider ?? "Unknown", tone: "neutral" as const };
}
