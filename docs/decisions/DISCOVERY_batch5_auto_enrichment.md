# DISCOVERY — Batch 5: M5 auto-enrichment

Phase 1 discovery doc. Read-only research. No code mutation, no commits
until operator signs off Section H below.

Prepared at HEAD `3fd69a0` on 2026-05-23.

---

## A. Purpose

Batch 5 closes the audit's only CRITICAL OPEN: **auto-enrichment**. The
profile-to-receipts adapter exists (`src/lib/enrichment/profile-adapter.ts`,
1164 lines, used once via `scripts/v2/enrich-cohort-write.ts` to backfill
the D5 18-builder cohort) but does NOT run for any new signup.

Batch 4 made the gap materially worse: Cards 1/2/3/4 now create entities
on signup, none of which trigger enrichment. The audit's "machine-verified,
not self-reported" positioning depends on the engine actually operating on
real new signups — currently the engine has run for 18 builders ever, all
via one manual script invocation.

**Goal:** the engine runs automatically on signup and on subsequent profile
updates, idempotently, with sensible rate/cost behavior.

**Honest framing — first backend-infrastructure batch:**
- No type system to catch behavior errors. Failures present as wrong/missing
  receipts or wasted API calls, not compile errors.
- Real external API costs: Anthropic per-receipt + GitHub unauthenticated
  60/hr.
- "Did it work" requires watching it run, not just `npm run build` green.
- Discovery doc more careful than usual on triggers + idempotency. Eight
  decisions surfaced in §H — doc does **not** decide them.

**Out of scope** (see §C): entity-graph relationships, team profile
aggregate receipts, `modes.team` derivation, LATENT exposures on `/talent`,
RLS, classifier explainability surface (M14).

---

## B. The 8 load-bearing decisions (surfaced — not decided)

### D1 — Trigger model — LOCKED 2026-05-23 to (b): async fire-and-forget

Signup endpoint returns to the user immediately; enrichment runs in the
background via **Vercel's `waitUntil` pattern** (`waitUntil` from
`next/server`, or `unstable_after` from `next/server` in newer Next
versions). Critical implementation note:

> **Use `waitUntil(promise)` — NOT bare `fetch(...)` without await.**
> A bare unawaited promise dies the instant the serverless function's
> response is sent; the runtime tears down the function context. `waitUntil`
> tells Vercel to keep the function alive until the promise resolves,
> bounded by the function timeout (max ~60s on default plan). This is the
> only way to do async work after responding in a serverless context.

**Considered and rejected:** (a) sync inline (blocks user 10-30s — bad
signup UX); (c) queue-based job runner (adds Inngest/Trigger.dev vendor
+ secret + ops surface — premature); (d) cron polling (adds avg 2.5-min
enrichment delay + cron infra not yet in place); (e) hybrid b+d (defers
to a later batch when cron infra lands — per D6 decision).

### D2 — Profile update re-enrichment — LOCKED 2026-05-23 to (b): material-field diff

Re-enrich only when these fields change: `github_url`, `x_url`,
`website_url`, any new project URL, any new post URL. Skip if only
bio/role/location/availability changed.

**Implementation:** persist `input_fingerprint` per `enrichment_runs` row
(SHA256 of the material fields). On re-enrich check, compute current
fingerprint; if equal to last run's fingerprint, skip (no material
change). Otherwise re-enrich.

**Considered and rejected:** (a) every save (wasteful — every Edit Profile
click burns an Anthropic call even for cosmetic field changes); (c) never
re-enrich (user stuck with first-pass receipts forever; contradicts the
"engine operates on real signups" goal); (d) manual-only (UX gap — users
update their github_url then nothing happens until admin clicks; surprising).

### D3 — Idempotency persistence — LOCKED 2026-05-23 to (d): hybrid

Both layers:
- **`enrichment_runs` table** for run-level tracking: per-entity rows with
  started_at, finished_at, status, receipts_written, failures,
  input_fingerprint (per D2), error_message, classifier_version,
  attempt_count.
- **`proof_receipts.dedupe_key` column + unique partial index** for
  receipt-level insurance: SHA256 of `subject_id + normalized_artifact_url
  + event_type`. INSERT respects the unique index — duplicate writes fail
  silently (caught by adapter) rather than producing duplicate rows.

Belt-and-braces. The run table answers "when was this entity last
enriched, and how did it go." The dedupe key answers "even if the run
table is wrong or two runs race, the DB itself rejects duplicates."

**Considered and rejected:** (a) only `enrichment_runs` table (run-level
only — vulnerable to race conditions where two runs both think they're
the first); (b) extend `entities` with columns (conflates identity with
enrichment state; harder to query run history); (c) only `dedupe_key`
(no run history visible — debugging "did enrichment fire?" requires
inferring from receipt timestamps).

