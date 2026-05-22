# DISCOVERY — Batch 3: "Employer" → "Hirer/Buyer" terminology pass

Phase 1 discovery doc. Read-only research. No code mutation, no commits until
operator signs off Section H below.

Prepared at HEAD `94cf847` on 2026-05-22.

---

## A. Purpose

Batch 3 executes the standing copy rule locked in
`SESSION_2026-05-19_DECISIONS.md` UPDATE 2026-05-22: **"Employer" → "Hirer"
or "Buyer" everywhere in product surfaces.** Now that Batch 2 dismantled the
single-role primitive and `modes.hirer` is the canonical code-side name, the
codebase is internally consistent enough that a terminology pass is safe.

**Honest framing:** this is a copy + code-symbol refactor across ~56 files
in `src/` with 263 total "employer" occurrences, plus a handful of refs in
`scripts/`, `supabase/`, and `docs/`. Mostly mechanical, but several
non-trivial decisions need explicit operator sign-off:
- Published JSON-LD `@type: 'shipstacked:Employer'` literal — backwards-compat or rename?
- URL paths `/employer`, `/employers`, `/api/employer/*` — rename + 308 redirect, or leave?
- DB column references in code (`employer_email`, `employer_id`,
  `employer_profiles` table) — **leave as-is** (column rename is a destructive
  migration, deferred to a later batch per operator brief).
- Resend audience env var `RESEND_SEGMENT_EMPLOYERS` — rename or alias?
- Historical decision/audit docs — touch or leave as historical record?

Verifiable as: **`grep -rn "employer" src/` after this batch returns ONLY**:
(a) DB column references (`.from('employer_profiles')`, `.eq('employer_email', …)`)
(b) Published JSON-LD identifiers (if operator chooses backwards-compat)
(c) Historical references in docs that are explicitly tagged "historical / pre-Batch-3"

Out of scope (explicit, see §C): /join 4-card router (Batch 4),
`employer_profiles` table consolidation into entities (later batch), DB
column renames (separate destructive batch), RLS rollout.

---

## B. Scope — 7 categories of "employer" occurrences

Each category has a different cost/risk profile. The doc breaks them out so
the operator can approve per-category at §H.

### B.1 — URL paths (5 routes, 1 lib file location)

| Path | Current | Proposed rename | Redirect needed? |
|---|---|---|---|
| `src/app/employer/page.tsx` | `/employer` route | `/hirer/page.tsx` → `/hirer` | **YES — 308 from `/employer` → `/hirer`** |
| `src/app/employer/messages/page.tsx` | `/employer/messages` (308 stub) | already stubs to `/messages?as=hirer`; could move the stub file too or just leave it where it is | **N/A — already a stub** |
| `src/app/employer/EmployerDashboardClient.tsx` | code-only filename | `src/app/hirer/HirerDashboardClient.tsx` | no |
| `src/app/employers/page.tsx` | `/employers` marketing landing | `/hirers/page.tsx` → `/hirers` (or keep as `/hirers`) | **YES — 308 from `/employers` → `/hirers`** |
| `src/app/api/employer/cancel/route.ts` | `/api/employer/cancel` | `/api/hirer/cancel` | **YES — POST endpoint, but client caller can be updated atomically in same commit. No external POSTers, so 308 not strictly needed.** Recommend rename + caller update; no 308. |
| `src/app/api/employer-logo/route.ts` | `/api/employer-logo` | `/api/hirer-logo` | Same as above — no external POSTers. Rename + caller update. |
| `src/lib/jsonld/employer-org.ts` | code-only path | `src/lib/jsonld/hirer-org.ts` | no |

**308 redirects to add** (new minimal route handlers at the old paths):
- `src/app/employer/page.tsx` becomes a 308 stub `permanentRedirect('/hirer')`
  (same pattern as the Batch 2 `/employer/messages` stub)
- `src/app/employers/page.tsx` becomes a 308 stub `permanentRedirect('/hirers')`

The `/employer/messages` stub from Batch 2 stays where it is (308 → `/messages?as=hirer`) — it's already serving the redirect purpose.

**SEO impact:** the operator's site is small enough that the SEO cost of URL
renames is low. The 308s preserve link equity for any cached references.

### B.2 — Code symbols (function names, type names, variable names, CSS classes)

Mechanical rename, type-system-enforced. TypeScript catches every consumer.

Inventory of named symbols:

