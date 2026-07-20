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

Visual language: dark-first "Glass Intelligence" (translucent panels, ambient gradient mesh, command palette via ⌘K with full arrow-key/Enter navigation) per the handbook's UX section. Tables support instant text search on top of the country filters; emails and AI drafts have one-click copy with toast confirmation — the "take this into my email client" step is a click, not a drag-select.

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

## Data providers — Apollo, Google, and source attribution

Every company and contact carries a `provider` field (`sec_edgar`, `apollo`, `google_search`, `demo`, ...) that flows straight into the UI — the Companies, Contacts, and Job Detail tables all show exactly where each record came from, and the Integrations page shows live configuration status (not just a static list).

**Apollo.io** (`APOLLO_API_KEY`) — real name+email database match. Two real API calls under the hood, not a simplification: a free people-search to find a candidate at a company's domain, then a credit-costing enrichment call to reveal the real name and email. Capped at 5 enrichments per run (`APOLLO_MATCH_LIMIT` in `src/lib/providers/apollo.ts`) since that call costs money. Their cheapest plan with API access is ~$59/mo as of writing — factor that in before turning this on for real volume.

**Google Custom Search** (`GOOGLE_API_KEY` + `GOOGLE_CSE_ID`) — free tier, 100 queries/day. Used for two things, both scoped to a company's own domain, never a third-party platform: a domain-resolution fallback when the DNS heuristic fails, and best-effort leadership-name extraction from a company's own About/Leadership page. This is explicitly lower-confidence than Apollo — it's regex over HTML, not a structured match — and is labeled that way everywhere it surfaces.

**Provider priority in name discovery:** Apollo (if configured) → Google (if configured) → demo seed data. Nothing crashes or silently fakes data if a provider isn't configured — the pipeline log says exactly which stage would benefit from a key you haven't added yet (see `/integrations` in the app, or the stage log in any job's detail page).

## Persistence — read this before relying on it

Both stores are durable now — no third-party database needed after all. Both are native Vercel products (Edge Config, Blob), not third-party marketplace integrations, so both were provisioned entirely via API with zero dashboard steps.

**Suppression list** — Vercel Edge Config (`src/lib/suppressionStore.ts`). Reads use a token scoped to only this one store (verified by testing that it genuinely can't write or touch anything else). Writes are a disclosed tradeoff: Edge Config's write API has no scoped-token option, so `EDGE_CONFIG_WRITE_TOKEN` is a full account-level token — broader access than ideal for a runtime secret, accepted anyway for this single-operator tool that's already behind Basic Auth.

**Search jobs, companies, contacts** — Vercel Blob (`src/lib/store.ts`). Kept separate from Edge Config deliberately: Edge Config's 100-writes/month Hobby limit would get exhausted fast by pipeline runs specifically, while Blob's free tier (1GB storage, no restrictive write-count cap) fits this better. The token here (`BLOB_READ_WRITE_TOKEN`) is properly scoped to this one store — a better security posture than the Edge Config write path above.

Worth knowing if you're extending either: the first version of the Blob store used one repeatedly-overwritten URL, and testing directly against the API (not just trusting the docs) caught a real bug — Vercel's CDN caches that URL for up to 30 days regardless of new write headers, and invalidation on overwrite was non-deterministic. Fixed by writing every save to a brand-new timestamped path instead (guaranteed cache miss) and using `list()` to find the latest one, with old snapshots deleted right after each successful write. See the file header comment for the full story if you're debugging something similar.

Both stores share the same known limitation: writes are read-modify-write, which has a small race window under concurrent writers — the last write wins. Fine for a single-operator tool; would need a real transactional database for safe concurrent writes at higher scale.

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
- **Client error handling.** Dashboard, Search Jobs, Companies, Contacts, and AI Research show a real error state with retry instead of hanging on "Loading…" forever if an API call fails.
- **Error boundaries and 404.** Styled `error.tsx` / `global-error.tsx` / `not-found.tsx` — a crash in one view or a stale job link shows a recoverable in-app screen, not Next's unstyled default.
- **Robots policy.** `robots: noindex` is set app-wide — this is a single-operator tool behind Basic Auth and should never appear in a search index even if the auth env vars are misconfigured.

**Done since the above was written:**
- **Persistence.** Both stores are durable via Vercel Blob and Edge Config (native products, provisioned via API — no dashboard step needed after all). See the Persistence section above for the full story, including a real caching bug caught and fixed during testing.

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