### D4 — Per-card scope — LOCKED 2026-05-23 as proposed

| Card | Input shape | Batch 5 |
|---|---|---|
| Card 1 — Solo Builder | profile + github_url + first build | **Enrich** (canonical case) |
| Card 2 — Team / Agency | entity, no profile, no URLs | **Skip** (defer to Batch 6+ when member graph + team profile land) |
| Card 3 — Autonomous Agent | minimal profile + API key | **Skip** at signup; agent enrichment fires when the agent posts builds via `/api/v1/builds` in a later batch |
| Card 4 — Buyer-only | no supply side | **Skip** (no proof to generate by design) |

### D5 — Manual re-enrich UI — LOCKED 2026-05-23 to (a): admin-only

Admin-only "Re-enrich entity" button in `/admin`, per entity. The
operator/admin can force-rerun enrichment for any entity. No user-facing
"refresh my receipts" button in Batch 5.

**Considered and rejected:** (b) user-facing refresh (premature — users
don't have a clear mental model of "receipts" yet; introducing a refresh
button before they understand what's being refreshed adds confusion);
(c) both (same reasoning); (d) neither (admin needs the lever for the
backfill F.4=i invocation + ongoing debugging).

### D6 — Periodic refresh cron — LOCKED 2026-05-23 to (a): none for Batch 5

No periodic refresh cron in Batch 5. Cron infrastructure deferred to a
later batch. Enrichment fires on signup (D1) + on material profile
update (D2) + on admin manual rerun (D5). That's enough for the goal
"engine operates on real new signups."

**Considered and rejected:** (b) 30-day refresh (premature — cron infra
not in place yet; introducing it adds vendor decisions out of Batch 5's
scope); (c) on-demand only (covered by D5); (d) classifier-version-bump
re-classification (defer until Atlas v0.5 or later actually ships — there
is no current version bump pressure).

### D7 — Failure handling — LOCKED 2026-05-23 to (d): per-artifact + entity-level retry

The existing adapter is already per-artifact resilient (one bad
GitHub repo classify-error doesn't abort the entity's whole run; the
specific artifact is skipped, others proceed). Batch 5 adds entity-level
retry on top: if the whole entity's enrichment fails (e.g. transport
error on first artifact, all retries exhausted), record the failure in
`enrichment_runs` with `attempt_count` incremented. Bounded by D8's
per-entity max retries.

