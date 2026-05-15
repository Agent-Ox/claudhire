# ShipStacked V2 — Phase 1A Build Spec

**For:** Claude Code, executing in `shipstacked` repo
**Scope:** Steps 1–7 of the V2 spine (DB schema → public receipt pages)
**Atlas foundation:** v0.4 (live in production as of commit 3ce240e)
**Date:** 2026-05-15
**Status:** Locked. Do not re-litigate strategic decisions in this doc.

---

## 0. Hard Constraints — Read Before Anything Else

These are non-negotiable. If a design choice you're about to make violates one of these, stop and flag.

1. **One URL → one receipt.** Phase 1A accepts ONE pasted URL and produces ONE proof receipt. No account imports. No OAuth. No "connect everything." No bulk ingest. The paste flow stays brutally simple.
2. **Receipts first, profile migration second.** Build the receipt system underneath the current product. Do NOT replace the existing builder profile UI in Phase 1A. Routes `/`, `/talent`, `/feed`, `/leaderboard` keep working unchanged.
3. **JSON-LD + canonical Atlas role refs ship in Phase 1A.** This is the standards/moat layer, not polish. Every receipt page must serve JSON-LD via content negotiation from day one. Every Atlas role reference must be a dereferenceable URL.
4. **Constitutional rule.** Every monetizable interaction must strengthen the graph. Do not build anything in Phase 1A that does not produce, aggregate, distribute, or verify proof receipts.
5. **Do not break live revenue.** The `/hire` intake at `$199/mo` stays live and unchanged. Do not touch `INTAKE_NOTIFY_EMAIL`, Resend DKIM, or SES records on `send.shipstacked.com`.

---

## 1. Atomic Primitive — Locked

A ShipStacked **profile is not the product**. A profile is an index of proof receipts.

The proof receipt is the atomic primitive. Schema is locked at `proof-receipt-v0.1.ts` (hand-off file). Everything else — operator profile, capability graph, ranking, trust score, economic memory — is derived aggregation over proof receipts.

Reference schema: `proof-receipt-v0.1.ts`

---

## 2. Phase 1A Scope — Steps 1–7

| # | Deliverable | Touches |
|---|---|---|
| 1 | DB schema: `proof_receipts`, `entities`, `verification_events`, `attestations`, `atlas_roles_v03`, `capabilities_vocab`, `ingestion_log` | Supabase migrations |
| 2 | `POST /api/paste/classify` — URL → source detection + cached fetch | API route + service |
| 3 | `POST /api/paste/analyze` — Platform extractors (GitHub, Lovable, Bolt, v0, Replit, generic) | Service |
| 4 | Atlas Classifier service — Claude-powered, versioned, returns `inferred[]` + confidence | Service |
| 5 | `/paste` and `/paste/review` screens | Next.js routes |
| 6 | `POST /api/paste/publish` — commit receipt, slug, OG card, JSON-LD endpoint | API route |
| 7 | `/p/[slug]` public page with verification ladder visible | Next.js route + JSON-LD content negotiation |

**Out of scope for Phase 1A:**
- GitHub auto-sync (Step 8+)
- MCP server (Step 11)
- Profile rebuild as index-of-receipts (Step 10)
- L4 cryptographic signing (schema supports, UI ships later)
- L3 attestation UI (schema + API endpoint OK; full flow is Phase 1B)

---

## 3. Step 1 — Database Schema

### 3.1 Tables (Supabase / Postgres)

Create migration `001_proof_receipts_v0.1.sql`. All tables use `bigint` PKs internally; external IDs use ULID strings.

