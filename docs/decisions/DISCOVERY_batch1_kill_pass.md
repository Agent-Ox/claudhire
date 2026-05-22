# DISCOVERY — Batch 1 KILL pass

Phase 1 discovery doc. Read-only research. No code mutation, no SQL execution,
no commits until operator signs off Section H below.

Prepared at HEAD `55964dd` on 2026-05-22.

---

## A. Purpose

Batch 1 is dead-code removal — pure subtractive cleanup against the locked
Customer/Entity/Mode/Role spec (see `SESSION_2026-05-19_DECISIONS.md` UPDATE
2026-05-22). No new behavior. No refactors. No schema changes to *live* tables.
Verifiable as: **before/after surface count goes down, nothing else changes.**

Out of scope (explicit): the outreach engine code, the `candidates` /
`outreach_drafts` / `outreach_log` tables, the single-role refactor (Batch 2),
the "Employer → Hirer/Buyer" terminology pass (Batch 3).

---

## B. Scope — KILLS

Each item: what, why (against locked spec), reversal cost.

### B.1 — `claim_submissions` table (DROP)
- **What:** Public schema table backing the killed `/claim` flow (Doc-B intake era).
- **Why:** Doc-B intake residue. `/claim` was removed in commit `83538a6`. Zero
  src refs (verified — see §F.1). Locked spec has no concept of an
  application-style "claim" form; entity creation is via the signup router.
- **Reversal cost:** Recreate empty table from CREATE statement in §G. Data lost
  on drop (any rows captured before `/claim` was killed are unrecoverable post-drop
  unless backed up first).

### B.2 — `hire_intakes` table (DROP)
- **What:** Public schema table backing the killed `/hire` intake flow (Doc-B era).
- **Why:** Doc-B intake residue. `/hire` was removed in commit `83538a6`. Zero
  src refs (verified — see §F.1). The locked spec has buyers as a *mode toggle on
  an entity*, not an intake form submission.
- **Reversal cost:** Recreate empty table from CREATE statement in §G. Data lost
  on drop.

### B.3 — `outreach_pipeline_summary` view (DROP)
- **What:** SQL view aggregating candidate-pipeline counts (likely created in the
  Supabase Dashboard at outreach engine MVP time).
- **Why:** Zero src refs (verified — see §F.1). The outreach engine is being
  archived (nav hidden, code preserved); the summary view was for ad-hoc
  Dashboard viewing only. With nobody clicking into the engine, nothing needs
  the summary.
- **Reversal cost:** Recreate from `CREATE VIEW` SQL. The view's definition
  **must be captured before drop** — operator runs §G.0 introspection first and
  pastes the result into §G's reversal block. Data is computed (it's a view), so
  no data loss.

### B.4 — `subscriptions.magic_link` column (NULL all rows, then DROP COLUMN)
- **What:** Text column storing magic-link URLs generated for new employer
  subscriptions during Stripe checkout.
- **Why:** Stored auth tokens that served no operational purpose after their
  one-time use. **Worst single-table RLS exposure finding** from prior probe.
- **⚠ Cross-cutting finding (load-bearing — read before greenlight):**
  `src/app/api/webhooks/stripe/route.ts:74` actively WRITES this column on
  every new subscription. **Dropping the column without first removing the
  write breaks the Stripe webhook on the next employer signup.** The code
  change to remove the write must land in the same commit window as the DDL,
  and the code change must land *before* the DDL is executed.
- **Reversal cost:** `ALTER TABLE public.subscriptions ADD COLUMN magic_link
  text;` — restores schema. Data unrecoverable (the NULL pass is the point —
  the data was the exposure).

### B.5 — `src/app/leaderboard/page.tsx` (DELETE)
- **What:** Top-10 ranking page by `profiles.velocity_score`.
- **Why:** Per D12, Velocity Score is flagged-vanity; locked spec is
  proof-of-work, not aggregated-activity ranking. The leaderboard surface
  presents the weak signal as a featured product, contradicting the locked
  positioning.
- **Reversal cost:** `git revert` the deletion commit. Single-file restore.

### B.6 — `src/app/api/velocity/calculate/route.ts` (DELETE)
- **What:** POST endpoint that recomputes `velocity_score` for the
  authenticated builder.
- **Why:** Backs `/leaderboard` and the dashboard "recalculate" button. Without
  the leaderboard surface and with the standing decision to stop writing
  `velocity_score`, the endpoint has no purpose.