**Considered and rejected:** (a) inline retry only (entity-level
visibility missing — can't tell "we tried and gave up" vs "never ran");
(b) defer to retry queue (requires queue infra — out of scope per D1
and D6); (c) log-and-skip with no retry (loses transient-failure recovery
that's basically free with entity-level retry).

### D8 — Rate/cost limits — LOCKED 2026-05-23 to (b)+(d): hourly count cap + per-entity max retries

Both caps, env-var-driven for runtime tunability:

```
ENRICH_MAX_PER_HOUR=20             # platform-wide count cap; rolling window
ENRICH_MAX_RETRIES_PER_ENTITY=3    # max attempts in any 24h window
```

Defaults if env vars are unset: same values (20 / 3). Operator changes
without code redeploy by setting Vercel env vars.

**Enforcement:**
- Per-hour count: count `enrichment_runs` rows in the last hour where
  `status IN ('running', 'ok', 'partial', 'failed')`; if ≥ cap, skip
  (record nothing; trigger logs "rate-limited"). The next signup-trigger
  fires; just doesn't proceed.
- Per-entity retries: count `enrichment_runs` rows for this entity_id in
  the last 24h. If ≥ cap, skip (record nothing).

**Considered and rejected:** (a) no caps (Anthropic spend grows
unboundedly under attack/runaway — basic guardrail required); (c) per-
Anthropic-spend cap (requires querying Anthropic's billing API or
maintaining local cost telemetry — premature; count-based cap is the
simpler proxy and is good enough).

---

## C. Out of scope (explicit)

- **Entity graph relationships (entity_links table)** — Batch 6+.
- **Team profile aggregate proof receipts** — depends on entity graph.
- **`modes.team` derivation** — Batch 6 follow-up.
- **LATENT exposures on `/talent`** (atlas-role filter, capability filter,
  stack filter, verification level filter) — separate batch.
- **RLS rollout.**
- **Classifier explainability surface (M14)** — "why was this builder
  classified as X" UI.
- **Backfilling existing-but-unenriched accounts** — the audit confirmed
  18 builders enriched + 0 others. Whether to backfill the gap as part of
  Batch 5 is an additional sub-decision (recommend: yes, run once after
  the trigger is built, as a one-shot script invocation of the existing
  `runRealWrite` — same as the cohort run).

---

## D. Pre-flight verification — results

Read-only reads complete.

### D.1 — `src/lib/enrichment/profile-adapter.ts` (1164 lines)

The existing adapter, ran once for the D5 cohort. Key shape:

- **Exports:** `runDryRun(admin, usernames, log)` and `runRealWrite(admin,
  usernames, log)`. Both take an array of usernames; no per-entity API.
- **Inputs:** reads `profiles + projects + posts` for each username,
  gathers candidate URLs from `profile.github_url`, `project.project_url`,
  `post.url`.
- **Chain (real engine functions — no reimplementations):** `validateUrl`
  → `classifyUrl` → `analyzePastedUrl` → `classifyAtlasRoles` →
  `publishProofReceipt`.
- **Dedupe:** in-memory `Map<normalizedKey, NormalizedArtifact>` per-batch
  (line 357-376). Across batches, no dedupe — re-running on the same
  username will create duplicate receipts.
- **Idempotency on `findOrCreateHumanEntity`:** YES — existing entity
  lookup before insert, returns existing if found. So entity creation is
  idempotent.
- **Idempotency on `publishProofReceipt`:** NO — no fingerprint check.
  Will insert a new receipt every call.
- **Per-artifact resilience:** YES — each artifact wrapped in try/catch,
  one bad classify/publish doesn't abort the batch.
- **Per-entity granularity:** the adapter takes a list of usernames. A
  single-username invocation = single-entity enrichment.

### D.2 — `scripts/v2/enrich-cohort-write.ts` (321 lines)

The historical operator script. Patterns relevant to Batch 5:

- Pre/post snapshots of `proof_receipts` + `entities` table counts.
- Per-builder expected-count check (post-dry-run review provided expected
  numbers).
- Spot-check 3 builders' receipts.
- Failures roll-up (per-stage).
- Runs `runRealWrite(admin, COHORT, ...)` once with 18 usernames.
- **NOT a model for the auto-enrichment trigger** — this was a one-shot
  CLI invocation. Useful as a model for the **periodic catchup cron** if
  D6 = (b)/(d).

### D.3 — Atlas classifier cost surface

`src/services/atlas-classifier/index.ts`:
- **Model:** `claude-sonnet-4-6` (line 36).
- **Max tokens:** 8192.
- **System prompt:** ~50KB markdown (the Atlas v0.4 role catalog, loaded
  once at module init).
- **Per-call:** one Anthropic API request per artifact. A builder with N
  candidate artifacts = N classifier calls = ~N×(system prompt + small
  user message + ≤8K output) input tokens.
- **Retry:** one inline retry if tool_use block missing in response
  (line 226). No retry on transport errors (those throw).
- **Cost estimate** (rough — operator should verify with Anthropic
  console): ~$0.01-0.05 per receipt depending on input size. D5 cohort
  enrichment wrote 55 receipts → ~$0.50-2.50 for the historical one-shot.
  At signup scale, depends entirely on signup volume.

### D.4 — Extractors

| Extractor | External API | Rate limit |
|---|---|---|
| `github.ts` (444 lines) | GitHub REST API (repos, contents, languages, README, dep manifests) | **60 req/hr unauthenticated** — set `GITHUB_TOKEN` env to raise to 5000/hr |
| `vercel.ts` | HTML body scan (no API) | network only |
| `netlify.ts` | HTML body scan (no API) | network only |
| `replit.ts` | OG/HTML | network only |
| `lovable.ts` | OG/HTML | network only |
| `bolt.ts` | OG/HTML | network only |
| `v0.ts` | OG + Vercel deploy URL probe | network only |
| `mcp_server.ts` | `/.well-known/mcp` + JSON-RPC handshake | network only |
| `generic.ts` | none (uses classifier metadata) | n/a |

**GitHub is the rate-limit bottleneck.** Each GitHub artifact uses
multiple endpoints (repo / contents / languages / README + ≤3 dep
manifests = up to ~7 requests per artifact). With unauthenticated 60/hr,
that's only ~8 GitHub-heavy enrichments per hour platform-wide.

**Mitigation:** the extractor caches each endpoint response in Upstash
Redis for 6h, so re-running enrichment for the same repo within 6h is
free. Cold cache + sustained signup volume = rate-limit pressure.

**Recommend the `GITHUB_TOKEN` env var be set** in Vercel before Batch 5
ships. Raises ceiling to 5000/hr. Operator-side action; not a code change.

### D.5 — Entity creation surfaces after Batch 4

| Endpoint | Creates entity? | Trigger point for enrichment |
|---|---|---|
| `/api/join/team` (Card 2) | yes, `kind='team'` | skip per §B.D4 |
| `/api/join/buyer` (Card 4) | yes, `kind='human'` no profile | skip per §B.D4 |
| `/api/keys` agent-mode (Card 3) | yes, `kind='agent'` | skip per §B.D4 |
| `/join` Card 1 → `profiles` insert | **NO entity row at signup** | entity gets created later by `findOrCreateHumanEntity` |

**Important finding:** Card 1 (Solo Builder) does **NOT create an
`entities` row at signup**. The existing `/join` flow inserts a profile
+ posts + skills but never creates an entity. Entity creation happens
later via `findOrCreateHumanEntity` — which is called by
`publishProofReceipt` (in the paste flow) and by the enrichment adapter
itself. **The enrichment adapter for Card 1 must call
`findOrCreateHumanEntity` first**, then proceed with classification.
That's already how the adapter works (line 916-919 in profile-adapter.ts
calls `findOrCreateHumanEntity` before publish). No new code needed for
this.

But this also means the trigger point question is "after profile insert,
not after entity insert" for Card 1 — different from Cards 2/3/4 where
the entity insert IS the trigger candidate. For the trigger model (D1),
this means:
- Card 1 trigger fires from `/join` page after `supabase.from('profiles').insert(...)` succeeds.
- Cards 2/3/4 trigger fires from the respective API endpoints (but D4
  says skip those for Batch 5).

### D.6 — Profile update trigger surface

`src/app/dashboard/edit/EditProfileForm.tsx:222-285`:
- Client-side `supabase.from('profiles').update(...)` direct DB write.
- Followed by `supabase.from('projects').delete().insert(...)` + same
  for skills.
- Fire-and-forget POST to `/api/profile/verify-check` after save.

**No server endpoint for profile updates today.** The trigger for
re-enrichment (D2) needs one of:
- **(a) Convert profile update to a server endpoint** (refactor — bigger
  scope) that detects material-field diff and triggers enrichment.
- **(b) Add a new `/api/profile/enrich-check` endpoint** the client
  POSTs after save (same pattern as `verify-check`). Server reads current
  profile vs. last-enriched-snapshot, decides whether to re-enrich.
- **(c) Postgres trigger** on `profiles` UPDATE that POSTs to an
  internal webhook. Cleanest data-driven approach; requires Postgres
  function + webhook secret.
- **(d) Skip update re-enrichment** entirely (D2 = c or d).

### D.7 — Existing infrastructure for cron / queue / background jobs

- **No `vercel.json`** — no Vercel Cron configured.
- **No `.github/workflows/`** — no GitHub Actions.
- **No `supabase/functions/`** — no Edge Functions.
- **No queue infrastructure** in repo.
- Only cron-aware endpoint: `/api/hire-confirm/nudge` (POST, gated on
  `x-cron-secret` header, manually triggered today).

**Implication for D1/D6:** any cron-based option (d/e for D1, b/c/d for
D6) requires net-new infrastructure setup. Options:
- **Vercel Cron** (free on Hobby — limited schedules; paid plans more).
  Simplest if operator is on a supported tier.
- **Supabase Edge Functions + pg_cron** — keeps it in Supabase, but
  Edge Functions are Deno (not Node) so the adapter's Node imports
  wouldn't work without porting.
- **External scheduler** hitting an authenticated endpoint
  (`/api/cron/enrich-batch` with `x-cron-secret`). Operator picks a
  scheduler (cron-job.org, GitHub Actions schedule, EasyCron, etc.).
- **Inngest / Trigger.dev / Defer** — full job-runner SaaS. Most
  features (retries, observability, scheduling) but adds a vendor.

### D.8 — Postgres uniqueness constraints (idempotency check)

- `proof_receipts` table: `external_id` UNIQUE (ULID), `slug` UNIQUE.
  **No uniqueness on `(subject_id, artifact_url, event_type)` or
  similar.** Confirms D3 idempotency persistence is needed.
- `entities` table: `external_id` UNIQUE, `slug` UNIQUE. Owner is
  effectively unique per kind (via `fetchEntityByOwner` lookup before
  insert in `findOrCreateHumanEntity`).

---

## E. Per-card data flow (post-Batch-4 + Batch-5)

### Card 1 (Solo Builder) — full enrich

1. `/join` Card 1 submit → `profiles` insert succeeds.
2. **Trigger point** — fire enrichment per D1.
3. Enrichment: read profile + projects + posts → gather candidate URLs
   → `findOrCreateHumanEntity` → `validateUrl` → `classifyUrl` →
   `analyzePastedUrl` → `classifyAtlasRoles` → `publishProofReceipt` per
   artifact.
4. Receipts written to `proof_receipts`; entity linked to profile.

### Card 2 (Team/Agency) — skip (per D4)

1. `/api/join/team` → entity created with `kind='team'`.
2. **No enrichment trigger.** No URLs to enrich, no profile, no proof to
   generate. Revisit when Batch 6+ member linking + team profile lands.

### Card 3 (Autonomous Agent) — skip / deferred (per D4)

1. `/api/keys` (agent mode) → minimal profile + entity + API key.
2. **No enrichment trigger at signup.** No user-supplied URLs.
3. **Future:** when the agent POSTs builds via `/api/v1/builds`, the
   profile gains content. That's the natural enrichment point. **Out of
   scope for Batch 5** — the V1 API already runs auto-verify checks
   (`/api/profile/verify-check`); enrichment can hook in there in a
   later batch.

### Card 4 (Buyer-only) — skip (per D4)

1. `/api/join/buyer` → entity (kind='human') + `user_metadata.role='client'`.
2. **No enrichment trigger.** Buyers don't have supply-side proof.

### Profile update (any card) — re-enrich per D2

Depends on D2 choice. See §D.6 for the trigger surface options.

---

## F. Cross-cutting concerns

### F.1 — Adapter `runRealWrite` shape vs. single-entity enrichment

The existing `runRealWrite(admin, usernames, log)` takes an array. For
single-entity enrichment (Card 1 signup), we'd call
`runRealWrite(admin, [username], ...)`. That's fine but suboptimal — the
adapter does some batch-level work (snapshot fetches per builder) that's
overhead for a single call. Worth extracting a `runRealWriteForOne(admin,
profileId, log)` helper that skips the batch ceremony. Mechanical
refactor; not a blocker.

### F.2 — Logging + observability

The adapter logs via a `log: (msg: string) => void` callback that
defaults to no-op. The historical script piped to `console.error`. For
auto-enrichment running in serverless, log to `console.log` so Vercel
function logs capture it. Consider also writing per-run rows to a new
`enrichment_runs` table (per D3 option a/d) for query-able history.

### F.3 — Anthropic API key + budget

The classifier uses `new Anthropic()` (no explicit key) which means the
SDK reads `ANTHROPIC_API_KEY` from env. Confirmed via repo audit. The key
exists in `.env.local` and Vercel. **No code change required.** Budget
monitoring is operator-side via Anthropic console.

### F.4 — Backfilling pre-Batch-5 unenriched accounts

The audit confirmed 18 builders enriched + 0 others. Card 1 signups
between the cohort run (2026-05-19) and Batch 5 deploy will have profiles
but no entity / no receipts. Operator should decide:
- **(i)** Run a one-shot backfill script (`scripts/v2/enrich-cohort-write.ts`
  with the unenriched usernames) after Batch 5 ships.
- **(ii)** Trigger backfill via the cron (D6) — entities older than
  `last_enriched_at IS NULL` get enriched on next cron tick.
- **(iii)** Skip backfill — only enrich users who sign up post-Batch-5.

Recommend (i) or (ii) — leaving pre-Batch-5 signups perpetually
unenriched contradicts the goal.

### F.5 — Welcome email vs. enrichment ordering

`/api/welcome` fires at the end of each card's signup flow (Cards 1/2/3/4
all POST to it). If D1 = (a) synchronous inline, enrichment happens
before the user sees the success screen → welcome email arrives in
inbox **with** the enriched profile linked. If D1 = (b)/(c)/(d)/(e),
welcome email arrives first; enrichment lands seconds-to-minutes later.
Operator decides whether this ordering matters for UX.