**JSON-LD module:**
- `buildEmployerOrgJsonLd` → `buildHirerOrgJsonLd`
- `EmployerOrgInput` → `HirerOrgInput`
- `EmployerOrgJsonLd` → `HirerOrgJsonLd`
- `employerOrgId` → `hirerOrgId` (in `src/lib/jsonld/context.ts`)
- File rename: `src/lib/jsonld/employer-org.ts` → `src/lib/jsonld/hirer-org.ts`
- Import sites: `src/app/company/[slug]/page.tsx`, `src/lib/jsonld/job-posting.ts`

**Types module:**
- `EmployerProfile` type in `src/lib/types.ts` → `HirerProfile`

**Variable names (representative — TypeScript will surface all):**
- `employerProfiles` → `hirerProfiles`
- `totalEmployers` → `totalHirers`
- `activeEmployerConvs` → `activeHirerConvs`
- `employerContactRate` → `hirerContactRate`
- `isPaidEmployer` → `isPaidHirer`
- `hasEmployerProfile` → `hasHirerProfile`
- `employerEmails` (local var) → `hirerEmails`
- `empMap` / `empProfile` (abbreviated forms) → `hirerMap` / `hirerProfile`

**CSS class names** (in `src/app/page.tsx`):
- `.employer-section` → `.hirer-section`
- `.employer-inner` → `.hirer-inner`

**Realtime channel name** (Batch 2 already changed): no remaining `employer-messages` channel name (verified).

### B.3 — DB column references in code (LEAVE AS-IS this batch)

Per operator brief: "DO NOT rename the column itself — would require
destructive migration." Code stays reading the old column names; only the
display copy around them changes.

Tables/columns that remain `employer_*`:
- `employer_profiles` table (13 code refs across 12 files)
- `employer_email` column on `conversations`, `jobs`, `applications`,
  `saved_profiles`, `hire_confirmations`
- `employer_id` column (if it exists — code references suggest it does)
- `employer_confirmed` column on `hire_confirmations`

**Total: ~70 DB column refs across `src/` that stay unchanged.** These
become the only "employer" occurrences in code post-Batch-3, except for
explicitly-decided exceptions (see §B.4–B.6).

A follow-up batch (after Batch 4 and the `employer_profiles` consolidation)
can do the destructive column rename if the operator wants. Flagged here
for the roadmap.

### B.4 — Published JSON-LD identifiers — operator decides

**The one external-facing concern.** Current behaviour:

```typescript
// src/lib/jsonld/employer-org.ts
'@type': ['Organization', 'shipstacked:Employer']  // PUBLISHED LITERAL
```

The `shipstacked:Employer` namespaced type is part of the published
structured data. External consumers (search engines, agents reading the
JSON-LD endpoints, the AgentCard skills list) may key off this literal.

The `@id` URL is `${CANONICAL_HOST}/company/${slug}` — no "employer" string
in the URL itself, so renaming the helper name `employerOrgId →
hirerOrgId` doesn't change published @id values.

**LOCKED 2026-05-22: (B.4-i) — keep `shipstacked:Employer` as-is for
backwards compat.** Code symbol renames stay internal; the published @type
literal doesn't change. Tagged with a code comment explaining the
historical-stability decision (see §M.3 for the comment wording template).
Re-evaluate when external adoption is verifiably non-zero, or when migrating
the namespace.

**Considered and rejected:** (ii) rename to `shipstacked:Hirer` cleanly
(breaking change for any external consumer keying off the type); (iii)
dual-emit `['Organization', 'shipstacked:Employer', 'shipstacked:Hirer']`
(bigger payload; downstream multi-type-array handling inconsistent).

### B.5 — Resend audience env var

```typescript
process.env.RESEND_SEGMENT_EMPLOYERS  // 2 refs in webhooks/stripe/route.ts
```

The env var name is set in Vercel project settings (not in repo).

**LOCKED 2026-05-22: (B.5-iii) — leave entirely.** Env var stays
`RESEND_SEGMENT_EMPLOYERS`; code stays `process.env.RESEND_SEGMENT_EMPLOYERS`.
No rename. Deferred to a future deploy-coordinated change. Tagged with a
code comment at the reference sites documenting the deferred-rename intent
(see §M.4 for the comment wording template).

**Considered and rejected:** (i) rename env var to `RESEND_SEGMENT_HIRERS`
(deploy-coordination risk — code-first deploy would fail webhook audience
adds until Vercel env updated); (ii) compat shim
`process.env.RESEND_SEGMENT_HIRERS ?? process.env.RESEND_SEGMENT_EMPLOYERS`
(adds permanent legacy-fallback drag for cosmetic alignment).

### B.6 — Zod schema + SQL enum values: `'employer'` as attestor role

