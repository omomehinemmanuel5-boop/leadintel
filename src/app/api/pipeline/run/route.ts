import { NextRequest, NextResponse } from "next/server";
import { Country, PipelineRun, StageId, STAGE_ORDER } from "@/lib/types";
import { getCompanyUniverse } from "@/lib/pipeline/companyUniverse";
import { resolveDomains } from "@/lib/pipeline/domainResolution";
import { discoverNames } from "@/lib/pipeline/nameDiscovery";
import { runConsentGate } from "@/lib/pipeline/consentGate";
import { inferEmailPatterns } from "@/lib/pipeline/emailPattern";
import { verifyContacts } from "@/lib/pipeline/verification";
import { runSuppressionGate } from "@/lib/pipeline/suppressionGate";
import { buildOutreachQueue } from "@/lib/pipeline/outreachQueue";

export const runtime = "nodejs";

function emptyStage(stage: StageId) {
  return {
    stage,
    status: "idle" as const,
    startedAt: new Date().toISOString(),
    input: 0,
    output: 0,
    blocked: 0,
    log: [] as string[],
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const countries: Country[] = body.countries?.length ? body.countries : ["AU", "DE", "US", "CA"];

  const stages: PipelineRun["stages"] = Object.fromEntries(
    STAGE_ORDER.map((s) => [s, emptyStage(s)])
  ) as PipelineRun["stages"];

  const finish = (stage: StageId, input: number, output: number, blocked: number, log: string[]) => {
    stages[stage] = {
      stage,
      status: "done",
      startedAt: stages[stage].startedAt,
      finishedAt: new Date().toISOString(),
      input,
      output,
      blocked,
      log,
    };
  };

  // 1. Company universe
  const { companies: rawCompanies, log: log1 } = await getCompanyUniverse(countries);
  finish("company_universe", countries.length, rawCompanies.length, 0, log1);

  // 2. Domain resolution
  const { companies, log: log2 } = await resolveDomains(rawCompanies);
  finish("domain_resolution", rawCompanies.length, companies.filter((c) => c.domain).length, 0, log2);

  // 3. Name discovery
  const { contacts: namedContacts, log: log3 } = await discoverNames(companies);
  finish("name_discovery", companies.length, namedContacts.length, 0, log3);

  // Gate: consent classification
  const { contacts: consentedContacts, log: log4, blocked: blocked4 } = runConsentGate(namedContacts);
  finish("consent_gate", namedContacts.length, consentedContacts.length - blocked4, blocked4, log4);

  // 4. Email pattern inference
  const { contacts: withEmails, log: log5 } = inferEmailPatterns(consentedContacts, companies);
  finish("email_pattern", consentedContacts.length, withEmails.filter((c) => c.email).length, 0, log5);

  // 5. Verification
  const { contacts: verified, log: log6 } = await verifyContacts(withEmails);
  finish("verification", withEmails.length, verified.filter((c) => c.verified).length, 0, log6);

  // Gate: suppression check
  const { contacts: suppressionChecked, log: log7, blocked: blocked7 } = runSuppressionGate(verified);
  finish("suppression_gate", verified.length, suppressionChecked.length - blocked7, blocked7, log7);

  // 6. Outreach queue
  const { queue, log: log8, excluded } = buildOutreachQueue(suppressionChecked);
  finish("outreach_queue", suppressionChecked.length, queue.length, excluded, log8);

  const run: PipelineRun = {
    id: `run_${Date.now()}`,
    createdAt: new Date().toISOString(),
    countries,
    stages,
    contacts: suppressionChecked,
  };

  return NextResponse.json({ run, queue });
}