### F.6 — Idempotency on profile update — material-field detection

If D2 = (b) "re-enrich only when material fields change", the trigger
needs to detect:
- `github_url` changed
- `x_url` changed (currently unused by extractors, but flagged for
  future)
- `website_url` changed (currently unused by extractors)
- Any new project added
- Any new post with URL added

Easiest: persist a hash of "enrichment-relevant fields" per entity in
`enrichment_runs.input_fingerprint`. Re-enrich only when fingerprint
changes. Same persistence model whether D3 = (a) or (d).

---

## G. SQL audit block (operator runs in Supabase Dashboard, read-only)

Surfaces the schema state Batch 5 needs to confirm before writing the DDL
for D3.

```sql
-- §G.1 — confirm proof_receipts has NO uniqueness on (subject_id, artifact_url)
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.proof_receipts'::regclass
  AND contype = 'u'
ORDER BY conname;

-- §G.2 — current count of orphaned (unenriched) entities + profiles
-- Profiles with no entity_id (Card 1 signup but no enrichment yet)
SELECT count(*) AS profiles_without_entity
FROM public.profiles
WHERE entity_id IS NULL;

-- Entities with no proof_receipts (kind='human' but never enriched)
SELECT
  e.kind,
  count(*) AS entities_without_receipts
FROM public.entities e
LEFT JOIN public.proof_receipts r ON r.subject_id = e.id
WHERE r.id IS NULL
GROUP BY e.kind
ORDER BY e.kind;

-- §G.3 — receipts-per-entity distribution (sanity check on cohort state)
SELECT
  count_bucket AS receipts_per_entity,
  count(*) AS entity_count
FROM (
  SELECT count(r.id) AS count_bucket
  FROM public.entities e
  LEFT JOIN public.proof_receipts r ON r.subject_id = e.id
  WHERE e.kind = 'human'
  GROUP BY e.id
) buckets
GROUP BY count_bucket
ORDER BY count_bucket;

-- §G.4 — check if any tables related to enrichment_runs / job tracking exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name ILIKE '%enrich%' OR table_name ILIKE '%job%' OR table_name ILIKE '%run%' OR table_name ILIKE '%queue%')
ORDER BY table_name;
-- Expected: none (greenfield for enrichment_runs).

-- §G.5 — Vercel cron / similar markers (informational; pg_cron extension if any)
SELECT * FROM pg_extension WHERE extname IN ('pg_cron','pg_net') ORDER BY extname;
-- Expected: empty (no pg_cron / pg_net installed today).
```

