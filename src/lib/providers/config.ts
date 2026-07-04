/**
 * Central place to check which optional, keyed providers are configured.
 * Every provider in this app is opt-in: if its env vars aren't set, the
 * pipeline silently skips it and falls back to the next thing in the
 * chain (see companyUniverse.ts / nameDiscovery.ts). Nothing breaks by
 * omission — it just means less real data and more demo fallback.
 */

export function hasApollo(): boolean {
  return !!process.env.APOLLO_API_KEY;
}

export function hasGoogle(): boolean {
  return !!(process.env.GOOGLE_API_KEY && process.env.GOOGLE_CSE_ID);
}

export const PROVIDER_LABELS: Record<string, string> = {
  sec_edgar: "SEC EDGAR",
  apollo: "Apollo.io",
  google_search: "Google Search",
  abr: "Australian Business Register",
  demo: "Demo data",
  manual: "Manually added",
};