```typescript
// src/schemas/proof-receipt-v0.1.ts:245
export const AttestorRole = z.enum(['client', 'employer', 'peer', 'platform']);

// src/lib/types.ts uses this
// supabase/migrations/...sql also has:
//   attestor_role text not null check (attestor_role in ('client','employer','peer','platform'))
```

The string `'employer'` here is a stored enum value on `attestations` rows.
Renaming the enum value `'employer'` → `'hirer'` is a **destructive
migration** (existing rows with `'employer'` would fail the CHECK constraint
after rename).

**LOCKED 2026-05-22: (B.6-i) — leave the enum value `'employer'` in zod +
SQL.** No `attestations` rows exist today (per prior audit — the table was
empty); when attestations start being written, the new enum value can be
added in the same commit that writes them. Display copy that surfaces this
value renders as "Hirer" via a display-time map. Tagged with a code comment
at both the zod schema site and the SQL migration documenting the deferred-
rename intent (see §M.5 for the comment wording template).

**Considered and rejected:** (ii) additively add `'hirer'` to the enum and
prefer it for new writes (premature — no writers yet; defer until the
attestation write path is built); (iii) rename via destructive migration
(out of scope per operator brief).

### B.7 — Comments and copy

The bulk of the visible changes. Every user-facing string literal mentioning
"Employer", "employer", "EMPLOYER" or related copy gets rewritten. Every
code comment that uses "employer" descriptively gets rewritten. **Pure
mechanical edit.**

Rough estimate: ~80–100 copy strings + ~20–30 comments across the 56 files.

The Hirer-vs-Buyer choice (per §F) governs which replacement word goes
where.

---

## C. Out of scope (explicit re-confirmation)

- **/join 4-card router and buyer-only entity signup** — Batch 4.
- **`employer_profiles` table consolidation into entities** — later batch.
- **DB column renames** (`employer_email` → `hirer_email` etc.) — destructive
  migration, separate batch. Code stays reading the old column names.
- **Zod/SQL enum value rename** (`'employer'` in attestor_role) — destructive
  migration, deferred.
- **Resend env var rename** in Vercel project settings — operator-deferred per
  §B.5 recommendation.
- **Published JSON-LD `shipstacked:Employer` @type literal** — backwards-compat
  per §B.4 recommendation.
- **RLS rollout** — separate batch.
- **Historical decision/audit docs in `docs/audit/`, `docs/decisions/`, and
  most of `docs/v2/`** — these are historical records; rewriting them
  rewrites history. See §F.6 for the per-doc decision.

---

## D. Pre-flight verification — exhaustive inventory

### D.1 — Aggregate counts