---

## H. Approval gate (operator decides)

Eight decisions to lock. **Doc does not recommend defaults; operator
picks deliberately.** Trade-offs are described in §B for each decision.

- [x] **D1 — Trigger model: LOCKED to (b)** async fire-and-forget.
      Server-side enrichment fan-out uses `waitUntil` from `next/server`
      (not bare unawaited fetch). Client-side Card 1 trigger uses normal
      browser `fetch`.
- [x] **D2 — Profile update re-enrichment: LOCKED to (b)** material-field
      diff. `input_fingerprint` (SHA256 of github_url, x_url, website_url,
      project URLs, post URLs) persisted per `enrichment_runs` row.
      Re-enrich only when fingerprint changes.
- [x] **D3 — Idempotency persistence: LOCKED to (d)** hybrid — new
      `enrichment_runs` table + `proof_receipts.dedupe_key` column with
      unique partial index.
- [x] **D4 — Per-card scope: LOCKED as proposed.** Card 1 full,
      Cards 2/3/4 skip/defer.
- [x] **D5 — Manual re-enrich UI: LOCKED to (a)** admin-only "Re-enrich
      entity" button in `/admin`.
- [x] **D6 — Periodic refresh cron: LOCKED to (a)** none for Batch 5.
      Cron infrastructure deferred.