- **⚠ Cross-cutting:** `src/app/dashboard/BuilderDashboardClient.tsx:127` calls
  this endpoint via fetch. The caller will throw on 404 (wrapped in try/catch;
  silent failure). Either remove the caller too or accept the silent break.
  See §I for the proposed handling.
- **Reversal cost:** `git revert`. Single-file restore.

### B.7 — `src/app/api/scout/route.ts` (DELETE)
- **What:** Removed feature endpoint that already returns `410 Gone` with the
  body `{"error":"Scout has been removed."}`.
- **Why:** Dead route stub. Zero callers anywhere (verified — see §F.5). 410
  was a tombstone for any old external links; sufficient retention has elapsed.
- **Reversal cost:** Trivial — `git revert` restores the 8-line tombstone.

### B.8 — `getAtlasVersion()` export in `src/services/atlas-classifier/roles.ts` (DELETE)
- **What:** Exported function that returns `'v0.4'` (a string constant).
- **Why:** Zero callers in `src/` or `scripts/` (verified — see §F.4). Only
  references are self-references inside its own file's header comments. The
  comment block above is also stale — references the function's purpose
  ("returned by getAtlasVersion() below") which becomes incorrect on removal.
- **Reversal cost:** Trivial. Single export.

---

## C. Scope — NON-KILL changes paired with this batch

### C.1 — Stop writing `profiles.velocity_score`
- **Goal:** Column stays. Schema unchanged. Reads stay (many display surfaces
  rely on it). Writes are removed so the column orphans (stops getting fresh
  values). Killing the column itself is a later decision, if ever.
- **Write sites identified:**
  - `src/app/join/page.tsx:102` — `velocity_score: 0` on initial profile
    creation. **Remove the field from the insert payload**; the column has a
    default (or NULL) which is what we want for new rows.
  - `src/app/api/velocity/calculate/route.ts:78` — the only place that
    `.update({ velocity_score: … })`. This whole file is being deleted in B.6,
    so the write goes away with the file.
- **No other write sites in `src/`.** `src/app/api/admin/candidates/import/route.ts:197`
  writes `velocity_score: …` but to the *`candidates`* table, which is a
  different column on a different table (outreach engine), and is out of scope.

### C.2 — Hide admin nav link to `/admin/candidates`
- **Goal:** Route stays live, page stays functional, nobody clicks into the
  outreach engine accidentally.
- **Finding:** **No admin nav link to `/admin/candidates` exists today.** Grep
  for `href.*?/admin/candidates` returns only **two hits**, both *inside* the
  outreach engine itself:
  - `src/app/admin/candidates/import/ImportClient.tsx:116` — back-link
    "← Outreach" from import page to queue page (intra-engine).
  - `src/app/admin/candidates/import/ImportClient.tsx:248` — success CTA
    "Start outreach session →" after import (intra-engine).
- **`src/app/admin/page.tsx` contains zero references to "candidate" or
  "outreach".** The admin landing page renders metrics only; no nav cards.
