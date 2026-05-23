# DISCOVERY — Batch 7b-pre: Kill the scraper-DM outreach engine

Phase 1 discovery doc. Read-only research. No code mutation, no DDL,
no commits until operator signs off Section H below.

Prepared at HEAD `fc114eb` on 2026-05-23.

Source for the kill scope: `docs/decisions/AUDIT_alignment_5_bucket.md`
§9 ("The outreach engine — keep, kill, or migrate? Currently
operational tooling. Not in 2026-05-22 lock."). Operator decision:
**kill**, same discipline as Batch 1 KILL pass.

---

## A. Purpose

The 5-bucket alignment audit placed 8 items in AMBIGUOUS pending an
operator decision: the scraper-DM outreach engine that predates the
2026-05-22 Customer/Entity/Mode/Role lock. Operator has confirmed
**kill**, not migrate.

Goal: surgical removal — 8 audit-identified items plus 2 co-located
client components found during this discovery — leaving every other
surface byte-identical. Two-phase per the Batch 1 protocol: discovery
first, operator §H approval, then execution.

**Out of scope (explicitly preserved):**
- `/api/jobs/xpost` (auto-cross-post jobs OUT to X; distribution, not scraper-DM)
- Any "share to X" / social-share buttons on profiles, build feed, posts
- `claim_submissions` and `hire_confirmations` (separate AMBIGUOUS retention questions)
- `/client/inbox`, `/get-found/[id]`, `/api/client-magic-link` (terminology/drift, separate questions)

---

## B. The 10 kill targets (8 from audit + 2 co-located components found here)

| # | Path | Size | Purpose | Source |
|---|---|---|---|---|
| 1 | `src/app/admin/candidates/page.tsx` | 13 lines | Server-component admin gate → renders `OutreachQueueClient` | Audit §1 |
| 2 | `src/app/admin/candidates/OutreachQueueClient.tsx` | 297 lines | **Client UI** — outreach queue, draft generation, log actions. **Found during this discovery (NOT in audit's 8-item list).** Imported only by item #1. | This discovery |
| 3 | `src/app/admin/candidates/import/page.tsx` | 13 lines | Server-component admin gate → renders `ImportClient` | Audit §1 |
| 4 | `src/app/admin/candidates/import/ImportClient.tsx` | 257 lines | **Client UI** — CSV import flow. **Found during this discovery (NOT in audit's 8-item list).** Imported only by item #3. | This discovery |
| 5 | `src/app/api/admin/candidates/draft/route.ts` | 261 lines | LLM-drafts outreach copy for a candidate | Audit §2 |
| 6 | `src/app/api/admin/candidates/import/route.ts` | 237 lines | Bulk CSV import into `candidates` table | Audit §2 |
| 7 | `src/app/api/admin/candidates/log/route.ts` | 194 lines | Writes outreach actions to `outreach_log` | Audit §2 |
| 8 | `src/app/api/admin/candidates/next/route.ts` | 134 lines | Sort + serve next candidate (tier ASC, priority ASC, velocity DESC) | Audit §2 |
| 9 | DB table `outreach_log` | — | Outreach action history; written only by item #7, read only by item #8 | Audit §3 |
| 10 | DB table `candidates` | — | Candidate queue; written by items #6 + #7, read by items #5, #7, #8 | Audit §3 |

**Why the audit missed #2 and #4:** the 5-bucket audit indexed by route directory (`page.tsx`) and API directory (`route.ts`). The client components (`OutreachQueueClient.tsx`, `ImportClient.tsx`) live as co-located React `.tsx` files alongside the pages — they aren't separate routes or APIs, so they didn't appear in the directory inventory. Both are imported exclusively by their sibling `page.tsx`. Killing the pages without killing the clients would leave dangling imports. Both must be killed together.

---

## C. Code kill scan — blockers + reachability

### C.1 — Inbound references to `/admin/candidates` routes

Grep across `src/` and `scripts/`, excluding the engine's own directory:

```
grep -rn "/admin/candidates" src scripts | \
  grep -v "src/app/admin/candidates" | grep -v "src/app/api/admin/candidates"
→ (no results)
```

**No external nav, no redirect, no fetch references** from anywhere outside the engine itself. The `OutreachQueueClient.tsx` and `ImportClient.tsx` link to each other (`<Link href="/admin/candidates">` and `<Link href="/admin/candidates/import">`); those are intra-engine and die with the engine.

### C.2 — `/admin` index page

```
grep -n "candidates\|Outreach\|/admin/candidates" src/app/admin/page.tsx
→ (no results)
```

**The admin index does not link to the outreach engine.** No nav cleanup required there.

### C.3 — Inbound references to the API endpoints

The only callers are `OutreachQueueClient.tsx` (calls `next`, `draft`, `log`) and `ImportClient.tsx` (calls `import`). Confirmed via grep at line numbers `OutreachQueueClient.tsx:66, 97, 121` and `ImportClient.tsx:92`. All intra-engine; all die with the engine.

### C.4 — Exported symbols from the kill targets

```
grep -hE "^export (interface|type|const|function)" \
  src/app/admin/candidates/OutreachQueueClient.tsx \
  src/app/admin/candidates/import/ImportClient.tsx \
  src/app/api/admin/candidates/*/route.ts
→ (no results)
```

**No types, interfaces, or shared utilities exported from any of the 8 code files.** No downstream import to break.

### C.5 — Scripts and tests touching the tables

```
grep -rn "outreach_log\|from('candidates')\|public\.candidates\|public\.outreach_log" scripts
→ (no results)
```

**No script in `scripts/v2/` or elsewhere writes to or reads from these tables.** No verify-step, seed, or backfill script depends on the engine.

### C.6 — Migration state for `outreach_log` and `candidates`

```
grep -l "outreach_log\|candidates" supabase/migrations/*.sql
→ (no results)
```

**Neither table is in `supabase/migrations/`.** Both were applied via Dashboard SQL Editor per AGENTS.md invariant #4 (the standard practice for pre-Batch-1 tables). Consequences for reversal:

- The canonical CREATE TABLE statements **do not exist in the repo**.
- Reversal SQL must be captured from `information_schema` BEFORE DROP, OR reconstructed from the engine's code (column lists are visible in `/api/admin/candidates/import/route.ts` insert path and `/api/admin/candidates/next/route.ts` select list).
- The Phase-2 DDL block must include a "capture schema first" step. See §I.

### C.7 — One false-positive grep hit worth flagging

`src/app/u/[username]/page.tsx:528` contains the copy "contact candidates directly" in the hirer CTA. **This is marketing copy, not a code reference to the `candidates` table.** No touch required.

### C.8 — Summary: zero code-side blockers

Every consumer of the 8 code files and 2 tables is internal to the engine. No nav link, no admin index reference, no script, no type export, no test. The kill is a clean cut.

---

## D. DB kill scan — read-only confirmation steps before DROP

The operator must run these in Supabase Dashboard before Phase 2 DDL.
Output of each is paste-back input to the reversal block.

### D.1 — Row counts (read-only)

```sql
SELECT 'outreach_log' AS table_name, count(*) AS rows FROM public.outreach_log
UNION ALL
SELECT 'candidates',                 count(*)         FROM public.candidates;
```

Expected per SHIPSTACKED_ARCHITECTURE_MAP.md §4.2: both tables have some operational data (the outreach engine ran). Operator confirms whether row preservation is required (it's not — kill = delete).

### D.2 — FK constraints pointing INTO these tables (would block DROP)

```sql
SELECT
  conname AS constraint_name,
  conrelid::regclass AS source_table,
  confrelid::regclass AS target_table,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE confrelid IN ('public.outreach_log'::regclass, 'public.candidates'::regclass)
  AND contype = 'f'
ORDER BY source_table;
```

Expected: zero rows (no other table references either via FK). If any row returns, the DROP must include `CASCADE` OR the referencing table must be killed first. Operator confirms.

### D.3 — Capture schemas for the reversal SQL (read-only)

Reversal requires the original CREATE TABLE shape. Since these aren't in `supabase/migrations/`, capture from live now:

```sql
-- For each table, dump column definitions
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('outreach_log', 'candidates')
ORDER BY table_name, ordinal_position;

-- Plus indexes
SELECT
  schemaname || '.' || tablename AS tbl,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('outreach_log', 'candidates')
ORDER BY tbl, indexname;

-- Plus RLS policies
SELECT
  schemaname || '.' || tablename AS tbl,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('outreach_log', 'candidates')
ORDER BY tbl, policyname;
```

Output of all three queries is the reversal artifact. Operator saves it OUTSIDE the repo (per AGENTS.md "Zero secrets" — these queries have no secrets but the data itself may have outreach lists with email addresses, so preserve discretion). Reconstructed reversal SQL goes in the discovery-doc commit message.

---

## E. Kill scope summary

**Code (8 files, ~1,109 lines total):**
- 2 server-component page.tsx (admin gate + render)
- 2 client React components (the actual UI)
- 4 API route handlers (draft / import / log / next)

**DB (2 tables, schema-only — row data is operational and gets deleted with `DROP TABLE`):**
- `outreach_log` — outreach action history
- `candidates` — candidate queue

**Net effect:**
- `/admin/candidates` → 404 (route directory removed)
- `/admin/candidates/import` → 404
- `/api/admin/candidates/draft`, `/import`, `/log`, `/next` → 404
- `public.outreach_log`, `public.candidates` → no longer exist

---

## F. Out of scope (explicit, per operator brief)

The 5-bucket audit flagged 12 AMBIGUOUS items. This batch kills only the 8
that form the scraper-DM engine. The remaining 4 + 2 retention questions are
**NOT touched**:

- `/client/inbox` + `/api/client-magic-link` — terminology drift question, separate batch
- `/get-found/[id]` — purpose-unclear route, separate batch
- `/api/jobs/xpost` — distribution mechanism (jobs OUT to X), NOT scraper
- `claim_submissions` table retention — separate LEGACY-KILL retention question
- `hire_confirmations` table retention — separate retention question

Plus all the audit's WEAK and LEGACY-KILL items remain untouched in this batch.

---

## G. Reachability — pre-existing test/seed/fixture references

Confirmed clean per §C.5. No scripts, no fixtures, no seeds reference
the kill targets. The cohort enrichment scripts (`enrich-cohort-write.ts`,
`enrich-by-usernames.ts`) operate on `profiles` + `proof_receipts` exclusively
— no overlap with `candidates` or `outreach_log`.

---

## H. Approval gate (operator decides)

Three decisions to lock:

- [ ] **H1 — Confirm the 10-item scope** (8 audit-identified + 2 co-located client components per §B). Either:
      - (a) Approve all 10 as scoped here, OR
      - (b) Approve only the original 8 and instruct how to handle the dangling imports from `OutreachQueueClient.tsx` / `ImportClient.tsx` separately.
      **Recommendation: (a) — they belong together.**
- [ ] **H2 — Confirm DROP TABLE strategy.** Either:
      - (a) Plain `DROP TABLE public.outreach_log; DROP TABLE public.candidates;` (works if §D.2 returns zero FKs), OR
      - (b) `DROP TABLE … CASCADE` (drops dependent objects too — only needed if §D.2 surfaces FKs).
      **Sequencing: run §D.2 first; pick (a) or (b) based on the result.**
- [ ] **H3 — Confirm reversal-artifact handling.** The captured schemas from §D.3 are the only reversal path (no migrations exist). Either:
      - (a) Paste the §D.3 output into this discovery doc's §L "Reversal" section before Phase 2 DDL runs, AND into the kill commit message, OR
      - (b) Save the §D.3 output OUTSIDE the repo (since outreach data may contain email addresses) AND record in the commit message that the reversal artifact lives at `<operator-named-location>`.
      **Recommendation: (b) — the row data isn't relevant to reversal, but the schema definitions are; storing outside the repo avoids any chance of leaking row metadata via git history if the schema-capture query were ever re-run with data included.**

---

## I. Phase 2 execution plan (gated on §H)

Three separate commits + one Dashboard SQL step, in this order:

### I.1 — Code kill commit

```
rm src/app/admin/candidates/page.tsx
rm src/app/admin/candidates/OutreachQueueClient.tsx
rm src/app/admin/candidates/import/page.tsx
rm src/app/admin/candidates/import/ImportClient.tsx
rm -rf src/app/admin/candidates/        # empties the parent directory
rm src/app/api/admin/candidates/draft/route.ts
rm src/app/api/admin/candidates/import/route.ts
rm src/app/api/admin/candidates/log/route.ts
rm src/app/api/admin/candidates/next/route.ts
rm -rf src/app/api/admin/candidates/    # empties the parent directory
```

Gates: `npx tsc --noEmit` clean + `npm run build` clean.

Commit: `feat(kill): remove scraper-DM outreach engine routes + APIs (Batch 7b-pre)`

Push.

### I.2 — DDL kill SQL (operator Dashboard step — between commits)

After §D.1, §D.2, §D.3 captures, run:

```sql
-- ─────────────────────────────────────────────────────────────────────────
-- Batch 7b-pre — drop scraper-DM outreach engine tables.
-- Reversal: §L of this doc (or operator's saved location per H3).
-- Pre-flight §D.2 returned zero FK constraints (else use CASCADE).
-- ─────────────────────────────────────────────────────────────────────────
BEGIN;

-- BEFORE — final row counts for the record
SELECT 'outreach_log' AS t, count(*) FROM public.outreach_log
UNION ALL
SELECT 'candidates',         count(*) FROM public.candidates;

-- DROP — order matters only if FKs exist; per §D.2 they don't
DROP TABLE IF EXISTS public.outreach_log;
DROP TABLE IF EXISTS public.candidates;

-- AFTER — confirm both gone (returns NULL when table doesn't exist)
SELECT to_regclass('public.outreach_log')  AS outreach_log_oid,
       to_regclass('public.candidates')    AS candidates_oid;

COMMIT;
```

Operator pastes; AFTER select should show two NULLs.

### I.3 — Audit doc update commit

Update `docs/decisions/AUDIT_alignment_5_bucket.md` to move the 8 items (plus the 2 co-located components) from AMBIGUOUS to a new "Killed (Batch 7b-pre)" section, with a one-line entry per item. Decrement the AMBIGUOUS bucket count by 8 (the audit didn't count the 2 co-located components as separate items in §10). Update §10 totals.

Commit: `docs(audit): record scraper-DM outreach engine kill (Batch 7b-pre)`

Push.

### I.4 — Verification

- `npm run build` clean after I.1
- Vercel deploy green
- Dashboard query confirms tables dropped after I.2: `SELECT to_regclass('public.outreach_log');` returns NULL
- `verify-agent-card.ts --base https://shipstacked.com` still passes (no public surface broken; engine was admin-only)
- Visit `/admin/candidates` on prod → 404
- Visit `/admin` index on prod → unchanged (no nav link existed)

---

## J. Reversal

### J.1 — Code (full reversal)

`git revert <SHA>` of the I.1 commit. Files reappear in working tree.

### J.2 — DDL (reversal requires schema capture)

Per §D.3 + §H3, the reversal SQL is whichever of these the operator picked:

**Option (a):** the §D.3 output is pasted into §L below before Phase 2 runs.

**Option (b):** the §D.3 output lives at the operator's saved external
location; the commit message of the I.1 code kill records the location.

In either case, the reversal block is:

```sql
BEGIN;
-- CREATE TABLE public.candidates (... reconstructed from §D.3 ...);
-- CREATE TABLE public.outreach_log (... reconstructed from §D.3 ...);
-- CREATE INDEX ... (from §D.3 pg_indexes output);
-- CREATE POLICY ... (from §D.3 pg_policies output);
COMMIT;
```

Row data is NOT recoverable from DROP — that's an accepted loss for the kill.

### J.3 — Audit doc

`git revert` of the I.3 commit re-categorizes the items as AMBIGUOUS.

---

## K. Risks / honest notes

1. **Audit miss on co-located components.** The 5-bucket audit indexed by route/API directory; React component files co-located in those directories aren't routes or APIs. This pattern likely affects future kill scopes too. Future audits should grep for sibling `*.tsx` / `*.ts` files in any flagged route directory.

2. **Tables not in `supabase/migrations/`.** Reversal requires capturing schema from live before DROP. This is a one-shot opportunity — once dropped without capture, structural reversal requires reconstruction from the engine's code (column lists are inferrable from `/api/admin/candidates/import/route.ts` insert + `/api/admin/candidates/next/route.ts` select). Mitigated by the §D.3 capture step.

3. **Operational data loss is intentional.** Whatever outreach history + candidate queue exists in production is lost on DROP. This is the kill's purpose per the audit's "kill, not migrate" decision. No backup is taken because the goal is data deletion plus schema deletion. Operator confirms acceptance.

4. **Email addresses in `candidates` table.** Per the engine's purpose (outreach to externally-sourced builders), the `candidates` table likely contains email + name + GitHub handle of people who never signed up for ShipStacked. DROP deletes this. This is the correct privacy-respecting outcome. If the operator wants to log the deletion for any record-keeping, capture row count to commit message but NOT row content.

5. **No `verify-agent-card.ts` impact.** The outreach engine was admin-only; no public surface declared it as a skill in the AgentCard. The mechanized accuracy guarantee (INV8) is unaffected.

6. **No effect on the engine itself.** The `/api/enrich` Batch 5 orchestrator, the receipt-generation pipeline, the `/paste` flow, the cohort enrichment scripts — none of these touch `outreach_log` or `candidates`. The "engine" being killed here is the scraper-DM outreach engine, not the enrichment engine. These are entirely separate systems.

---

## L. Reversal artifact (filled by operator per §H3 option (a), OR pointer if option (b))

```
[CAPTURED FROM §D.3 BEFORE PHASE 2 — paste here OR reference external location]

— outreach_log schema —
[information_schema.columns output for public.outreach_log]

— candidates schema —
[information_schema.columns output for public.candidates]

— indexes —
[pg_indexes output]

— RLS policies —
[pg_policies output]
```

If §H3 = (b): reversal artifact saved at `<operator-named-location>`. Recorded in I.1 commit message.

---

End of doc. HALT here. Awaiting operator §H approval before Phase 2.