- **src/** files containing "employer": **56 files, 263 occurrences**
- **scripts/** files: 1 (`scripts/post-jobs-x.js`, single copy string)
- **supabase/migrations/** files: 1 (`20260515150752_proof_receipts_v0_1.sql`,
  attestor_role enum — kept per §B.6)
- **public/** files: 0
- **docs/** tracked files: 10 (per `git ls-files | xargs grep -l`, mostly
  historical — see §F.6)

### D.2 — Per-bucket inventory in `src/`

| Bucket | Occurrence count | Approach |
|---|---|---|
| URL path file locations | 7 (5 routes + 2 lib paths) | rename per §B.1; 2 routes get 308 stubs |
| DB column refs (`employer_email`, `employer_id`) | ~52 | **leave** per §B.3 |
| DB table refs (`employer_profiles`) | 13 | **leave** per §B.3 |
| JSON-LD code symbol refs (`employerOrgId`, `EmployerOrg*`) | 11 | rename per §B.2 |
| JSON-LD published `@type` literal (`shipstacked:Employer`) | 2 | **leave** per §B.4 |
| Resend env var refs (`RESEND_SEGMENT_EMPLOYERS`) | 2 | **leave** per §B.5 |
| Zod/SQL enum values (`'employer'` attestor) | 4 | **leave** per §B.6 |
| Code variable names | ~30 | rename per §B.2 |
| CSS class names | 4 (`.employer-section`, `.employer-inner`, in `page.tsx`) | rename per §B.2 |
| Copy/string literals (user-facing text) | ~80–100 | rewrite per §F |
| Comments | ~20–30 | rewrite for consistency |

### D.3 — Per-file occurrence rank (top 15 by count)

| File | Occurrences | Mix |
|---|---|---|
| `src/app/api/messages/route.ts` | 23 | mostly DB column refs (employer_email) + ~3 copy strings in notification email |
| `src/app/admin/page.tsx` | 19 | code-symbol variables (totalEmployers, activeEmployerConvs etc.) + DB column refs + 2–3 copy labels |
| `src/lib/jsonld/job-posting.ts` | 17 | code-symbol imports (employerOrgId) + struct field names + comments |
| `src/app/talent/TalentClient.tsx` | 16 | code-symbol vars + copy strings |
| `src/app/talent/page.tsx` | 15 | code-symbol vars (isPaidEmployer, hasEmployerProfile) + DB table ref |
| `src/lib/jsonld/employer-org.ts` | 12 | the file being renamed; symbol names + JSON-LD literal |
| `src/app/employer/EmployerDashboardClient.tsx` | 12 | the component being renamed; DB refs + copy + code symbols |
| `src/app/dashboard/BuilderDashboardClient.tsx` | 10 | copy refs to "employers" |
| `src/app/page.tsx` | 9 | CSS classes + section labels + copy |
| `src/app/api/hire-confirm/nudge/route.ts` | 9 | DB column refs + email copy |
| `src/app/terms/page.tsx` | 7 | copy in legal terms |
| `src/app/employer/page.tsx` | 7 | the page being renamed; DB refs + copy |
| `src/app/post-job/PostJobForm.tsx` | 6 | code refs + copy |
| `src/app/jobs/JobsClient.tsx` | 6 | code symbol vars |
| `src/app/company/[slug]/page.tsx` | 6 | import + copy + DB |

(Full list of 56 files is too long to embed; the rename plan in §I covers
them by category, not per-file.)

### D.4 — Files with DB-only references (no code/copy changes needed)

Files where every "employer" occurrence is a DB column or table reference —
no work to do this batch:

- `src/app/api/messages/[id]/route.ts` (only `employer_email` data-driven check)
- `src/app/api/saved-profiles/route.ts` (employer_email column ref)
- `src/app/api/apply/route.ts` (likely employer_email + emails — verify)
- `src/app/sitemap.ts` (`.from('employer_profiles')`)
- `src/app/api/admin/verify/route.ts` (verify before assuming)

Each will be opened during execution and confirmed DB-only before being
skipped or touched.

---

## E. URL path renames + 308 redirect plan

**Two pages need URL rename + 308 stub:**

### E.1 — `/employer` → `/hirer`

Move:
- `src/app/employer/page.tsx` → `src/app/hirer/page.tsx`
- `src/app/employer/EmployerDashboardClient.tsx` → `src/app/hirer/HirerDashboardClient.tsx`

Create stub:
- New `src/app/employer/page.tsx`:
  ```typescript
  import { permanentRedirect } from 'next/navigation'
  export default function EmployerStub() { permanentRedirect('/hirer') }
  ```

Update all internal references to `/employer` in code and copy (NavBar, NavBar
mobile, /messages stub, server routes that hardcode redirects, etc.).

### E.2 — `/employers` → `/hirers`

Move:
- `src/app/employers/page.tsx` → `src/app/hirers/page.tsx`

Create stub:
- New `src/app/employers/page.tsx`:
  ```typescript
  import { permanentRedirect } from 'next/navigation'
  export default function EmployersStub() { permanentRedirect('/hirers') }
  ```

Update internal references.

### E.3 — `/api/employer/cancel` and `/api/employer-logo`

These are API endpoints called only by our own client code. **No 308 stub
needed.** Rename the route files + update callers in the same commit. Any
external POSTer (none expected) gets a 404 — acceptable, no public-facing
contract.

- `src/app/api/employer/cancel/route.ts` → `src/app/api/hirer/cancel/route.ts`
- `src/app/api/employer-logo/route.ts` → `src/app/api/hirer-logo/route.ts`

Callers to update:
- `src/app/employer/EmployerDashboardClient.tsx` (now `HirerDashboardClient.tsx`) — calls `/api/employer/cancel`
- Anywhere uploading employer logos (probably the same dashboard)

### E.4 — `/employer/messages` (Batch 2 stub) — leave as-is

Already a 308 stub from Batch 2. The internals route to `/messages?as=hirer`
which is the new canonical path. No further action needed.

---

## F. Hirer vs Buyer per context

**The operator's standing instinct (per the brief):**
> "Hirer" for action-oriented surfaces; "Buyer" for transaction-role context.
> Code surface uses "Hirer" (matches `modes.hirer` locked in Batch 2).

Applying this to per-context buckets:

### F.1 — Hirer (dominant code + UI replacement)

Use **Hirer** in:
- All code symbols (var, type, function, file): `modes.hirer`, `HirerDashboardClient`, `isPaidHirer`, etc.
- All UI labels and navigation: "Hirer Dashboard", "Hirer messages", "Hirer accounts", etc.
- Admin dashboard metrics ("Paying hirers", "Active hirer conversations", "Hirer contact rate")
- CTAs and form copy: "Hire talent", "Find a hirer", etc.
- Email subject lines and bodies (where they describe the user's identity)
- CSS class names
- URL paths: `/hirer`, `/hirers`, `/api/hirer/cancel`, `/api/hirer-logo`

### F.2 — Buyer (reserved for transaction-role semantics in long-form copy)

Use **Buyer** sparingly, specifically in copy that's *describing the
transaction-role concept* from the locked spec. Candidates:
- `src/app/terms/page.tsx` — legal text describing what it means to be a
  buyer of services
- `src/app/privacy/page.tsx` — if it discusses buyer-side data handling
- Long-form explainers on `/atlas`, marketing pages, etc. where
  "Buyer / Hirer" or "Buyer (Hirer Mode)" might surface the locked
  composable-modes model

### F.3 — Per-surface table

Operator can override any of these at §H. Defaults:

| Surface | Replacement word | Notes |
|---|---|---|
| `/employer` route → `/hirer` | Hirer | URL path |
| `/employers` route → `/hirers` | Hirer | URL path |
| Admin dashboard labels | Hirer | UI |
| `HirerDashboardClient` component | Hirer | code symbol |
| `modes.hirer` (already locked) | Hirer | code symbol (no change) |
| NavBar links: "Hirer dashboard" | Hirer | UI |
| Email subject: "New message from Hirer X" | Hirer | UI/copy |
| Terms: legal description of buyer of services | Buyer | long-form legal |
| Privacy: data flows for buyers | Buyer | long-form legal |
| Atlas/spec: "Buyer (Hirer Mode)" | Buyer | spec context |
| Footer link | Hirer | UI |
| Pricing CTA | Hirer | UI |

### F.4 — Edge case: "employers" (plural noun) in body copy

Example current line: "Get auto-verified when your proof is real… Employers
with real budgets find you…"

→ Replacement: "Hirers with real budgets find you…"

The plural form follows the same rule.

### F.5 — Edge case: legal terms section that NAMES the concept

`src/app/terms/page.tsx` likely has a sentence like "Employers (defined as
parties accessing our hiring features…)". Two phrasings:
- "Hirers (defined as parties accessing our hiring features…)"
- "Buyers / Hirers (parties acting as the buying side of a transaction…)"

Recommend the **second phrasing** for the legal-definition sentence
specifically — it surfaces the locked transaction-role / mode-overlay model
in the document that explicitly defines terms. Everywhere else in
terms.tsx, "Hirer" is fine.

### F.6 — Docs in `docs/` — touch or leave?

Tracked docs containing "employer":

| Doc | Decision | Reason |
|---|---|---|
| `AGENTS.md` | leave (no "employer" found) | — |
| `docs/audit/BEACON_4_DISCOVERY.md` | **leave** | historical discovery snapshot |
| `docs/audit/MERGE_DISCOVERY.md` | **leave** | historical |
| `docs/audit/SEED_JOB_TEARDOWN_DISCOVERY.md` | **leave** | historical |
| `docs/decisions/SESSION_2026-05-19_DECISIONS.md` | **leave** (or surgical) | The doc itself records the rename decision. Rewriting "Employer" to "Hirer" within the doc rewrites the historical decision text. Surgical: only update the active forward-looking sections, leave the historical record. |
| `docs/decisions/DISCOVERY_composable_modes_refactor.md` | **leave** | historical |
| `docs/decisions/DISCOVERY_kill_claim_hire_flow.md` | **leave** | historical |
| `docs/decisions/DISCOVERY_batch1_kill_pass.md` | **leave** | historical execution record |
| `docs/decisions/DISCOVERY_batch2_modes_refactor.md` | **leave** | historical execution record |
| `docs/v2/ATLAS_V05.md` | **touch** | live spec / content file |
| `docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md` | **touch** | live spec |
| `docs/v2/STEP_4_*`, `STEP_5_*`, `STEP_6_*`, `STEP_7_*` | **touch if user-facing copy was sourced from there** | spec docs that informed actual UI copy |

**Default for `docs/`: leave historical files alone, touch live spec
files.** Each `docs/v2/` file gets a brief review during execution; if it's
spec-as-content (likely to be re-read), touch. If it's spec-as-historical-record,
leave.

---

## G. Cross-cutting concerns

### G.1 — `shipstacked:Employer` JSON-LD type literal (recap of B.4)

**Recommendation: keep `shipstacked:Employer` as the published @type
literal.** Internal code symbol renames don't affect this published value.
Re-evaluate when external adoption is verifiably non-zero.

### G.2 — Email copy

Several emails reference "employer":
- `/api/apply/route.ts` — applicant-to-employer + employer-to-applicant emails
- `/api/messages/route.ts` — new-message notification
- `/api/hire-confirm/nudge/route.ts` — 14-day post-conversation nudge
- `/api/welcome/route.ts` — possibly

Each gets reviewed during execution. Hirer is the dominant replacement; the
nudge email may use "Hirer" in the subject and body. Stripe webhook welcome
email already says "Welcome to ShipStacked…" — verify it doesn't say
"employer".

### G.3 — `/api/comments` `author_role` field (Batch 2 carryover)

Batch 2's B.9 left the literal `'employer'` as a possible value of the
stored `post_comments.author_role` field for backwards compatibility (with
the deliberate `employer` label kept). This batch:
- Update the comment in `/api/comments/route.ts:31` to say "Hirer label kept
  for compatibility with stored historical rows" → "Stored value is legacy
  'employer'; display copy maps it to 'Hirer'".
- The badge label in `src/app/feed/[id]/PostComments.tsx:96` currently
  shows `'Employer'` for `author_role === 'employer'`. Update the display
  string to `'Hirer'` while keeping the stored value lookup.

### G.4 — Realtime channel names

Batch 2 already changed the Realtime channel naming convention to be
mode-derived (`messages-${activeMode}` with mode in `'builder' | 'hirer'`).
No remaining `employer-*` channel names in `src/`. Verified.

### G.5 — Job posting copy

`src/lib/jsonld/job-posting.ts` and `src/app/post-job/PostJobForm.tsx`:
- `hiringOrganization` (schema.org field) — STAY (it's the canonical
  schema.org name, not our term)
- "Employer" labels in the form UI — RENAME to "Hirer"
- `employerOrgId(slug)` helper rename per §B.2

### G.6 — Empty modes / `isLoggedOut` derivation in jobs clients

Batch 2 left a couple of code symbols named `isLoggedOut = !modes.builder
&& !modes.hirer && !modes.client && !modes.admin`. The name is slightly
inaccurate (could be a logged-in user with no active modes). Not a
"employer" concern but flagged as nearby cleanup if the operator wants it
addressed in the same batch. **Default: leave.** Out-of-scope per "this
is a terminology pass, not a refactor pass."

---

## H. Approval gate (operator signs off explicitly per item)

Operator: tick each item before any execution.

**Per-category approvals:**

- [x] B.1 — URL path renames: `/employer` → `/hirer`, `/employers` →
        `/hirers`, plus 308 stubs at the old paths. Rename
        `/api/employer/cancel` and `/api/employer-logo` to `/api/hirer/cancel`
        and `/api/hirer-logo` without 308 stubs (caller updates atomic).
- [x] B.2 — Code symbol renames: `buildEmployerOrgJsonLd`, `EmployerOrgInput`,
        `EmployerOrgJsonLd`, `employerOrgId`, `EmployerProfile` type, all
        local variables. File renames: `employer-org.ts` → `hirer-org.ts`,
        `EmployerDashboardClient.tsx` → `HirerDashboardClient.tsx`.
- [x] B.3 — DB column refs (`employer_email`, `employer_id`,
        `employer_profiles`): **LEAVE.** Code keeps reading the old column
        names. Defer destructive column rename to a later batch.
- [x] B.4 — JSON-LD published `shipstacked:Employer` @type literal:
        **LOCKED to (B.4-i) LEAVE.** Internal code symbol renames only.
        Tag with explanatory code comment per §M.3.
- [x] B.5 — `RESEND_SEGMENT_EMPLOYERS` env var: **LOCKED to (B.5-iii)
        LEAVE.** Defer rename to a future deploy-coordinated change.
        Tag with explanatory code comment per §M.4.
- [x] B.6 — Zod/SQL `'employer'` enum value in attestor_role: **LOCKED to
        (B.6-i) LEAVE.** No `attestations` rows exist; revisit when writes
        start. Tag with explanatory code comment per §M.5.
- [x] B.7 — Comments + copy: rewrite per §F (Hirer dominant; Buyer in
        long-form legal/spec context).

**Cross-cutting confirmations:**

- [x] F.6 — Docs strategy: leave historical docs (audit + decisions),
        touch live spec docs (`docs/v2/`). Surgical touches to
        `SESSION_2026-05-19_DECISIONS.md` only for forward-looking
        sections (leave the historical "UPDATE 2026-05-22" untouched).
- [x] G.3 — `post_comments.author_role` stored 'employer' value: display
        badge updated to "Hirer", stored value remains 'employer'.
- [x] G.5 — `hiringOrganization` schema.org field name stays (it's
        schema.org canonical, not our term).

**Hirer-vs-Buyer per-surface defaults (per §F.3):**

- [x] Per-surface Hirer/Buyer assignments approved wholesale.

**Operator approval: granted 2026-05-22 — all items approved as a single
pass. B.4 / B.5 / B.6 locked to (i) / (iii) / (i) respectively (all LEAVE
with explanatory code comments per §M.3 / §M.4 / §M.5). URL renames + 308
stubs on `/employer` and `/employers`; hard rename on the two API routes.
Docs strategy per F.6. Single-commit execution plan per §J.**

---

## I. Code edit + commit plan

### Single commit vs multi-commit?

Same tension as Batch 2:
- **Single commit** — atomic; type-system enforces every consumer; clean
  revert. Larger diff (~150–250 LOC across 56 files, but most edits are
  small).
- **Two-commit** — symbols first, copy second. Less clean. Recommend single.

**Recommendation: single commit.** TypeScript catches every code-symbol
rename; copy edits are independent and visible in the diff.

### File-by-file edit categories

**Category A — rename + 308 stub** (4 files renamed, 2 stubs created):
- `src/app/employer/page.tsx` → `src/app/hirer/page.tsx` + new stub at old path
- `src/app/employers/page.tsx` → `src/app/hirers/page.tsx` + new stub at old path
- `src/app/employer/EmployerDashboardClient.tsx` →
   `src/app/hirer/HirerDashboardClient.tsx`
- `src/app/api/employer/cancel/route.ts` → `src/app/api/hirer/cancel/route.ts`
   (no stub)
- `src/app/api/employer-logo/route.ts` → `src/app/api/hirer-logo/route.ts`
   (no stub)
- `src/lib/jsonld/employer-org.ts` → `src/lib/jsonld/hirer-org.ts`

**Category B — code symbol rename only** (touched in many files via TS):
- Rename `buildEmployerOrgJsonLd`, `EmployerOrgInput`, `EmployerOrgJsonLd`,
  `employerOrgId`, `EmployerProfile` in defining file
- Update every importer / consumer (TypeScript surfaces them)
- Rename local variables (`totalEmployers` → `totalHirers`, etc.)

**Category C — copy/comment edits** (one-pass per file):
- ~80–100 string-literal edits across ~30 files
- ~20–30 comment edits

**Category D — leave alone**:
- 52 `employer_email` + 13 `employer_profiles` DB refs
- 2 `shipstacked:Employer` published literals
- 2 `RESEND_SEGMENT_EMPLOYERS` env var refs
- 4 zod/SQL `'employer'` enum values
- Historical docs in `docs/audit/`, `docs/decisions/` (except surgical)

### Verifications during commit

- `npx tsc --noEmit` clean — type system enforces every renamed symbol's
  consumers updated.
- `npm run build` clean — Next.js detects route renames + 308 stubs build correctly.
- `grep -rni 'employer' src/` returns ONLY the explicit Category-D
  exceptions (DB column refs, published JSON-LD literal,
  RESEND_SEGMENT_EMPLOYERS env var, zod/SQL enum values, and any operator-
  approved leave-as-is).
- Spot-check the 308 stubs: `/employer` redirects to `/hirer`; `/employers`
  redirects to `/hirers`.
- Spot-check the renamed API routes: `/api/hirer/cancel` and `/api/hirer-logo`
  work; old `/api/employer/cancel` and `/api/employer-logo` 404 (acceptable
  — no external POSTers).

---

## J. Execution sequence (gated on §H approval)

**Single commit.** After approval:

1. Branch off `main` at HEAD `94cf847`.
2. Apply renames per Category A (file moves + stub creation).
3. Apply renames per Category B (code symbols).
4. Apply edits per Category C (copy + comments).
5. `npx tsc --noEmit` clean.
6. `npm run build` clean.
7. Local dev smoke test: visit `/employer` → 308 to `/hirer`; `/employers`
   → 308 to `/hirers`; NavBar renders "Hirer dashboard"; admin metrics
   show "Hirer" labels.
8. Commit, push.
9. Vercel deploy gate: green build = sufficient. No external paid users to
   regression-test against.
10. Discovery doc updated with execution timestamp + SHA + verification.

---

## K. Verification — what 'green' looks like

- `npx tsc --noEmit` clean.
- `npm run build` clean. All 81 routes build (plus the 2 new 308 stub
  routes = 83).
- `/employer` returns 308 to `/hirer`. `/employers` returns 308 to `/hirers`.
- `/api/employer/cancel` and `/api/employer-logo` return 404 (no stub).
- NavBar labels say "Hirer dashboard", "Hirer messages" (where applicable).
- Admin dashboard metric labels say "Paying hirers", "Active hirer
  conversations", "Hirer contact rate", etc.
- `grep -rni 'employer' src/` returns ONLY:
  - DB column reads (`.eq('employer_email', …)`, `.from('employer_profiles')`)
  - The 2 `shipstacked:Employer` published @type literals (with code comment
    explaining the backwards-compat decision)
  - The 2 `RESEND_SEGMENT_EMPLOYERS` env var refs (with code comment
    explaining deferred env var rename)
  - The zod/SQL `'employer'` enum value in `proof-receipt-v0.1.ts` and
    `types.ts` (with comment)
- Vercel build green on the commit.

---

## L. Reversal

`git revert <SHA>` is full reversal. No DDL changes, no data migration, no
external service config changed.

If the operator decides to undo specific URL renames after merging (e.g.
revert `/employer` → `/hirer` because of an unexpected SEO concern), that's
a follow-up commit re-renaming `/hirer` back to `/employer`. The 308 stub
becomes the live page; new pages stub elsewhere. Trivially reversible.

---

## M. Risks / honest notes

1. **Largest single-batch file count yet** (~56 files). But each edit is
   small (~1–5 lines per file on average). TypeScript catches every
   code-symbol rename consumer. Copy edits visible in the diff.

2. **URL path renames have non-zero SEO cost.** 308 stubs preserve link
   equity, but search engines update cached references over weeks.
   Acceptable risk given site is small and audit confirmed minimal external
   reference base.

3. **`shipstacked:Employer` published literal stays (LOCKED to B.4-i).**
   Code comment template at the literal in `src/lib/jsonld/hirer-org.ts`
   (post-rename):
   ```typescript
   // Kept as 'shipstacked:Employer' for backwards compatibility with any
   // external JSON-LD consumers that may key off this @type literal. The
   // canonical spec name is Hirer; revisit when external adoption is
   // verifiably non-zero or when migrating the shipstacked: namespace.
   '@type': ['Organization', 'shipstacked:Employer']
   ```

4. **`RESEND_SEGMENT_EMPLOYERS` env var stays (LOCKED to B.5-iii).** Code
   comment template at both reference sites in
   `src/app/api/webhooks/stripe/route.ts`:
   ```typescript
   // Env var name kept as RESEND_SEGMENT_EMPLOYERS (legacy from pre-Batch-3
   // terminology). Renaming requires coordinated Vercel env update;
   // deferred to a future deploy-coordinated change.
   process.env.RESEND_SEGMENT_EMPLOYERS
   ```

5. **Zod/SQL `'employer'` attestor_role enum value stays (LOCKED to
   B.6-i).** Code comment template at both the zod schema in
   `src/schemas/proof-receipt-v0.1.ts` and (informationally) in the SQL
   migration:
   ```typescript
   // Enum value 'employer' kept for storage stability — destructive
   // migration would invalidate existing rows under the CHECK constraint.
   // No attestations rows exist today; when writes start, the new value
   // can be added additively in the same commit. Display copy maps this
   // value to 'Hirer' at render time.
   export const AttestorRole = z.enum(['client', 'employer', 'peer', 'platform']);
   ```

6. **DB column refs stay.** `grep -rn "employer" src/` post-Batch-3 will
   still surface ~70 lines by design — DB column refs (~65), published
   JSON-LD literal (2), env var refs (2), zod/SQL enum value (4). The
   `verify-agent-card.ts` script's brand-free check (per AGENTS.md
   invariant #3) doesn't flag "employer" as brand; this is fine.

7. **`/api/employer/cancel` and `/api/employer-logo` get hard-renamed
   without 308.** If any external system was POSTing to these endpoints,
   they'd 404 post-rename. Confirmed during pre-flight: only our own client
   code calls these.

8. **Spec docs in `docs/v2/`** — touching them rewrites guidance. The
   "touch live spec docs, leave historical" rule is judgment-based. Each
   file gets a brief review during execution; if uncertain, leave (better
   to leave a stale "Employer" in a spec doc than to rewrite something the
   operator hasn't seen).

9. **`'shipstacked:Employer'` is not the only namespaced type.** Other
   `shipstacked:*` literals exist (e.g. `shipstacked:Builder`,
   `shipstacked:ProofReceipt`, `shipstacked:BuilderCollection`,
   `shipstacked:JobPosting`). They stay — they don't say "employer." Only
   `shipstacked:Employer` is in this batch's consideration.
