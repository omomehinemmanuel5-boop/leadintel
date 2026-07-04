# leadintel

An AI-first B2B intelligence platform — company discovery, contact enrichment, and consent-safe outreach prep for AU, DE, US and CA. Built without paid API keys and without touching LinkedIn.

This is the **Foundation + UI** phase of the roadmap in `docs/PROJECT_VISION.md` / the LeadIntel Engineering Handbook: a real multi-page app with persistence across search jobs, not a single demo screen.

## App structure

| Module | Route | What it does |
|---|---|---|
| Dashboard | `/` | Cross-job overview: totals, recent jobs, contacts by country |
| Search Jobs | `/jobs`, `/jobs/[id]` | Launch a run, inspect stage-by-stage results |
| Companies | `/companies` | Every company discovered, deduplicated, with source + domain |
| Contacts | `/contacts` | Every contact found, with consent/verification/suppression status |
| AI Research | `/ai-research` | Placeholder — honestly scoped, see page for why it's not built yet |
| Analytics | `/analytics` | Stage funnel, consent-basis breakdown, country breakdown |
| Exports | `/exports` | CSV export — "eligible only" vs "raw", never silently mixed |
| Integrations | `/integrations` | Connector status: live / demo / planned / bring-your-own-key |
| Settings | `/settings` | Suppression list management, storage caveats |

Visual language: dark-first "Glass Intelligence" (translucent panels, ambient gradient mesh, command palette via ⌘K) per the handbook's UX section.

## Why it's built this way

Scraping LinkedIn violates its Terms of Service and has lost in court for scrapers who ignored cease-and-desists. Harvesting personal emails at scale also runs into real regulation in every country this targets: GDPR (Germany), the Privacy Act (Australia), CASL (Canada), and CAN-SPAM (US). This project is designed so those constraints are load-bearing, not an afterthought:

- **Two compliance gates are in the pipeline itself** (`consent_gate`, `suppression_gate`) — not a checklist someone has to remember to run.
- **Name discovery only reads a company's own public disclosures** (about pages, press releases, regulatory filings) — never a third-party platform profile.
- **Verification never sends mail** — it's a DNS/MX check only.
- **Outreach exports are split** into "eligible" and "raw" so a real send list can never accidentally include blocked/suppressed contacts.

## Pipeline stages

| # | Stage | Type | Status |
|---|-------|------|--------|
| 1 | Company universe | Data source | **Live for US** (SEC EDGAR, no key). AU/DE/CA still demo data — swap in ABR/Unternehmensregister/Corporations Canada |
| 2 | Domain resolution | Heuristic + DNS | **Live** (real DNS lookups, 3s timeout cap; uses SEC's registered website when available) |
| 3 | Name discovery | Data source | Demo data — swap in real page-scraping of target's own site (see TODO for wiring SEC-sourced companies too) |
| — | **Consent gate** | Logic | **Live** (real per-jurisdiction rules, see `consentGate.ts`) |
| 4 | Email pattern inference | Logic | **Live** |
| 5 | Verification | DNS | **Live** (real MX lookups, 3s timeout cap) |
| — | **Suppression gate** | Logic | **Live** (file-based locally; see Settings page for the production caveat) |
| 6 | Outreach queue | Logic | **Live** (rate-limited, unsubscribe tokens) |

Demo mode ships with fictional seed companies/leaders in `data/seed-companies.json` so the whole thing runs end-to-end out of the box. **Do not use the demo data for real outreach** — it's fictional.

## Persistence — read this before relying on it

Search jobs, companies, and contacts currently live in an in-memory store (`src/lib/store.ts`) scoped to a single warm serverless instance. It resets on redeploy or cold start. This is intentional for the Foundation phase — the shape of every store function is written so swapping in a real database (Volume VI: Infrastructure & Deployment) is a drop-in change, not a rewrite. Vercel Postgres and Supabase both have zero-cost tiers to start with.

The suppression list (`data/suppression-list.json`) is file-based and works locally, but won't persist reliably once deployed — same fix applies.

## Wiring in real connectors

Each stubbed stage has a `// TODO` marking exactly where to add a live connector, in:

- `src/lib/pipeline/companyUniverse.ts` (AU/DE/CA registries)
- `src/lib/pipeline/nameDiscovery.ts` (real leadership-page scraping, incl. for SEC-sourced US companies)

Recommended order: pick one remaining country's registry, confirm the shape matches `Company`/`Contact` in `src/lib/types.ts`, then move to the next.

## Before sending anything real

1. Have counsel review `consentGate.ts`'s per-jurisdiction logic — it's a reasonable starting position, not legal advice.
2. Move the store and suppression list to a real database.
3. Set up SPF/DKIM/DMARC on your sending domain before the outreach queue stage does anything live.

## Production readiness

This section is the honest checklist — what's actually hardened vs. what's the one remaining manual step.

**Done:**
- **Access control.** The entire app is behind HTTP Basic Auth (`src/middleware.ts`), fail-closed if credentials aren't set. Set `ADMIN_USER` / `ADMIN_PASSWORD` — see `.env.example`. `/api/health` is intentionally left open for uptime monitors.
- **Rate limiting.** `/api/pipeline/run` is capped at 5 runs / 5 minutes per client (`src/lib/rateLimit.ts`) — a cost/abuse control given every run makes real external calls (SEC EDGAR, DNS). Documented caveat: it's in-memory per-instance, not a distributed limit — real protection against a determined actor still needs Upstash Redis.
- **Input validation.** Every API route validates its body with `zod` (`src/lib/validation.ts`) instead of trusting client input — malformed requests get a clean 400, not a crash.
- **Security headers.** `next.config.ts` sets X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and a baseline CSP.
- **Tests.** `npm run test` (Vitest) covers the consent gate's per-jurisdiction logic and the outreach queue's eligibility rules — the two places a bug would mean contacting someone who shouldn't be contacted. Run in CI on every push.
- **CI.** `.github/workflows/ci.yml` runs lint, test, and build on every push/PR to `main`.
- **Reliability.** All DNS/fetch calls in the pipeline are parallelized with 3-4s timeout caps (a sequential version measured 17s+ for a 4-country run; parallelized version measured ~4s) — headroom against Vercel's serverless function timeout.
- **Client error handling.** Dashboard, Search Jobs, Companies, and Contacts show a real error state with retry instead of hanging on "Loading…" forever if an API call fails.

**Not done — the one real gap:**
- **Persistence.** Search jobs/companies/contacts are in server memory; the suppression list is a JSON file. Both reset on redeploy/cold start. This needs a real Postgres database, which needs one manual step I can't do headlessly: open the Vercel dashboard → this project → Storage tab → connect a database (Neon's free tier is the zero-cost option, one click). Once that's done, tell me and I'll wire `src/lib/store.ts` and the suppression list over to real queries — the function signatures are already written so that's a swap, not a rewrite.

**Not done — deliberately deferred, not urgent:**
- Real multi-user auth (NextAuth.js) — single shared password is fine until more than one person needs their own login.
- Distributed rate limiting (Upstash) — only matters once the app is under real adversarial load.
- AI Research module — see that page for the reasoning.



```bash
npm install
npm run dev
```

## Deploy

Standard Next.js App Router project — deploys to Vercel with zero config. `maxDuration` is set to 30s on the pipeline route as headroom for multi-country runs.

