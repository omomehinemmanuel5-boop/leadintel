export type Country = "AU" | "DE" | "US" | "CA";

export type StageId =
  | "company_universe"
  | "domain_resolution"
  | "name_discovery"
  | "consent_gate"
  | "email_pattern"
  | "verification"
  | "suppression_gate"
  | "outreach_queue";

export type StageStatus = "idle" | "running" | "done" | "error" | "blocked";

export type Provider = "sec_edgar" | "sec_proxy" | "apollo" | "google_search" | "serper" | "abr" | "corporations_canada" | "demo" | "manual";

export interface Company {
  id: string;
  name: string;
  country: Country;
  registryId?: string; // e.g. ABN, EIN, HRB number
  domain?: string;
  source: string; // human-readable detail, e.g. "SEC EDGAR company_tickers.json"
  provider: Provider; // canonical id for UI badges/filtering
}

export type ConsentBasis =
  | "public_interest_b2b" // e.g. AU/CA implied business relationship
  | "legitimate_interest_gdpr" // DE/EU Art. 6(1)(f) — narrow, needs review
  | "requires_optin" // no valid basis found yet, must not contact
  | "blocked";

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  title: string; // e.g. "CEO", "Founder"
  country: Country;
  discoverySource: string; // human-readable detail, e.g. "company /about page"
  provider: Provider; // canonical id for UI badges/filtering — who found this person
  email?: string;
  emailSource?: "inferred" | "apollo"; // was the email guessed, or supplied directly by a provider?
  emailPattern?: string;
  emailConfidence?: number; // 0-1
  verified?: boolean;
  consentBasis?: ConsentBasis;
  consentNotes?: string;
  suppressed?: boolean;
  suppressionReason?: string;
  stage: StageId;
}

export interface StageResult {
  stage: StageId;
  status: StageStatus;
  startedAt: string;
  finishedAt?: string;
  input: number;
  output: number;
  blocked: number;
  log: string[];
}

export interface PipelineRun {
  id: string;
  createdAt: string;
  countries: Country[];
  stages: Record<StageId, StageResult>;
  contacts: Contact[];
  companies?: Company[];
}

export const STAGE_ORDER: StageId[] = [
  "company_universe",
  "domain_resolution",
  "name_discovery",
  "consent_gate",
  "email_pattern",
  "verification",
  "suppression_gate",
  "outreach_queue",
];

export const STAGE_LABELS: Record<StageId, string> = {
  company_universe: "Company universe",
  domain_resolution: "Domain resolution",
  name_discovery: "Name discovery",
  consent_gate: "Consent classification (gate)",
  email_pattern: "Email pattern inference",
  verification: "Verification",
  suppression_gate: "Suppression check (gate)",
  outreach_queue: "Outreach queue",
};

export const GATE_STAGES: StageId[] = ["consent_gate", "suppression_gate"];