- **The outreach engine is already invisible from the admin landing.** The
  only ways in: (a) typing `/admin/candidates` directly, (b) clicking the
  intra-engine links above. Per the brief ("admin nav link to /admin/candidates
  — find every link/href that points there"), there is nothing to hide.
- **Proposed handling:** Mark this subtask **NO-OP** in the discovery doc.
  Operator confirms; nothing in the engine itself is touched. If the operator
  wants the *intra-engine* links also removed/disabled, that requires a Phase
  1.5 amendment — but per the brief ("preserved entirely; nav link hidden
  only") the intra-engine links are part of "preserved entirely" and stay.

---

## D. Out of scope (explicit re-confirmation)

- The outreach engine code: `src/app/admin/candidates/*`,
  `src/app/api/admin/candidates/*`. Preserved entirely.
- The `candidates`, `outreach_drafts`, `outreach_log` tables. Preserved.
  Currently empty (per ops audit); revisit when M5 (auto-enrichment) ships.
- The single-role / `user_metadata.role` refactor. That is Batch 2.
- The "Employer → Hirer/Buyer" terminology pass. That is Batch 3.
- `profiles.velocity_score` column itself. Stays; reads stay; only writes
  cease.
- `velocity_score` references in the outreach engine and `/api/v1/*` and
  `/api/messages/*` and `/api/apply/*` — all READS for display/email; stay.

---

## E. The `BuilderDashboardClient` velocity-recalc button — LOCKED to E-i

When `/api/velocity/calculate` is deleted (B.6), the call at
`BuilderDashboardClient.tsx:127` returns 404. The handler is wrapped in
`try { … } catch {}` so the failure is swallowed silently and the UI never
updates.

**Resolution (LOCKED 2026-05-22): E-i.** Remove the caller cleanly — delete
the recalculate button + the `triggerVelocityCalc` handler in
`BuilderDashboardClient.tsx`. The `setVelocityScore` initial-render path stays
intact; the score still *displays* from the server-fetched profile, just with
no client-side recompute affordance. This edit is unconditional and listed in
§I.

**Considered and rejected:** an alternative was to leave the silent break
(button stays, click silently 404s, UI never updates). Rejected because it
leaves a dead affordance visible to every logged-in builder — preserving a
button that does nothing visible violates the "no rot" preference and adds no
benefit over the clean removal.

---

## F. Pre-flight verification — results

Read-only steps completed during this discovery prep.

### F.1 — Zero src refs for the three dropped relations

```
$ grep -rn --include='*.ts' --include='*.tsx' --include='*.sql' \
        'claim_submissions\|hire_intakes\|outreach_pipeline_summary' \
        src/ supabase/ scripts/
scripts/v2/enrich-cohort-write.ts:18: * Does NOT mutate: profiles, posts, projects, claim_submissions,
scripts/v2/enrich-cohort-write.ts:19: *   hire_intakes, or anything else.
```

The only matches are **two lines of a comment in one script** stating that the
enrichment adapter does NOT mutate those tables. Zero functional references in
`src/`. Zero references to `outreach_pipeline_summary` anywhere.

**Verdict:** safe to drop. The comment in `enrich-cohort-write.ts` will become
mildly stale (referencing tables that no longer exist) but is informational and
non-load-bearing.

### F.2 — `magic_link` client-side anon reads

```
$ grep -rn --include='*.ts' --include='*.tsx' 'magic_link' src/
src/app/api/webhooks/stripe/route.ts:74:      magic_link: magicLink
```

**One write site, zero reads.** No client-side anon read code touches this
column. The earlier RLS probe confirmed anon-side SELECT exposed the values —
that's exposure-by-grants, not exposure-by-code-use. The single write site is
in the Stripe webhook (server-side, service-role).

⚠ See §B.4 — the write site must be removed before the column is dropped.

### F.3 — `velocity_score` write sites in `src/` (against `profiles`)

```
src/app/join/page.tsx:102                    velocity_score: 0,
src/app/api/velocity/calculate/route.ts:78   .update({ velocity_score: velocityScore })
```

Two writes total. Calculate route is deleted in B.6. Join inserts the literal
zero on first profile creation — remove the field from the insert payload (§I).

(Other `velocity_score` occurrences are `.select(...)`, `.order(...)`, `.gt(...)`,
or read in UI/JSX — these all stay.)

### F.4 — `getAtlasVersion` callers

```
$ grep -rn 'getAtlasVersion' src/ scripts/
src/services/atlas-classifier/roles.ts:20: *   - returned by `getAtlasVersion()` below. NOTE: `getAtlasVersion()`
src/services/atlas-classifier/roles.ts:33: * `getAtlasVersion()` and is an Option-γ action (full role-schema cycle:
src/services/atlas-classifier/roles.ts:83:export function getAtlasVersion(): string {
```

All three hits are in the same file: two header-comment mentions and the
export itself. Zero external callers. Safe to delete.

The header-comment lines will become stale on deletion — the cleaning pass
removes the export and trims the now-incorrect lines.

### F.5 — `/api/scout` current state

```
// Scout has been removed.
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'Scout has been removed.' }, { status: 410 })
}
```

Returns 410, accepts POST only. No callers in `src/` (no `fetch.*scout` matches
beyond the file itself). Safe to hard-delete.

### F.6 — `BuilderDashboardClient` velocity-calc caller

```js
const res = await fetch('/api/velocity/calculate', { method: 'POST' })
if (res.ok) {
  const data = await res.json()
  const newScore = data.velocity_score
  setScoreBreakdown(data.breakdown)
  // …
}
```

Single caller. Will silently no-op after B.6. See §E.

---

## G. DDL block (Supabase Dashboard SQL Editor)

### G.0 — Introspection (operator runs FIRST, pastes result into §G.2 before greenlight)

```sql
-- Capture the outreach_pipeline_summary view definition so the reversal in
-- §G.2 is grounded in actual SQL, not best-effort reconstruction.
SELECT pg_get_viewdef('public.outreach_pipeline_summary'::regclass, true) AS view_definition;

-- Capture any indexes on the two tables being dropped (the OpenAPI introspection
-- used to build this doc only shows PKs; other indexes may exist).
SELECT
  schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname='public'
  AND tablename IN ('claim_submissions', 'hire_intakes')
ORDER BY tablename, indexname;

-- Capture RLS policies (informational — reversal recreates structure, not RLS).
SELECT
  schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('claim_submissions', 'hire_intakes', 'subscriptions');

-- Capture any triggers on these tables.
SELECT
  event_object_schema, event_object_table, trigger_name, action_timing,
  event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema='public'
  AND event_object_table IN ('claim_submissions', 'hire_intakes');
```

Operator: paste outputs into §G.2 (reversal) BEFORE greenlighting §G.1.

### G.1 — Execution DDL (operator runs ONLY after §G.2 is populated)

```sql
BEGIN;

-- BEFORE snapshots (row counts that will be lost)
SELECT 'claim_submissions' AS table_name, count(*) AS before_count FROM public.claim_submissions;
SELECT 'hire_intakes'      AS table_name, count(*) AS before_count FROM public.hire_intakes;
SELECT 'subscriptions.magic_link NOT NULL' AS label, count(*) AS before_count
  FROM public.subscriptions WHERE magic_link IS NOT NULL;

-- Mutations
UPDATE public.subscriptions SET magic_link = NULL WHERE magic_link IS NOT NULL;
ALTER  TABLE public.subscriptions DROP COLUMN magic_link;
DROP   TABLE public.claim_submissions;
DROP   TABLE public.hire_intakes;
DROP   VIEW  IF EXISTS public.outreach_pipeline_summary;

-- AFTER verification
SELECT 'subscriptions.magic_link still exists?' AS check_label,
       EXISTS(SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='subscriptions'
                AND column_name='magic_link') AS still_exists;
SELECT 'claim_submissions still exists?' AS check_label,
       EXISTS(SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='claim_submissions') AS still_exists;
SELECT 'hire_intakes still exists?' AS check_label,
       EXISTS(SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='hire_intakes') AS still_exists;
SELECT 'outreach_pipeline_summary still exists?' AS check_label,
       EXISTS(SELECT 1 FROM information_schema.views
              WHERE table_schema='public' AND table_name='outreach_pipeline_summary') AS still_exists;

COMMIT;
-- If any AFTER check returns still_exists=true, replace COMMIT with ROLLBACK
-- and re-investigate.
```

### G.2 — Reversal SQL (safety net)

**Honest caveat (read before relying on this):** reversal recreates *structure*,
not *data*. Rows in `claim_submissions` / `hire_intakes` and any values
previously in `subscriptions.magic_link` are unrecoverable post-execution
unless backed up before §G.1. Reversal also does not restore RLS policies,
indexes beyond the primary key, or triggers unless the operator first pastes
the §G.0 introspection results into the BLANKS below.

Best-effort structure restoration from OpenAPI introspection captured
2026-05-22:

```sql
BEGIN;

-- Reverse subscriptions.magic_link drop
ALTER TABLE public.subscriptions
  ADD COLUMN magic_link text;

-- Reverse claim_submissions drop
CREATE TABLE public.claim_submissions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamp with time zone NOT NULL DEFAULT now(),
  name                 text NOT NULL,
  email                text NOT NULL,
  location             text,
  linkedin_url         text,
  github_url           text,
  twitter_url          text,
  website_url          text,
  atlas_roles          text[] NOT NULL,
  verticals            text[],
  domain_practitioner  boolean DEFAULT false,
  domain_field         text,
  proof_of_work        text NOT NULL,
  engagement_modes     text[] NOT NULL,
  comp_expectation     text,
  notes                text,
  status               text NOT NULL DEFAULT 'new',
  thomas_notes         text,
  vetted_at            timestamp with time zone,
  routable             boolean DEFAULT false,
  user_agent           text,
  referrer             text
);
-- [BLANK — paste §G.0 index DDL for claim_submissions here, if any]
-- [BLANK — paste §G.0 RLS policy DDL for claim_submissions here, if any]
-- [BLANK — paste §G.0 trigger DDL for claim_submissions here, if any]

-- Reverse hire_intakes drop
CREATE TABLE public.hire_intakes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamp with time zone NOT NULL DEFAULT now(),
  symptom              text NOT NULL,
  prior_role_title     text,
  urgency              text NOT NULL,
  budget               text NOT NULL,
  email                text NOT NULL,
  name                 text NOT NULL,
  company              text NOT NULL,
  role                 text NOT NULL,
  linkedin_url         text,
  status               text NOT NULL DEFAULT 'new',
  thomas_response_at   timestamp with time zone,
  thomas_notes         text,
  outcome              text,
  user_agent           text,
  referrer             text
);
-- [BLANK — paste §G.0 index DDL for hire_intakes here, if any]
-- [BLANK — paste §G.0 RLS policy DDL for hire_intakes here, if any]
-- [BLANK — paste §G.0 trigger DDL for hire_intakes here, if any]

-- Reverse outreach_pipeline_summary view drop
-- [BLANK — paste §G.0 pg_get_viewdef() output here verbatim, wrapped in
--          CREATE OR REPLACE VIEW public.outreach_pipeline_summary AS …]

COMMIT;
```

---

## H. Approval gate (operator signs off explicitly per item)

Operator: tick each item before any execution.

- [x] B.1 — DROP `claim_submissions`
- [x] B.2 — DROP `hire_intakes`
- [x] B.3 — DROP VIEW `outreach_pipeline_summary` (and §G.0 introspection
        outputs pasted into §G.2 BLANKS)
- [x] B.4 — NULL `subscriptions.magic_link`, then DROP COLUMN — **paired with
        the stripe-webhook write-removal in §I, code-first**
- [x] B.5 — Delete `src/app/leaderboard/page.tsx`
- [x] B.6 — Delete `src/app/api/velocity/calculate/route.ts`
- [x] B.7 — Delete `src/app/api/scout/route.ts`
- [x] B.8 — Delete `getAtlasVersion()` from `src/services/atlas-classifier/roles.ts`
- [x] C.1 — Stop writing `profiles.velocity_score` (remove from
        `src/app/join/page.tsx:102` insert payload)
- [x] C.2 — Admin nav-link hide — **CONFIRM NO-OP per §C.2** (no admin-landing
        link to /admin/candidates exists; intra-engine links are part of
        preserved code per "engine preserved entirely")
- [x] E    — LOCKED to E-i: remove velocity-recalc button + handler from
        BuilderDashboardClient. E-ii rejected.

**Operator approval: granted 2026-05-22 — all items approved as a single pass.
E locked to E-i. §I includes scripts/v2/enrich-cohort-write.ts comment
cleanup. §J includes explicit Commit-A→Commit-B verification gate.**

---

## I. Code deletion + edit plan (for Commit A)

### Hard deletes

```
git rm src/app/leaderboard/page.tsx
git rm src/app/api/velocity/calculate/route.ts
git rm src/app/api/scout/route.ts
```

### Edits

**`src/services/atlas-classifier/roles.ts`** — remove `getAtlasVersion()`
export (function body) and trim the two header-comment lines that reference it
(lines 20, 33). Keep the rest of the file intact (still parses role catalog +
exports `getAtlasRoles`, `ROLE_TAXONOMY_VERSION`).

**`src/app/api/webhooks/stripe/route.ts:74`** — remove the `magic_link: magicLink`
field from the subscription row insert. Keep the magic-link generation if it's
used elsewhere in the same handler (it's also passed to the welcome email);
just don't persist it to the DB. **This edit must land in Commit A before the
DDL in Commit B executes.**

**`src/app/join/page.tsx:102`** — remove the `velocity_score: 0` field from
the profile insert payload. Column has a default; new rows can omit the field.

**`src/app/dashboard/BuilderDashboardClient.tsx`** — remove the velocity-recalc
button + the `triggerVelocityCalc` handler (§E locked to E-i). Leave the
`setVelocityScore` initial-render path intact (the score still *displays*
from server-fetched profile; just no client-side recompute button).

**`scripts/v2/enrich-cohort-write.ts`** lines 18-19 — update the header
comment to remove the now-stale `claim_submissions`, `hire_intakes` references.
Replace with an accurate post-drop list of tables the adapter does not mutate.
Trivial 2-line edit; prevents documentation rot (§L.4 mitigation).

### Verifications during Commit A

- `npx tsc --noEmit` — clean.
- `npm run build` — clean (routes changed: 3 deletions).
- Spot-check: `/leaderboard`, `/api/velocity/calculate`, `/api/scout` all build
  as 404 (no route files).
- Spot-check: `/admin/candidates` still loads (route untouched).
- Spot-check: build feed, profile page, talent directory still render
  velocity score as before (reads untouched).

---

## J. Execution sequence (gated on §H approval)

**Two commits, executed in order. Each verifiable independently.**

### Commit A — code deletions + edits
1. `git rm` the three route/page files (§I hard deletes).
2. Edit the five files (§I edits).
3. `npx tsc --noEmit` clean + `npm run build` clean.
4. Local dev verification: surfaces above behave as §I expects.
5. Commit, push.

### Between Commit A and Commit B — production verification gate

After Commit A pushes to main:

1. Confirm Vercel deploy green on main (Vercel dashboard, latest commit, green checkmark).
2. Run one test Stripe checkout end-to-end:
   - Use a fresh email
   - Complete checkout via Stripe test card
   - Verify webhook fires cleanly (no errors in Vercel function logs for /api/webhooks/stripe)
   - Verify magic link is delivered via email (Resend logs or inbox check)
   - Verify subscription row appears in Dashboard (status='active', magic_link column present but value can be anything — column drop hasn't happened yet)
3. Only after all three verifications pass: proceed to Commit B §G.0 introspection.

If any verification fails: ROLLBACK Commit A via git revert, do NOT proceed to Commit B, surface the failure to operator + architect for review.

### Commit B — DDL via Supabase Dashboard + record-of-execution doc commit
1. Operator runs §G.0 introspection in Dashboard SQL Editor.
2. Operator pastes results into §G.2 BLANKS.
3. Operator runs §G.1 in Dashboard SQL Editor.
4. Operator verifies AFTER checks all return `still_exists=false`.
5. Operator amends this discovery doc with:
   - timestamp of Commit B execution
   - BEFORE row counts captured
   - confirmation that all AFTER checks passed
6. Commit, push (this commit contains the doc update only; DDL is not
   src-tracked).

**Important:** Commit A *must* land before Commit B. The Stripe webhook write
removal in Commit A is what makes the §G.1 DROP COLUMN safe; running G.1 first
would break the next employer signup mid-flight.

---

## K. Verification — what 'green' looks like after both commits

- `npx tsc --noEmit` clean
- `npm run build` clean
- `/leaderboard` returns 404 on prod
- `/api/scout` returns 404 (no longer 410 — file is gone)
- `/api/velocity/calculate` returns 404 on prod
- `/admin/candidates` still loads when typed directly (route preserved); not
  linked from any admin-landing surface (confirmed already absent per §C.2)
- Supabase Dashboard table list no longer shows `claim_submissions`,
  `hire_intakes`, `outreach_pipeline_summary`
- `subscriptions` table no longer has a `magic_link` column
- Stripe checkout flow: end-to-end test signup → confirm webhook fires → no
  error from missing `magic_link` column → magic link still delivered via
  email (handler still generates the link string, just doesn't persist it)
- Reversal SQL in §G.2 has been visually reviewed against §G.0 introspection
  outputs (operator confirms in §H tick boxes)

---

## L. Risks / honest notes

1. **Reversal restores structure, not data.** If `claim_submissions` or
   `hire_intakes` contains rows worth keeping (per row-count check in §G.1
   BEFORE snapshot), operator decides whether to export-to-CSV before DROP.
2. **Reversal restores structure, not RLS policies, not indexes beyond PK, not
   triggers.** Operator MUST run §G.0 and paste results into §G.2 BLANKS
   before greenlighting §G.1, or post-reversal these tables will be
   policy-less and trigger-less.
3. **Stripe webhook write removal is load-bearing.** The Stripe webhook is a
   live revenue surface; any error in it costs paid signups. Commit A must
   land *and be verified deployed to prod* before §G.1 runs.
4. **`enrich-cohort-write.ts` comment** at lines 18-19 — addressed in §I edits:
   the comment is updated as part of Commit A to remove the stale
   `claim_submissions`, `hire_intakes` references. No residual rot.
5. **`atlas-classifier/roles.ts` comment trim** is a paired edit, not just an
   export removal — leaving the stale header-comment lines violates the
   "no rot" preference.
6. **`BuilderDashboardClient` recalc button** — §E locked to E-i (clean
   removal). The alternative (leave the button as a silent 404) was considered
   and rejected; see §E.