- [x] **D7 — Failure handling: LOCKED to (d)** per-artifact granular
      (existing) + entity-level retry on top, bounded by D8 cap.
- [x] **D8 — Rate/cost limits: LOCKED to (b)+(d)** per-hour count cap
      + per-entity max retries. Env-var-driven:
      `ENRICH_MAX_PER_HOUR=20`, `ENRICH_MAX_RETRIES_PER_ENTITY=3`.
      Defaults baked in if unset.

**Cross-cutting confirmations:**

- [x] **F.4 — Backfill: LOCKED to (i)** one-shot script invocation of
      `runRealWrite` against unenriched-account usernames, operator-run
      after Batch 5 deploy.
- [x] **GitHub token in Vercel: CONFIRMED required before deploy.**
      Operator action — set `GITHUB_TOKEN` env var in Vercel project
      settings to raise rate ceiling from 60/hr to 5000/hr.

**Operator approval: granted 2026-05-23 — single-trigger-model batch,
two-step DDL+code execution. trigger.ts helper file dropped per YAGNI
revision; all orchestration in `/api/enrich/route.ts`. waitUntil pattern
documented explicitly for server-side fan-out. Env-var caps locked at
ENRICH_MAX_PER_HOUR=20 + ENRICH_MAX_RETRIES_PER_ENTITY=3.**

---

## I. Code edit + commit plan

Depends heavily on §H decisions. Sketch:

### Definite work (per locked decisions)

**Architectural revision:** the originally-proposed
`src/lib/enrichment/trigger.ts` helper file is **dropped** — over-engineered
for Batch 5's needs. All trigger orchestration lives inside
`src/app/api/enrich/route.ts` directly. Extract a helper only if and when
Batch 6+ needs to reuse the logic. YAGNI.

1. **`src/lib/enrichment/profile-adapter.ts`** — extract
   `runRealWriteForOne(admin, profileId, log)` helper (or accept profileId
   directly in addition to usernames array). Single-entity invocation
   skips the batch ceremony in `runRealWrite`.
2. **`src/app/api/enrich/route.ts`** (NEW) — server endpoint that fires
   enrichment for a profile. Holds all orchestration: D2 fingerprint check
   (read last `enrichment_runs` row → compute current fingerprint → skip
   if equal), D7 entity-level retry, D8 rate-limit checks (per-hour
   platform count + per-entity 24h retries), then calls
   `runRealWriteForOne` + writes a new `enrichment_runs` row. Gated on
   auth (only profile owner or admin can trigger).
3. **`src/app/join/page.tsx`** — Card 1 `handleBuilderSubmit` calls the
   `/api/enrich` endpoint via `waitUntil(...)` after `profiles` insert
   succeeds.
