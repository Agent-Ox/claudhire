<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# ShipStacked — repo guidance for coding agents

This file is loaded by Claude Code (via `CLAUDE.md` → `@AGENTS.md`) and by any other coding agent that reads `AGENTS.md` per the [agents.md](https://agents.md) convention. Its job is to give you the build/test commands and the load-bearing invariants of this codebase so you can work here without breaking what previous ships established.

## Quick commands

```bash
# Dev server (Turbopack)
npm run dev

# Production build — also the route-correctness gate before every commit
npm run build

# TypeScript check — also the commit gate (no separate `typecheck` script)
npx tsc --noEmit

# Lint
npm run lint
```

There is no `npm test` script and no test framework configured. Feature correctness is verified by per-feature scripts under `scripts/v2/`, each runnable with Node's TS-strip mode:

```bash
# Beacon 2 mechanized accuracy guarantee — A2A AgentCard, every declared URL probed live
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base http://localhost:3000
node --experimental-strip-types scripts/v2/verify-agent-card.ts --base https://shipstacked.com

# V2 step verifications
node --experimental-strip-types scripts/v2/verify-step-6.ts
node --experimental-strip-types scripts/v2/verify-step-7.ts

# Admin / data scripts (need .env.local for service-role credentials)
node --env-file=.env.local --experimental-strip-types scripts/v2/backfill-entities.ts
node --env-file=.env.local --experimental-strip-types scripts/v2/create-collection.ts <slug> "<display>" "<description>"
node --env-file=.env.local --experimental-strip-types scripts/v2/mint-consent-token.ts <slug> <profile-id>
```

Commit gate (per memory: run before commit, not after): `npx tsc --noEmit` (always) + `npm run build` (when routes change).

## Project layout

```
src/
├── app/                          Next.js 16 App Router routes
│   ├── .well-known/agent-card.json/   A2A AgentCard route handler
│   ├── api/                      REST + content-negotiation projections
│   ├── atlas/                    /atlas long-form + /atlas/roles/[id]
│   ├── collections/[slug]/       Consented Collections HTML route family
│   ├── p/[slug]/                 Proof receipt pages
│   ├── u/[username]/             Builder profile pages
│   ├── feed/                     Build feed (published-gate enforced)
│   ├── jobs/                     Job board
│   ├── llms.txt/                 LLM discovery surface
│   ├── layout.tsx                Root layout — emits Organization JSON-LD site-wide
│   └── page.tsx                  Homepage — emits WebSite JSON-LD
├── lib/
│   ├── agent-card/               A2A AgentCard builder (single source)
│   ├── atlas/                    Atlas role + classification helpers
│   ├── collections/              Consented Collections — assemble, jsonld, csv, consent, tokens
│   ├── jsonld/                   Schema.org markup builders (the canonical writers)
│   ├── paste/                    Paste classifier
│   ├── receipts/                 Proof-receipt assemblers
│   ├── supabase.ts               browser client
│   ├── supabase-server.ts        server client (cookies)
│   └── entities.ts               findOrCreateHumanEntity (post-merge)
├── middleware.ts                 Content-negotiation rewrites (.json/.csv + Accept header)
├── components/                   shared UI
├── services/                     atlas-classifier + paste extractors
└── schemas/                      zod schemas
docs/
├── v2/                           Spec files (V2 build, Tier 0/1, Beacons, Gateway)
├── audit/                        Discovery docs (read-only Phase 1 artifacts)
└── handover/                     Handover documents
scripts/v2/                       Per-feature verify + admin scripts
supabase/migrations/              SQL migrations (applied via Dashboard SQL Editor)
```

## The invariants you must not break

Each invariant cites a code-enforcement location and the spec/discovery doc it traces back to. If you find yourself wanting to violate one, **stop and escalate** — these are load-bearing.

1. **Slug == username for human entities.** For builders backfilled from V1 profiles, `entity.slug` is the verbatim `profile.username` — no slugification, no lowercasing.
   - Code: `scripts/v2/backfill-entities.ts:139-141` (`slug = profile.username`; verbatim equality asserted per row), `src/lib/jsonld/person.ts:123` (`personId(profile.username)`).
   - Source: `docs/v2/TIER_1_MERGE_SPEC.md` §3.4 (line 105 — "slug = profiles.username EXACTLY — not derived, not normalized"); `docs/audit/MERGE_DISCOVERY.md`.

2. **Published-gate fake exclusion is universal.** Every public surface that lists, aggregates, or renders builders MUST filter on `profiles.published = true`. Three test personas have `published=false` and the gate hides them everywhere a single check is enough.
   - Code: `src/lib/collections/assemble.ts:50-66` (4-gate filter chain, comments explain each gate); `src/app/feed/page.tsx:21-27` and `src/app/feed/[id]/page.tsx:16-22,67-76` (inner-join + `.eq('profiles.published', true)`, with `// H9a` provenance comments); `src/app/api/apply/route.ts` (`.eq('status', 'active')` defense-in-depth).
   - Source: Tier 0 `docs/audit/SEED_JOB_TEARDOWN_DISCOVERY.md`; Tier 1 fake-neutralization; Beacon 1 H9a; `docs/audit/GATEWAY_DISCOVERY.md`.

3. **Brand-free.** No partner / program / brand / specific-collection-slug name appears anywhere — not in code, copy, comments, commit messages, tests, seeds, fixtures, or shipped artifacts. Collections are *data*; their slugs are parameters. The code never knows or cares what any collection is for.
   - Mechanized: `scripts/v2/verify-agent-card.ts` `BRAND_ALLOWLIST_FORBIDDEN` array asserts zero matches in the served Beacon 2 body.
   - Source: Consented Collections standing rule; Beacon 2 spec (`docs/v2/TIER_3_BEACON_2_AGENTCARD_SPEC.md`) §3 "Hard constraints". Mechanized verification: `docs/audit/BEACON_2_DISCOVERY.md` §H7.

4. **Migrations apply via the Supabase Dashboard SQL Editor, not from a terminal session.** The terminal cannot apply DDL (no access token, no DB password). Pattern: type-confirm the DDL, hand it to the human to paste into the Dashboard, then verify the applied schema via `information_schema` SELECTs from the terminal. Every DDL ships with a reversal SQL block in the discovery doc and the commit message.
   - Source: Tier 1 H1 (`docs/audit/MERGE_DISCOVERY.md`); Consented Collections H1 (`docs/audit/GATEWAY_DISCOVERY.md`).
   - Files: `supabase/migrations/` carries the canonical SQL of what was applied.

5. **One-source-of-truth markup builders.** Each markup shape has exactly one writer. Downstream callers re-use the writers; they do not re-implement.
   - `src/lib/jsonld/person.ts` is the sole full-graph Person writer for `/u/[username]`. Other modules emit Person *references* (`@id` + `@type` + name + url) — not full nodes.
   - `src/lib/jsonld/organization.ts` is rendered by `src/app/layout.tsx:73` site-wide.
   - `src/lib/jsonld/website.ts` is rendered by `src/app/page.tsx:75` on the homepage only.
   - `src/lib/agent-card/builder.ts` `buildAgentCard()` is the sole A2A AgentCard writer; `src/app/.well-known/agent-card.json/route.ts` is a thin shell.
   - `src/lib/collections/jsonld.ts` + `csv.ts` derive from one `getConsentedCollection(slug)` in `src/lib/collections/assemble.ts` (HTML / JSON-LD / CSV all from one query).
   - Source: Beacon 1 spec; Beacon 2 spec §4.2; `docs/audit/GATEWAY_DISCOVERY.md` §A.

6. **Additive, never subtractive, on existing user-facing surfaces.** When merging new capability into existing pages, do not remove sections, reorder content, or move URLs. New sections render empty-hidden if there's nothing to show.
   - Source: `docs/v2/TIER_1_MERGE_SPEC.md` §0 ("THE MERGE CAN ADD. IT CANNOT SUBTRACT, MOVE, OR BREAK").

7. **Content negotiation: HTML + `.json` + `Accept: application/ld+json` (+ `.csv` for Collections).** The same resource is reachable three (or four) ways. Middleware rewrites `.json` / `.csv` suffix and the Accept header to the underlying API projection.
   - Code: `src/middleware.ts:13-50` (rewrites for `/p/`, `/atlas/roles/`, `/collections/`).
   - `<link rel="alternate" type="application/ld+json">` wiring in `src/app/atlas/roles/[id]/page.tsx:63`, `src/app/p/[slug]/page.tsx:89`.

8. **The `verify-agent-card.ts` accuracy guarantee stays green.** When a new public surface ships, it MUST be added to the AgentCard `skills[]` (`src/lib/agent-card/builder.ts`) AND the verify script must continue to pass against both local and production. The script CURLS every declared URL — a declared endpoint that 404s is a machine-readable lie at the agent front door.
   - Code: `scripts/v2/verify-agent-card.ts`; Beacon 2 commit `f47a347`.

## How this codebase ships (the discovery-first protocol)

Every non-trivial change follows the same shape:

1. **Phase 1 — Discovery (read-only).** Write a discovery doc under `docs/audit/` that enumerates the relevant code, sources each invariant the change might touch, drafts the exact change list as numbered Phase-2 items, and STOPS for human review. No code mutation in Phase 1.
2. **Human approval gate.** The discovery doc's Section H change list is approved explicitly (item-by-item or as a whole) before Phase 2 starts. Verbatim artifacts (DDL, copy, configs) are reviewed word-for-word.
3. **Phase 2 — Execution.** Make the approved changes only. Confirm with `npx tsc --noEmit` clean + `npm run build` clean. Verify regressions on the surfaces previous ships established (a quick spot-check is part of the gate). Show the diff before pushing.
4. **Push + production verification.** After push, poll for prod live, then re-run the relevant mechanized verify (e.g. `verify-agent-card.ts --base https://shipstacked.com`) against PROD. Report the proof.
5. **Reversal path stays on hand.** Code-only changes: `git revert <sha>` is full reversal. DDL changes: a reversal SQL block lives in the discovery doc + the commit message; runs through the same Dashboard SQL Editor.

The protocol exists because earlier in this codebase's history we shipped changes that drifted from their commit messages (one such drift is documented in the next section). The cost of slowing down to write a discovery doc is paid once; the cost of a silent drift is paid by every future agent that trusts the wrong document.

## Drift caveat — what this file does NOT claim

Documentation can drift from live state. To keep this file from becoming one of those drifted documents, it deliberately does NOT make these claims:

- **About the historical "seed-job" state:** the live `/jobs/<id>` behavior is what `src/app/jobs/[id]/page.tsx` says it is (`notFound()` for unknown ids → 404; `permanentRedirect('/jobs')` for non-active rows → 308). Earlier commit messages described soft-delete + 308 for specific historical ids; the rows have since changed state. Trust the code, not the historical message.
- **About specific cohort counts / usernames / collection slugs:** these are data, not invariants. The published-gate, the slug-equals-username rule, the brand-free rule — those are stable. Specific usernames or counts may change; check the DB / the relevant file before relying on them.
- **About the Atlas version number:** the canonical Atlas version is `ATLAS_VERSION_DEFAULT` in `src/lib/atlas/roles.ts`. The value changes; this file cites the constant, not the value.

A separate Tier 4 reconciliation pass will reconcile any remaining commit-message-vs-live-state gaps. Until then, this file stays honest by stating only what is currently verifiable.

## What this file does NOT contain (and why)

This file is at the repo root and the repo is public. Therefore:

- **Zero secrets, zero credentials, zero Supabase keys.** Service-role keys, JWT secrets, webhook signing secrets, and OAuth client secrets live in `.env.local` (gitignored) and in Vercel's encrypted env var store. Nothing here references them.
- **Zero internal strategic context.** No commercial reasoning, no consumer/customer details, no go-to-market context, no partner relationships. This file is operational repo guidance only.
- **Zero partner / program / brand names.** As stated in invariant #3 — the rule applies to *this file* too. Discussing the brand-free rule does not require naming any actual brand.
- **No README rewrite, no CONTRIBUTING.md, no other doc surface.** Just this one file. The specs live in `docs/v2/`; the discovery docs live in `docs/audit/`; the handovers live in `docs/handover/`.

If you need any of the above, ask the human operator — don't infer, don't guess, don't fabricate.