```sql
-- ────────────────────────────────────────────────────────────────
-- entities: humans, operators, fleets, agents
-- ────────────────────────────────────────────────────────────────
create table entities (
  id              bigserial primary key,
  external_id     text unique not null,   -- shipstacked:entity:<ulid>
  kind            text not null check (kind in ('human','operator','fleet','agent')),
  display_name    text not null,
  slug            text unique not null,   -- /u/<slug>
  owner_user_id   uuid references auth.users(id), -- nullable for unclaimed entities
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_entities_slug on entities(slug);
create index idx_entities_owner on entities(owner_user_id) where owner_user_id is not null;

-- ────────────────────────────────────────────────────────────────
-- atlas_roles: canonical role taxonomy, dereferenceable, versioned
-- ────────────────────────────────────────────────────────────────
-- One row per (role_id, atlas_version). Receipts reference both.
-- v0.4 ships first (the current live Atlas). v0.3 rows also seeded
-- for historical receipts that may reference them.
-- Cluster G is ACTIVE in v0.4 (domain-practitioners G1-G6).
-- Cluster H+ reserved for future expansion (requires AtlasRoleId
-- regex update + schema_version bump).
create table atlas_roles (
  role_id         text not null,           -- "A1", "F3", "C2", "G1" (v0.4)
  atlas_version   text not null,           -- "v0.3", "v0.4"
  cluster         text not null,           -- "A".."G"
  name            text not null,
  short_description text not null,
  long_description_md text,                -- markdown for /atlas/roles/<id> page
  automation_trajectory text check (automation_trajectory in ('resistant','partial','collapsible')),

  -- v0.4 fields (populated where confident in v0.4; null where flagged as gap)
  isco_08_code        text,
  soc_2018_code       text,
  onet_code           text,
  crosswalk_status    text,                -- 'confident', 'partial', 'gap', 'combined'
  eu_ai_act_articles  text[],
  iso_42001_sections  text[],

  created_at      timestamptz not null default now(),
  primary key (role_id, atlas_version)
);

create index idx_atlas_roles_version on atlas_roles(atlas_version);
create index idx_atlas_roles_cluster on atlas_roles(atlas_version, cluster);

-- Seed both v0.3 AND v0.4 from src/content/atlas-v03.md and atlas-v04.md
-- at migration time. v0.4 is the active taxonomy; v0.3 retained for
-- archived receipt references. IDs are stable across versions where the
-- role meaning didn't change.

-- ────────────────────────────────────────────────────────────────
-- proof_receipts: THE atomic primitive
-- ────────────────────────────────────────────────────────────────
create table proof_receipts (
  id              bigserial primary key,
  external_id     text unique not null,    -- shipstacked:proof:<ulid>
  slug            text unique not null,    -- /p/<slug>

  schema_version  text not null default '0.1',
  atlas_version   text not null default 'v0.3',

  subject_id      bigint not null references entities(id),
  on_behalf_of_id bigint references entities(id),

  event_type      text not null,
  event_subtype   text,                    -- free text, harvested for v0.2

  title           text not null,
  description     text not null,
  occurred_at     timestamptz not null,
  occurred_at_precision text not null check (occurred_at_precision in ('day','month','quarter','year')),
  duration_seconds integer,

  -- artifacts, stack, outcomes stored as jsonb (validated by zod in app layer)
  artifacts       jsonb not null,          -- Artifact[]
  stack           jsonb not null default '[]'::jsonb,
  outcomes        jsonb not null default '[]'::jsonb,
  capabilities    text[] not null default '{}',

  -- Atlas classification — multi-source
  atlas_claimed   text[] not null default '{}',
  atlas_inferred  text[] not null default '{}',
  atlas_confirmed text[] not null default '{}',
  atlas_confidence numeric(3,2) not null default 0.0 check (atlas_confidence >= 0 and atlas_confidence <= 1),
  classifier_version text not null,
  classified_at   timestamptz not null,

  verification_level text not null default 'L1_artifact_confirmed',

  visibility      text not null default 'public' check (visibility in ('public','unlisted','private')),
  ingestion_source text not null,
  ingestion_metadata jsonb not null default '{}'::jsonb,

  issued_at       timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_receipts_subject on proof_receipts(subject_id);
create index idx_receipts_event_type on proof_receipts(event_type);
create index idx_receipts_visibility on proof_receipts(visibility) where visibility = 'public';
create index idx_receipts_atlas_confirmed on proof_receipts using gin(atlas_confirmed);
create index idx_receipts_capabilities on proof_receipts using gin(capabilities);
create index idx_receipts_issued_at on proof_receipts(issued_at desc);

-- ────────────────────────────────────────────────────────────────
-- verification_events: APPEND-ONLY ladder log
-- ────────────────────────────────────────────────────────────────
create table verification_events (
  id              bigserial primary key,
  receipt_id      bigint not null references proof_receipts(id) on delete cascade,
  level           text not null,
  achieved_at     timestamptz not null default now(),
  method          text not null,           -- "url_fetch", "github_api", "client_signature", "did_web"
  evidence        jsonb not null default '{}'::jsonb
);

create index idx_verification_receipt on verification_events(receipt_id);

-- This table is APPEND-ONLY. Do not UPDATE or DELETE rows in app code.
-- The current verification_level on proof_receipts is denormalized for queries;
-- this log is the canonical history.

-- ────────────────────────────────────────────────────────────────
-- attestations: L3+ third-party signatures
-- ────────────────────────────────────────────────────────────────
create table attestations (
  id              bigserial primary key,
  receipt_id      bigint not null references proof_receipts(id) on delete cascade,
  attestor_id     bigint not null references entities(id),
  attestor_role   text not null check (attestor_role in ('client','employer','peer','platform')),
  statement       text not null,
  signed_at       timestamptz not null default now(),
  signature       text,                    -- L4 only
  signature_method text                    -- e.g. "did:web", "did:key"
);

create index idx_attestations_receipt on attestations(receipt_id);

-- ────────────────────────────────────────────────────────────────
-- capabilities_vocab: harvested controlled vocabulary
-- ────────────────────────────────────────────────────────────────
create table capabilities_vocab (
  tag             text primary key,
  first_seen_at   timestamptz not null default now(),
  receipt_count   integer not null default 0,
  promoted        boolean not null default false  -- canonical vs harvested
);

-- Populated by trigger or batch job from proof_receipts.capabilities[].
-- Used by /api/search and tag autocomplete.

-- ────────────────────────────────────────────────────────────────
-- ingestion_log: provenance, debugging, channel analytics
-- ────────────────────────────────────────────────────────────────
create table ingestion_log (
  id              bigserial primary key,
  receipt_id      bigint references proof_receipts(id) on delete set null,
  source          text not null,
  source_url      text,
  request_id      text,                    -- correlate with API logs
  status          text not null,           -- "classified", "analyzed", "published", "failed"
  error           text,
  created_at      timestamptz not null default now()
);

create index idx_ingestion_source on ingestion_log(source, created_at desc);
```