4. **`src/app/dashboard/edit/EditProfileForm.tsx`** — `handleSave` POSTs
   to `/api/enrich` as fire-and-forget after the supabase update succeeds
   (same pattern as the existing `verify-check` POST at line 279).
   Endpoint internally short-circuits via D2 fingerprint if no material
   change.
5. **`src/app/admin/page.tsx`** (or sibling admin component) — per-entity
   "Re-enrich entity" button per D5=(a). POSTs to `/api/enrich?force=1`
   with admin gate (force=1 bypasses the fingerprint short-circuit and
   the per-entity retry cap).
6. **Env vars in `.env.local` + Vercel:**
   ```
   ENRICH_MAX_PER_HOUR=20
   ENRICH_MAX_RETRIES_PER_ENTITY=3
   GITHUB_TOKEN=ghp_...           # raises GitHub rate from 60/hr to 5000/hr
   ```
   Defaults baked into `/api/enrich/route.ts` if env vars unset (20 / 3
   for caps; no token = unauthenticated 60/hr).

### Implementation note for D1 (`waitUntil`)

```typescript
// In /join Card 1 handleBuilderSubmit (and EditProfileForm handleSave):
//
// ❌ WRONG — dies when serverless function ends:
// fetch('/api/enrich', { method: 'POST', body: JSON.stringify({ ... }) })
// // ↑ Promise rejects silently. Serverless tears down the function context
// //   the moment the parent endpoint sends its response.
//
// ✅ RIGHT — Vercel keeps function alive until enrichment completes
//    (bounded by function timeout, max ~60s on default plan):
//
//   import { waitUntil } from 'next/server'
//   waitUntil(
//     fetch('/api/enrich', { method: 'POST', body: JSON.stringify({ ... }) })
//   )
//   return NextResponse.json({ ok: true })
//
// Note: `waitUntil` is callable from server-side endpoints (route handlers,
// server actions). The /join page is `'use client'` — the client-side
// `handleBuilderSubmit` just calls `fetch('/api/enrich', ...)` directly
// since the client's lifecycle is the user's browser, not a serverless
// function. The `waitUntil` pattern matters for server-to-server fan-out
// (e.g. if the welcome email endpoint or /api/join/buyer wants to also
// fire enrichment async — those are server contexts).
```

For Card 1's client-side `handleBuilderSubmit`, the simple
`fetch('/api/enrich', { method: 'POST' })` without await is sufficient —
the user's browser keeps the request alive. The `waitUntil` discipline
applies on server endpoints that call enrichment, not on client code.

### Conditional work

- **If D3 = (a) or (d):** DDL — new `enrichment_runs` table:
  ```sql
  CREATE TABLE public.enrichment_runs (
    id              bigserial primary key,
    entity_id       bigint not null references public.entities(id) on delete cascade,
    started_at      timestamptz not null default now(),
    finished_at     timestamptz,
    status          text not null check (status in ('running','ok','partial','failed')),
    receipts_written int default 0,
    failures        int default 0,
    input_fingerprint text,           -- hash of enrichment inputs for D2(b)
    error_message   text,
    classifier_version text
  );
  CREATE INDEX idx_enrichment_runs_entity ON public.enrichment_runs(entity_id);
  CREATE INDEX idx_enrichment_runs_status ON public.enrichment_runs(status) WHERE status IN ('running','partial');
  ```
- **If D3 = (c) or (d):** DDL — `proof_receipts.dedupe_key` column + unique
  index:
  ```sql
  ALTER TABLE public.proof_receipts
    ADD COLUMN dedupe_key text;
  CREATE UNIQUE INDEX idx_receipts_dedupe ON public.proof_receipts(dedupe_key) WHERE dedupe_key IS NOT NULL;
  ```
  Plus adapter change to compute + write the key on insert.
- **If D5 = (a) or (c):** UI changes in `src/app/admin/page.tsx` for
  admin button.
- **If D5 = (b) or (c):** UI changes in `src/app/dashboard/page.tsx` /
  `BuilderDashboardClient.tsx` for user-facing refresh.
- **If D6 ≠ (a):** Cron setup — `src/app/api/cron/enrich-batch/route.ts`
  + Vercel cron config (or operator-side external scheduler).
- **If D1 = (c):** queue infrastructure (Inngest / Trigger.dev /
  Vercel queue) — out-of-tree dependency add.

### Estimated scope

- Files touched: ~5-10 depending on decisions.
- New files: 2-4 (trigger helper, /api/enrich, maybe /api/cron, maybe
  admin/user button components).
- New DDL: 0-2 ALTER TABLE / CREATE TABLE depending on D3.
- Vercel env: `GITHUB_TOKEN` recommended.

### Verification

- `npx tsc --noEmit` clean.
- `npm run build` clean.
- **Manual integration test** (no automated test harness): create a test
  signup via Card 1 with a known github_url; observe receipts appear in
  `proof_receipts` table within the chosen latency window per D1.
