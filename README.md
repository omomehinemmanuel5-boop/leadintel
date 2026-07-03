# leadintel

A production-shaped, **compliant** executive-contact enrichment pipeline for AU, DE, US and CA — built without paid API keys and without touching LinkedIn.

## Why it's built this way

Scraping LinkedIn violates its Terms of Service and has lost in court for scrapers who ignored cease-and-desists. Harvesting personal emails at scale also runs into real regulation in every country this targets: GDPR (Germany), the Privacy Act (Australia), CASL (Canada), and CAN-SPAM (US). This project is designed so those constraints are load-bearing, not an afterthought:

- **Two compliance gates are in the pipeline itself** (`consent_gate`, `suppression_gate`) — not a checklist someone has to remember to run.
- **Name discovery only reads a company's own public disclosures** (about pages, press releases, regulatory filings) — never a third-party platform profile.
- **Verification never sends mail** — it's a DNS/MX check only.
- **Outreach is rate-limited per domain** with a mandatory unsubscribe token on every queued message.

## Pipeline stages

| # | Stage | Type | Status |
|---|-------|------|--------|
| 1 | Company universe | Data source | **Live for US** (SEC EDGAR, no key). AU/DE/CA still demo data — swap in ABR/Unternehmensregister/Corporations Canada |
| 2 | Domain resolution | Heuristic + DNS | **Live** (real DNS lookups; uses SEC's registered website when available) |
| 3 | Name discovery | Data source | Demo data — swap in real page-scraping of target's own site (see TODO for wiring SEC-sourced companies too) |
| — | **Consent gate** | Logic | **Live** (real per-jurisdiction rules, see `consentGate.ts`) |
| 4 | Email pattern inference | Logic | **Live** |
| 5 | Verification | DNS | **Live** (real MX lookups) |
| — | **Suppression gate** | Logic | **Live** (file-based for now) |
| 6 | Outreach queue | Logic | **Live** (rate-limited, unsubscribe tokens) |

Demo mode ships with fictional seed companies/leaders in `data/seed-companies.json` so the whole thing runs end-to-end out of the box. **Do not use the demo data for real outreach** — it's fictional.

## Wiring in real connectors

Each stubbed stage has a `// TODO` marking exactly where to add a live connector, in:

- `src/lib/pipeline/companyUniverse.ts`
- `src/lib/pipeline/nameDiscovery.ts`

Recommended order: start with one country's registry (e.g. SEC EDGAR for US — fully free, no key, no rate limit issues), confirm the shape matches `Company`/`Contact` in `src/lib/types.ts`, then add the rest one at a time.

## Before sending anything real

1. Have counsel review `consentGate.ts`'s per-jurisdiction logic — it's a reasonable starting position, not legal advice.
2. Replace the file-based suppression list (`data/suppression-list.json`) with a real database — flat files don't survive serverless cold starts reliably.
3. Set up SPF/DKIM/DMARC on your sending domain before the outreach queue stage does anything live.

## Local development

```bash
npm install
npm run dev
```

## Deploy

This is a standard Next.js App Router project — deploys to Vercel with zero config.