### 3.2 Row Level Security

- `proof_receipts`: public read where `visibility = 'public'`; write only by subject owner or admin.
- `entities`: public read; write only by owner or admin.
- `atlas_roles`: public read; write admin only.
- `verification_events`, `attestations`, `ingestion_log`: server-only writes via service role.

### 3.3 Seed data

Seed `atlas_roles` from both `src/content/atlas-v04.md` (with `atlas_version = 'v0.4'`) AND `src/content/atlas-v03.md` (with `atlas_version = 'v0.4'` for any rows where v0.4 didn't change meaning, plus `atlas_version = 'v0.3'` for archival). Write `scripts/seed-atlas-roles.ts` to parse both markdown files. v0.4 is the active taxonomy and the default for new receipts. Script must be idempotent — safe to re-run. Parse Part VII (Cluster G) roles G1-G6 from v0.4 into the same `atlas_roles` table. Where v0.4 adds crosswalks (ISCO/SOC/O*NET) or EU AI Act mappings, populate those columns; where v0.4 says `crosswalk: gap`, leave the corresponding columns NULL and set `crosswalk_status = 'gap'`.

---

## 4. Step 2 — URL Classifier

`POST /api/paste/classify`

### 4.1 Contract

```typescript
// Request
{ url: string }

// Response
{
  source: 'github' | 'lovable' | 'bolt' | 'v0' | 'replit'
        | 'vercel' | 'netlify' | 'mcp_server' | 'generic';
  reachable: boolean;
  http_status: number;
  metadata: {
    title?: string;
    description?: string;
    og_image?: string;
    favicon?: string;
  };
  event_type_candidate: EventType;  // best guess, user can override
  cache_hit: boolean;
}
```

### 4.2 Logic

1. Validate URL (must be `https://`, must not be in our own domain to prevent self-import loops).
2. Check cache (24h TTL keyed by normalized URL). Return cached result with `cache_hit: true` if present.
3. Detect source by hostname pattern:
   - `github.com/{owner}/{repo}` → `github`
   - `*.lovable.app`, `lovable.dev/projects/*` → `lovable`
   - `*.bolt.new`, `bolt.new/~/*` → `bolt`
   - `v0.app/chat/*`, `*.vercel.app` from v0 fingerprints → `v0`
   - `replit.com/@*/*`, `*.replit.app` → `replit`
   - `*.vercel.app`, `*.netlify.app` → `vercel` / `netlify` (lower confidence)
   - MCP server: any URL serving JSON at `/.well-known/mcp` or returning MCP protocol headers → `mcp_server`
   - Else → `generic`
4. Fetch the URL with a 5s timeout, User-Agent: `ShipStacked-Classifier/0.1`. Capture status, basic OG metadata.
5. Map source + metadata → `event_type_candidate`:
   - `github` → `published_repo`
   - `lovable`, `bolt`, `v0`, `replit`, `vercel`, `netlify` → `shipped_app`
   - `mcp_server` → `deployed_mcp_server`
   - `generic` → `shipped_site` (user can change in review step)
6. Cache and return.

### 4.3 Error handling

- Unreachable URL: return with `reachable: false`, `http_status: 0`, classifier still returns a source guess from hostname. Do NOT fail the request — the user can still publish at L0_claimed.
- Robots/captchas: do not bypass. Treat as unreachable for this URL.
- Rate limiting: 30 requests/min per IP, 200/min globally. Return 429 with retry-after.

---

## 5. Step 3 — Artifact Analyzer

`POST /api/paste/analyze`

### 5.1 Contract

```typescript
// Request
{
  url: string;
  source: ClassifierSource;     // from /api/paste/classify
  metadata: ClassifierMetadata;
}

// Response
{
  artifacts: Artifact[];        // primary URL + any auto-discovered secondary artifacts
  stack: StackElement[];
  outcomes_suggestions: Outcome[];   // best-guess, user reviews
  capabilities: string[];
  description_draft: string;    // markdown, user edits in review step
  title_draft: string;
}
```

### 5.2 Per-source extractors

Each extractor is its own module under `src/services/extractors/`:

- `github.ts` — Uses public GitHub REST API (no auth in Phase 1A, accept 60 req/hr unauthenticated limit; if rate-limited, fall back to HTML scrape of README). Extract: README text, top languages, `package.json` / `requirements.txt` for stack, presence of `CLAUDE.md` / `.cursorrules` / `mcp.json` / `langgraph.json` as AI-stack signals, primary deployment URL from README.
- `lovable.ts` — Fetch OG metadata, extract project name and screenshot, infer stack from page DOM (React + Tailwind by default).
- `bolt.ts` — Fetch StackBlitz project metadata via their public JSON endpoint, extract framework, primary preview URL.
- `v0.ts` — Fetch OG metadata, extract component name, infer Vercel deployment URL.
- `replit.ts` — Fetch project page, extract language and primary URL.
- `vercel_netlify.ts` — Fetch OG metadata, detect framework from headers/HTML signals.
- `mcp_server.ts` — Fetch `/.well-known/mcp` or initial handshake response, extract server name, exposed tools list with their schemas. **Important: this is the receipt that closes the loop — ShipStacked introspecting an MCP server is self-aware infrastructure.**
- `generic.ts` — OG metadata only. Minimum viable for L1.

### 5.3 Stack detection

Run a small classifier (regex + dictionary lookup) over extracted metadata + README content. Vocabulary file: `src/config/stack-vocab.json` with categories `model` (claude-*, gpt-*, gemini-*, llama-*), `framework` (langgraph, langchain, llamaindex, crewai, mastra, ag2), `infra` (supabase, vercel, neon, planetscale, fly.io, modal), etc. Output structured `StackElement[]`.

### 5.4 Capabilities extraction

Lightweight LLM call (Claude Haiku) over extracted text. Prompt:

```
Given the following project artifact:
{description + README excerpt + stack}

List 3-8 capability tags this work demonstrates. Use kebab-case.
Examples: "rag-pipeline", "vector-search", "agent-orchestration",
"compliance-automation", "data-extraction", "workflow-automation".

Return JSON: { "capabilities": ["..."] }
```

These get harvested into `capabilities_vocab` over time.

---

## 6. Step 4 — Atlas Classifier

### 6.1 Service interface

```typescript
// src/services/atlas-classifier.ts
export interface AtlasClassifierResult {
  inferred: string[];           // Atlas role IDs
  confidence: number;           // 0.0–1.0
  reasoning: string;            // short explanation, shown in UI
  classifier_version: string;   // e.g. "claude-classifier-v0.1.0"
}

export async function classifyAtlasRoles(input: {
  event_type: EventType;
  title: string;
  description: string;
  artifacts: Artifact[];
  stack: StackElement[];
  capabilities: string[];
}): Promise<AtlasClassifierResult>;
```

### 6.2 Implementation

Single Claude Sonnet 4.5 call. Versioned prompt loaded from `src/services/atlas-classifier/prompts/v0.1.0.md`. Prompt structure:

1. System: full role of classifier + Atlas v0.3 role definitions (compact list — role ID + 1-line description, all 28+ roles)
2. User: the artifact data
3. Assistant output: strict JSON via tool use, schema `{ roles: string[], confidence: number, reasoning: string }`

Versioning: store the exact prompt version in `classifier_version`. Never edit a versioned prompt — create v0.1.1 and bump. This is so we can re-classify deterministically and migrate the graph if classifier outputs shift.

### 6.3 Constraints

- Max 5 roles per receipt. If the model wants to assign more, take the top 5.
- Confidence is the model's self-reported confidence on the strongest role. Validated to [0, 1].
- Roles must exist in `atlas_roles_v03`. Filter and warn if model returns an invalid ID.

---

## 7. Step 5 — `/paste` and `/paste/review` Screens

### 7.1 `/paste`

A single page. One input. One CTA.

```
┌──────────────────────────────────────────────────────────┐
│                                                            │
│   Paste what you built.                                    │
│                                                            │
│   ┌────────────────────────────────────────────────────┐ │
│   │ https://...                                          │ │
│   └────────────────────────────────────────────────────┘ │
│                                                            │
│                                            [ Continue → ]  │
│                                                            │
│   Works with GitHub, Lovable, Bolt, v0, Replit,           │
│   Vercel, Netlify, MCP servers, or any deployed URL.      │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

On submit:
1. Hit `/api/paste/classify`. Show inline loading spinner.
2. On success, hit `/api/paste/analyze` in parallel with showing a "Reviewing your work…" interstitial.
3. Once analyze returns, navigate to `/paste/review` with state.

If user is not logged in: route them to `/login?return_to=/paste&pasted_url=...`. After login, return them to `/paste` with the URL prefilled and the flow continues.

### 7.2 `/paste/review`

Single editable form. All fields pre-filled. User confirms or edits.

Sections:
- **Title** (auto-filled, editable, max 80 chars)
- **What happened** (auto-filled markdown draft, editable, max 2000 chars)
- **When** (date picker, default = today, precision selector: day/month/quarter/year)
- **Atlas roles we detected** — checkbox list with confidence percentages
  - Pre-checked: confidence ≥ 0.7
  - Unchecked: confidence < 0.7 (user reviews)
  - User can add any Atlas role manually from a searchable dropdown
- **Stack we detected** — chip list, removable, with "+ Add" affordance
- **Outcomes** (optional, but flag "+trust" hint inline) — empty by default, user adds
- **Attestation** (optional, "+trust" hint) — Phase 1A: button reads "Request attestation (coming soon)" and stores intent; full flow ships Phase 1B
- **Visibility** — default `public`, toggle to `unlisted`

CTA: `Publish proof receipt →`

On submit: `POST /api/paste/publish`.

### 7.3 Trust UX detail

Show the verification ladder visually on this screen so users see what they'll get:

```
Verification level after publish:  ● L1 Artifact Confirmed
                                   ○ L2 Technically Checked  (auto, ~minutes)
                                   ○ L3 Externally Attested  (request signature)
                                   ○ L4 Cryptographically Signed  (future)
```

---

## 8. Step 6 — `POST /api/paste/publish`

### 8.1 Contract

Accepts `CreateProofReceiptInput` from the schema file. Returns `{ canonical_url, slug, id }`.

### 8.2 Logic, in order

1. **Validate** with zod against `CreateProofReceiptInput`. Reject 400 on failure with field-level errors.
2. **Resolve subject** — current authenticated user's `entities` row. Create if it doesn't exist (first paste auto-creates the human entity).
3. **Generate IDs and slug:**
   - `external_id`: `shipstacked:proof:<ulid>`
   - `slug`: kebab-case from title, dedupe with short suffix if collision (e.g. `claude-mcp-deploy-acme`, then `-2`, `-3`)
4. **Insert into `proof_receipts`** with `verification_level = 'L1_artifact_confirmed'` if at least one artifact URL fetched successfully during classify; else `L0_claimed`.
5. **Insert into `verification_events`** the initial L1 (or L0) event with `method: 'paste_flow_ingest'`, evidence = the classify response.
6. **Generate OG card** — render a 1200×630 PNG with title, subject display name, verification badge, top 2 Atlas roles, and ShipStacked logo. Store in Supabase Storage at `og-cards/{slug}.png`. Return URL.
7. **Insert into `ingestion_log`** with `status: 'published'`.
8. **Update `capabilities_vocab`** — increment counts for each tag.
9. Return `{ canonical_url, slug, id }`.

### 8.3 L2 verification — enqueue async

Fire-and-forget enqueue a job to a background worker (Vercel Cron or Supabase Edge Function) to attempt L2 checks:
- GitHub: validate repo activity, contributor confirmation, README quality
- Deployment URLs: ping, check `200 OK` over 24h, capture response time
- MCP server: validate handshake, schema introspection

On success, append a new `verification_events` row and update `proof_receipts.verification_level = 'L2_technically_checked'`.

---

## 9. Step 7 — `/p/[slug]` Public Page + JSON-LD

### 9.1 HTML rendering

Next.js dynamic route `/p/[slug]/page.tsx`. ISR with on-demand revalidation when receipt is updated.

Page structure:
- Hero: title, subject (link to `/u/<slug>`), occurred_at, event_type badge
- Verification ladder visible: filled circle at current level
- Description (rendered markdown)
- Artifacts (cards with thumbnails, click out to original URL with `rel="noopener"`)
- Stack chips
- Atlas roles — each links to `/atlas/roles/<id>` (canonical, dereferenceable)
- Outcomes (if any)
- Attestations (if L3+)
- Share affordances: copy URL, share to X/LinkedIn (uses OG card), download as JSON-LD

`<head>` must include:
- `<link rel="alternate" type="application/ld+json" href="/p/{slug}.json" />`
- `<link rel="canonical" href="https://shipstacked.com/p/{slug}" />`
- Full OG tags pointing to the generated card
- Twitter card tags

### 9.2 JSON-LD content negotiation

Two access paths to the same data:

- `GET /p/{slug}` with `Accept: application/ld+json` → returns JSON-LD body, HTTP 200, `Content-Type: application/ld+json`
- `GET /p/{slug}.json` → same JSON-LD body (convenience URL)

JSON-LD shape: see `ProofReceiptJsonLd` in `proof-receipt-v0.1.ts`.

Atlas role references in the JSON-LD MUST use the canonical dereferenceable URL pattern: `https://shipstacked.com/atlas/roles/{ID}?v=v0.3`.

### 9.3 Atlas role dereferencing — `/atlas/roles/[id]`

Phase 1A scope: a page must exist and resolve for every Atlas role ID in `atlas_roles_v03`. Even if minimal at first.

- `GET /atlas/roles/A1` with `Accept: text/html` → human page with role name, description, automation trajectory, list of recent proof receipts confirmed to this role
- `GET /atlas/roles/A1` with `Accept: application/ld+json` → JSON-LD shape:

```json
{
  "@context": ["https://schema.org", {"shipstacked": "https://shipstacked.com/schema/v0.1#"}],
  "@type": ["DefinedTerm", "shipstacked:AtlasRole"],
  "@id": "https://shipstacked.com/atlas/roles/A1",
  "identifier": "A1",
  "name": "AI Integration Operator",
  "description": "...",
  "inDefinedTermSet": "https://shipstacked.com/atlas?v=v0.3",
  "shipstacked:cluster": "A",
  "shipstacked:automationTrajectory": "resistant",
  "shipstacked:atlasVersion": "v0.3"
}
```

This is the standards play. Other systems can dereference these URLs and incorporate Atlas roles into their own taxonomies.

---

## 10. Routes — Final Phase 1A State

**New routes:**
- `/paste`
- `/paste/review`
- `/p/[slug]`
- `/p/[slug].json`
- `/atlas/roles/[id]` (HTML + JSON-LD via content negotiation)
- `/api/paste/classify`
- `/api/paste/analyze`
- `/api/paste/publish`

**Existing routes — DO NOT TOUCH:**
- `/`, `/atlas`, `/hire`, `/hire/thanks`, `/hire-confirm`, `/claim`, `/claim/thanks`, `/llms.txt`, `/feed`, `/jobs`, `/leaderboard`, `/talent`, `/api-docs`

**Homepage link addition (low-risk):** add a secondary CTA on `/` reading "Paste what you built →" routing to `/paste`. Do not remove existing CTAs.

---

## 11. Validation Checklist Before PR Merge

Run through this before any PR touching Phase 1A is merged. Stop and flag if any answer is unclear.

- [ ] Does this change produce, aggregate, distribute, or verify proof receipts? If not, stop — it violates the constitutional rule.
- [ ] Does paste flow still accept exactly one URL?
- [ ] Are Atlas role refs still canonical URLs (not free text)?
- [ ] Does the receipt page serve JSON-LD via content negotiation?
- [ ] Is the verification ladder visible on the public receipt page?
- [ ] Have any of `/`, `/hire`, `/claim`, `/atlas` been modified? If yes, justify.
- [ ] Has any builder profile UI been replaced? If yes, stop — profile migration is post-Phase 1A.
- [ ] Are `INTAKE_NOTIFY_EMAIL`, Resend DKIM, SES records untouched?

---

## 12. Open Questions To Surface Mid-Build (Not Now)

Flag these when you hit them, don't pre-solve:

- Exact OG card visual design (use a sensible default; we iterate)
- Whether to use Vercel OG image generation or render server-side
- Rate limits for `/api/paste/classify` (start at 30/min/IP, adjust from logs)
- Whether MCP server introspection needs caching beyond the URL classifier cache
- How to handle URLs behind auth walls (Notion private pages, internal tools) — Phase 1A: reject with helpful message

---

## 13. Hand-Off

Two files travel together:

1. `proof-receipt-v0.1.ts` — locked schema, do not modify without bumping `schema_version`
2. This build spec

Place both in `/docs/v2/` in the repo. Reference from `SHIPSTACKED_HANDOVER.md`.

When Phase 1A ships, write `HANDOVER_V2_PHASE1A_COMPLETE.md` capturing: receipts ingested, channels active, deviations from spec, and the next-step queue (Steps 8–11).

---

**End of build spec.**