- **Idempotency test:** trigger enrichment twice on the same entity;
  confirm no duplicate receipts (D3).
- **Failure test:** trigger enrichment with `ANTHROPIC_API_KEY=invalid`;
  confirm graceful failure per D7.
- **Backfill** (if F.4 = i or ii): observe count of `entities without
  receipts` (§G.2) drop to 0 (or near-0) after backfill completes.

---

## J. Execution sequence (gated on §H approval)

Likely two-commit (DDL first if D3 needs it, code second), similar to
Batch 4. After approval:

1. **Step 1 — DDL** (if any per D3): one ALTER + one CREATE TABLE via
   Supabase Dashboard SQL Editor.
2. **Step 2 — Code commit:** trigger helper + endpoint + integration
   points. Recommend single commit.
3. **Step 3 — Operational** (out-of-tree):
   - Set `GITHUB_TOKEN` in Vercel env if not already.
   - Configure cron (Vercel cron or external scheduler) if D6 ≠ (a).
   - Set queue runner if D1 = (c).
4. **Step 4 — Backfill** (if F.4 = i): one-shot script invocation of
   `runRealWrite` against the unenriched-account usernames list.
   Manually run; not part of the auto-trigger.

Each step gated separately at execution time.

---

## K. Verification — what 'green' looks like

- Cron / signup trigger fires per D1 within expected latency.
- Each Card 1 signup produces ≥0 receipts (some may produce zero if no
  candidate URLs — that's correct, not an error).
- `proof_receipts` rows linked to the new entity (via `subject_id`).
- `entities.profile_id` link populated for Card 1 signups.
- Re-running enrichment for the same entity does NOT create duplicates
  (D3).
- Failures logged but don't break the signup endpoint.
- `npx tsc --noEmit` clean, `npm run build` clean, Vercel deploy green.

---

## L. Reversal

- **Code:** `git revert <SHA>`. Triggers stop firing. Pre-Batch-5
  behaviour resumes.
- **DDL** (if D3 added tables/columns): reversal SQL block in this doc,
  same pattern as Batches 1/4. `enrichment_runs` DROP is safe (data
  isolated); `proof_receipts.dedupe_key` removal is safe (column drop).
- **Backfilled receipts:** if F.4 = (i) ran and the backfill produced bad
  receipts, `DELETE FROM proof_receipts WHERE issued_at > '<backfill
  timestamp>'` plus rolling back `entities.profile_id` links. Surgical;
  the existing cohort's 55 receipts are NOT touched because they predate
  the backfill cutoff.

---

## M. Risks / honest notes

1. **First backend-infrastructure batch.** No type system catches
   behavior errors. "Did it work" requires watching it run, not just
   build green. Verification rigor on this batch sits higher than usual.

2. **External API costs are real and operator-monitored.** Anthropic
   spend grows with signup volume × artifacts per builder. At current
   signup rate (~0/week beyond the cohort), this is negligible. At
   scale, monitor.

3. **GitHub 60/hr unauthenticated rate-limit is the natural ceiling.**
   Without `GITHUB_TOKEN`, sustained signups will hit it. Operator should
   set the token before going live.

4. **`publishProofReceipt` has no built-in dedupe.** Persistent
   idempotency (D3) is a hard requirement, not optional. Skipping it
   means the first re-run of the trigger duplicates every receipt for
   every entity.

5. **Cards 2/3/4 are deferred.** They get entities but no enrichment in
   Batch 5. Buyers (Card 4) are correctly zero — they have no supply
   side. Teams (Card 2) and Agents (Card 3) need member-graph and
   API-builds work respectively before they can be meaningfully enriched.
   This means `kind='team'` and `kind='agent'` entities created post-Batch-4
   will still have zero receipts after Batch 5 — by design.

6. **Profile update trigger surface is awkward.** `EditProfileForm.tsx`
   writes profile updates client-side via direct Supabase calls. Adding a
   re-enrich trigger requires either a new server endpoint (cleaner) or
   a Postgres trigger (cleanest but new ops). The simplest path is to
   match the existing `verify-check` pattern — client fires a POST after
   save.

7. **Cron scheduling is operator-side.** If D6 ≠ (a), the operator picks
   the scheduler. The doc surfaces options; doesn't decide.

8. **Welcome email ordering matters less than it seems.** Per F.5, async
   triggers (D1 = b/c/d/e) deliver the welcome email before enrichment
   completes. Acceptable — users don't notice receipt latency at sub-minute
   scales. The link in the email goes to the profile page, which renders
   correctly whether 0 or N receipts exist yet.

9. **Backfill is a separate decision (F.4).** The 18-builder cohort is
   already enriched. Card-1 signups between 2026-05-19 (cohort run) and
   Batch 5 deploy are unenriched. F.4 decides whether to catch them.
