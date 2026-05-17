# Tier 0 — Seed Job Teardown + Fabricated Badge Removal — DISCOVERY (Phase 1)

**Author:** Claude (Opus 4.7, 1M context) — read-only discovery
**Date:** 2026-05-16
**Spec:** `docs/v2/TIER_0_SEED_JOBS_AND_BADGE_SPEC.md` §2
**Status:** Phase 1 complete. STOP. Awaiting Thomas's explicit approval of Section G change list before any Phase 2 mutation.
**Method:** read-only. One temp DB script written to `/tmp/` (`t0_discovery.mjs`) and deleted after use. No repo files modified except this report.

---

## SECTION A — ShipStacked employer + full seed job list

**Zero ambiguity.** All 24 rows in the `jobs` table are attributable to a single internal ShipStacked employer account. There are no real third-party-posted jobs to disambiguate.

### The internal ShipStacked employer

| Field | Value |
|---|---|
| `employer_profiles.id` | `501d2986-9589-45fd-9d4d-f4110370bc82` |
| `employer_profiles.email` | `oxleethomas+shipstacked@gmail.com` |
| `employer_profiles.company_name` | `ShipStacked` |
| `employer_profiles.slug` | `shipstacked` |
| `employer_profiles.public` | **`true`** (the only `public=true` employer_profile in the DB; the other 6 are internal test orgs all marked `public=false`) |
| `employer_profiles.created_at` | 2026-04-07 13:36:52 UTC |
| `employer_profiles.location` | "Remote — Global" |

### Job-side attribution

Distinct values across all 24 rows in `jobs`:

- `employer_email` → **100% `oxleethomas+shipstacked@gmail.com`** (single value)
- `company_name` → **100% `ShipStacked`** (single value)
- `status` → **100% `active`** (no other distinct value present in the table)

### All 24 seed jobs

Ordered by `created_at DESC`. All `status='active'`. All `employer_email='oxleethomas+shipstacked@gmail.com'`. All `company_name='ShipStacked'`. Two distinct creation cohorts: one job from 2026-04-25 (the AI Growth Engineer hire), and a batch of 23 from 2026-04-07 16:55 (the original seed batch — created within ~5 seconds of each other).

| # | Job ID | role_title | created_at | expires_at | status |
|--:|---|---|---|---|---|
| 1 | `e908956f-dc9e-482d-bcdf-96ed4c63093c` | AI Growth Engineer | 2026-04-25 17:52 | 2026-05-25 17:52 | active |
| 2 | `aea33be8-059a-4a2e-884f-44489ef6cb72` | Insurance AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 3 | `0acf5b02-2f1d-4a53-b4e4-9c6c7ac878ac` | Logistics & Supply Chain AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 4 | `c80f5f69-d98c-4499-b00e-1bb570978d0f` | Construction & PropTech AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 5 | `afd8cd4c-bc2f-4ec1-9288-db67a18be46d` | Fitness & Wellness AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 6 | `46317c47-4305-45de-88be-9f13a57fe354` | Media & Publishing AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 7 | `c8fe860a-1ade-438c-bb6c-4fa08e7e1ff9` | Customer Support AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 8 | `b18ddd52-f413-460d-8317-e55a496f28a5` | Education & EdTech AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 9 | `f5be3e10-8995-4b39-a766-a11551375f29` | HR & Recruitment AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 10 | `193cd0af-ac42-433f-afec-a5411988011c` | Marketing & Growth AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 11 | `d7b103c6-cae8-46d6-9f3a-a327b944f417` | E-commerce & Retail AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 12 | `51523429-c49b-40eb-97eb-06829b2ae45d` | Real Estate AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 13 | `0f29afa6-0261-469d-ad86-a985da26183d` | Finance & Fintech AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 14 | `7879aaf8-5960-4c41-9c89-03e112fd8683` | Legal AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 15 | `dffacdce-2bd2-417c-95ba-9f8010361b67` | Healthcare AI Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 16 | `efb1c87f-47d4-4b4c-9787-34816c2ba91b` | Solo AI Founder — Contract Work While You Build | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 17 | `b7345f3e-e5b8-4426-b80d-d34e8854ebdf` | AI Educator & Enterprise Trainer | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 18 | `da0dd7d3-5532-4735-b4f5-f37b8f296fc6` | AI Content & Media Producer | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 19 | `59f81747-767f-4789-be36-143e9bfae25f` | LLM Integration Specialist — RAG & Knowledge Systems | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 20 | `3f9db5f5-6d49-4361-8271-739224fb0d94` | AI-Native Full Stack Developer | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 21 | `82d4361c-c776-48cf-87d6-3446be3d51eb` | AI Agent Builder — Autonomous Systems Engineer | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 22 | `6d3c131e-41a1-4a39-b785-c1a2ac82d0e3` | Prompt Engineer — LLM Behaviour Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 23 | `eb8da4a8-0a26-4ec6-a5f9-340ad72c4864` | Automation Architect — AI Workflow Specialist | 2026-04-07 16:55 | 2026-07-06 16:55 | active |
| 24 | `a9a996ba-2736-4c67-959c-370112e17afa` | Vibe Coder — AI Product Builder | 2026-04-07 16:55 | 2026-07-06 16:55 | active |

### Ambiguity check

**None.** No jobs are attributable to any other employer email or company name. All 7 `employer_profiles` rows have `oxleethomas+...@gmail.com` plus-addressed aliases (per earlier audit Part 6), so no third-party employer has ever posted a job. The teardown scope is the full 24-row `jobs` table.

### A caveat worth Thomas's eye

Row #1 (AI Growth Engineer, 2026-04-25) is in a different cohort from the other 23 (all 2026-04-07 batch-created within 5 seconds). It is the one job that may have been posted with genuine hiring intent (the role description reads like a real founding-hire ask — "founding hire to own growth and community... work directly with the founder"). It has **only 1 application** (Aniket Aslaliya). Spec §1 calls this "test data" and §3.1 directs blanket soft-delete; on a strict reading this row goes with the others. **Flag for Thomas confirmation before Phase 2 only if AI Growth Engineer is a position you actually want to keep open** — otherwise default action is soft-delete all 24.

---

## SECTION B — Every surface that reads `jobs`

All `from('jobs')` references in `src/`, by surface, with current filter behaviour and per-surface impact assessment.

### Public read surfaces

| # | Surface | File:line | Filter on `status` / `expires_at`? | Impact when seed jobs → `paused` |
|--:|---|---|---|---|
| B1 | `/jobs` board listing | `src/app/jobs/page.tsx:28-33` | **YES** — `.eq('status', 'active').gt('expires_at', now)` | ✅ Seed jobs disappear automatically. |
| B2 | **`/jobs/[id]` detail page (the tweeted URL)** | `src/app/jobs/[id]/page.tsx:41-45` | **NO** — `.eq('id', id).maybeSingle()` with no status filter. Renders any job; derives `isActive = job.status === 'active' && !isExpired` at line 55 and passes to client, but page still 200s with full content | ⚠️ **CRITICAL — needs code change or redirect.** This is the URL referenced from external tweets. After soft-delete, the URL still serves a 200 with the job body and JobPosting JSON-LD; only the Apply button becomes disabled. |
| B2b | `/jobs/[id]` generateMetadata | `src/app/jobs/[id]/page.tsx:7-35` | **NO** — title/description leak for soft-deleted jobs | Same surface as B2. The 301 fix below makes this moot. |
| B3 | `/get-found/[id]` (alt landing for inbound builder traffic on jobs) | `src/app/get-found/[id]/page.tsx:30` | **YES** — `.eq('status', 'active').maybeSingle()` → `notFound()` | ✅ Seed-job `get-found/<id>` URLs automatically 404. To preserve the "no 404s" rule from spec §1, the 301 redirect in Section E must cover `/get-found/[id]` too, OR we accept that nobody has tweeted the `/get-found/` URLs (they're auxiliary). **Flag for Thomas.** |
| B3b | `/get-found/[id]` generateMetadata | `src/app/get-found/[id]/page.tsx:5-25` | **NO** — metadata leaks for soft-deleted IDs (only matters if the page renders, which it doesn't post-soft-delete because line 30 404s) | No user-visible impact. |
| B4 | `/company/[slug]` (employer profile page — job list block) | `src/app/company/[slug]/page.tsx:52-58` | **YES** — `.eq('employer_email', company.email).eq('status', 'active').gt('expires_at', now)` | ✅ Seed jobs disappear from `/company/shipstacked` (the only `public=true` company profile). The `/company/shipstacked` page itself remains live but will show an empty jobs list. **Flag for Thomas:** do you want `/company/shipstacked` itself unpublished (set `employer_profiles.public=false`) too? |
| B5 | `/api/feed/jobs` JSON endpoint (consumed by `scripts/post-jobs-x.js` Twitter auto-poster) | `src/app/api/feed/jobs/route.ts:13-18` | **YES** — `.eq('status', 'active').order('created_at', desc).limit(50)` | ✅ Twitter auto-poster won't pick up soft-deleted jobs. |
| B6 | Sitemap | `src/app/sitemap.ts:40-44` | **YES** — `.eq('status', 'active').gt('expires_at', now)` | ✅ Seed-job URLs drop out of `sitemap.xml` next regeneration. |

### Authenticated / role-gated surfaces

| # | Surface | File:line | Filter | Impact |
|--:|---|---|---|---|
| B7 | `/employer` dashboard (employer's own jobs) | `src/app/employer/page.tsx:22-27` | **YES** — `.eq('employer_email', user.email).eq('status', 'active')` | ✅ When Thomas logs in as `oxleethomas+shipstacked@gmail.com`, the seed jobs disappear from his employer dashboard. The 122 applications block (line 37-43) is keyed by `job_id IN jobIds` — and `jobs` becomes empty post-soft-delete, so the applications block also goes empty in the dashboard view. **Flag for Thomas:** is that the desired admin behaviour? (You'd lose visibility of the applicant list from this surface; the rows persist in DB and remain queryable from Supabase Studio / `/admin`.) |
| B8 | `/admin` dashboard (Thomas-only) | `src/app/admin/page.tsx:32` | **NO** — `.from('jobs').select('*').order('created_at', desc)` (full read) | ✅ Intentional. Admin sees all jobs incl. soft-deleted. No change needed. |
| B9 | `/post-job` page (edit mode) | `src/app/post-job/page.tsx:36-41` | **NO** — `.eq('id', jobId).eq('employer_email', user.email)` (no status filter — by design, lets employer edit a paused job) | No impact — employer-scoped, only own jobs. |
| B10 | `/employer/EmployerDashboardClient.tsx` (existing toggle code) | line 153, 156, 142 | Mutation, not read: existing UPDATE flips `status` between `'active'` and `'paused'`; existing DELETE removes a job entirely (button on dashboard). | This is the existing soft-delete mechanism — see Section C. |

### Mutation endpoints that READ jobs as a guard

| # | Surface | File:line | Filter | Impact |
|--:|---|---|---|---|
| B11 | **`/api/apply` (POST — builder applies)** | `src/app/api/apply/route.ts:29-33` | **NO** — `.eq('id', job_id).maybeSingle()` then proceeds if found. Soft-deleted jobs would still accept applications. | ⚠️ Needs guard — see Section C/G. (Practical risk is low after B2 is fixed because no Apply button is visible, but a direct API call would still succeed.) |
| B12 | `/api/jobs/xpost` (POST — Twitter cross-post) | `src/app/api/jobs/xpost/route.ts:21-31` | **NO** on status — but `.eq('id', job.id)` + `employer_email === user.email` + **120-second age guard** at line 30-31 (`if (ageSec > 120) → 400`). | No practical risk — seed jobs are weeks old, would fail the age guard. |
| B13 | `/api/jobs` (POST — create job) | `src/app/api/jobs/route.ts:25-46` | INSERT only — not a read. Always writes `status: 'active'`. | No impact. |

### Surfaces that do NOT touch `jobs` (confirmed clean)

- `/feed` / `/feed/[id]` — reads `posts`, not `jobs`. (Build Feed is the post-shipping feed; unrelated to the Jobs board.)
- `/leaderboard` — reads `profiles.velocity_score`. No jobs.
- `/u/[username]` — reads `profiles`, `projects`, `skills`, `github_data`, `posts`. No jobs.
- `/talent` — reads `profiles`. No jobs.
- `/atlas`, `/atlas/roles/[id]`, `/p/[slug]` — V2 surfaces, no jobs.
- `/llms.txt` — enumerates `atlas_roles` + recent `proof_receipts`. **Does NOT enumerate jobs** (verified via grep). Safe.
- `/api/v1/me`, `/api/v1/profile`, `/api/v1/builds`, `/api/v1/avatar` — Builder API. No jobs (verified via grep).
- Welcome / magic-link / digest emails — no job references (verified via grep in `src/app/api/welcome/`, `src/app/api/magic-link/`).
- `scripts/post-jobs-x.js` — hits `/api/feed/jobs` (B5), which already filters `status='active'`. Will stop picking up seed jobs automatically.

---

## SECTION C — Soft-delete mechanism + filter-respect audit

### What already exists

The `jobs` table has a `status text` column. **Distinct values currently present in the live table: `'active'` (24 rows). No other values exist in production right now**, but a soft-delete value convention is already implemented in the code:

- `src/app/employer/EmployerDashboardClient.tsx:153` — `const newStatus = currentStatus === 'active' ? 'paused' : 'active'`
- `src/app/employer/EmployerDashboardClient.tsx:156` — `await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId).eq('employer_email', email)`
- `src/app/employer/EmployerDashboardClient.tsx:263-264` — UI distinguishes `isActive = status==='active'` from `isPaused = status==='paused'`

**Convention: the existing soft-delete value is `'paused'`.** Phase 2 should use this. No migration required, no new column.

(Hard-delete also exists at `EmployerDashboardClient.tsx:142` — `.delete().eq('id', jobId).eq('employer_email', email)` — used by the dashboard's "Delete" button. Spec §1 forbids hard-delete; we use `'paused'`.)

### Filter-respect — which surfaces will NOT auto-hide after soft-delete

From Section B, the surfaces that filter on `status='active'` (will hide seed jobs automatically once flipped to `'paused'`):

✅ `/jobs` listing (B1) · `/get-found/[id]` main read (B3) · `/company/[slug]` jobs block (B4) · `/api/feed/jobs` (B5) · `/sitemap.xml` (B6) · `/employer` dashboard (B7) · `scripts/post-jobs-x.js` consumer (via B5)

The surfaces that do NOT filter and so will need either a code change or the 301 redirect to mask them:

⚠️ **`/jobs/[id]` detail page (B2)** — biggest exposure. The tweeted URL still 200s with full job content + JobPosting JSON-LD after soft-delete. **Must be addressed.** Best fix: server-side `redirect()` to `/jobs` when `job.status !== 'active'`, OR a middleware redirect, OR both (defence in depth). See Section E.

⚠️ **`/api/apply` (B11)** — would still accept POST applications to a soft-deleted job ID. Practical risk is low after B2 is fixed (no UI surface to discover the ID with an Apply button), but a one-line filter `.eq('status','active')` is the right belt-and-braces guard.

⚠️ **`/get-found/[id]` generateMetadata (B3b)** — leaks title/description for soft-deleted job IDs, but the page itself 404s at line 30. No user impact unless someone scrapes meta tags. Low priority; can be left alone or fixed alongside.

⚠️ **`/jobs/[id]` generateMetadata (B2b)** — same surface as B2; fixed by the same redirect.

⚠️ **`/api/jobs/xpost` (B12)** — has a 120-second age guard that already blocks any seed-job replay. No fix required.

### Escalation trigger triggered (Spec §4)

> "any surface that reads jobs without respecting a status filter"

**Triggered by B2 (and B11, B12).** Reporting as required. Not blocking — the fixes in Section G handle this — but flagged here per the spec.

---

## SECTION D — Applications → seed jobs map

### Counts

- **Total applications in `applications` table: 122.**
- **All 122 are attached to one of the 24 seed jobs** (orphan-applications check: 0 rows where `applications.job_id` does not match a current `jobs.id`).
- Apps-per-job distribution: min 0 (Healthcare AI Specialist), max 20 (Vibe Coder — AI Product Builder), median ~3.5.

### Per-seed-job applicant counts

| Job | App count |
|---|--:|
| AI Growth Engineer | 1 |
| Insurance AI Specialist | 5 |
| Logistics & Supply Chain AI Specialist | 3 |
| Construction & PropTech AI Specialist | 4 |
| Fitness & Wellness AI Specialist | 5 |
| Media & Publishing AI Specialist | 4 |
| Customer Support AI Specialist | 12 |
| Education & EdTech AI Specialist | 6 |
| HR & Recruitment AI Specialist | 3 |
| Marketing & Growth AI Specialist | 2 |
| E-commerce & Retail AI Specialist | 2 |
| Real Estate AI Specialist | 3 |
| Finance & Fintech AI Specialist | 2 |
| Legal AI Specialist | 1 |
| Healthcare AI Specialist | 0 |
| Solo AI Founder | 7 |
| AI Educator & Enterprise Trainer | 1 |
| AI Content & Media Producer | 3 |
| LLM Integration Specialist (RAG) | 2 |
| AI-Native Full Stack Developer | 12 |
| AI Agent Builder | 8 |
| Prompt Engineer | 9 |
| Automation Architect | 7 |
| Vibe Coder — AI Product Builder | 20 |
| **TOTAL** | **122** |

### Distinct applicants (who actually applied to seed jobs — Thomas signal)

Below is the union of unique `(builder_email, profile_id)` pairs across all 122 seed-job applications. Some applied to many jobs (Aniket Aslaliya applied to 22 of the 24); some applied to one.

Distinct applicant count: **~33 unique builder_emails**. Top applicants by job-count (rough — derived from the per-job listings in DB output):
- Aniket Aslaliya (`aniketaslaliya@gmail.com`, profile `d4bc4780-…`) — applied to 22 seed jobs (everything except Healthcare and the AI Growth Engineer ≥ different cohort dates make this 22 of 24)
- Olalekan Ridwanullah (`ridwanolalekan224@gmail.com`, `a337db6b-…`) — ~16 jobs
- Murtaza Zaidi (`zaidimurtaza102@gmail.com`, `cf29bdca-…`) — 6 jobs
- Hipramodh AVG (`hipramodhavg@gmail.com`, `ad26660d-…`) — 6 jobs
- slava (`slava@staycozy.today`, `4dd5ef88-…`) — 6 jobs incl. some duplicates
- Hamza Ahmad (`officialhamza16@gmail.com`, `8c59647d-…`) — 4 jobs
- Hermez/Ifiok Uboh (`hermezjeph@gmail.com`, `036f2871-…`) — 5 jobs
- Abhishek Arjun (`arjunabhishek2000@gmail.com`, `105cbb8e-…`) — 5 jobs
- Bryson Starling (`bstarling1396@gmail.com`, `18d8fbed-…`) — 4 jobs
- Jovan Panetie (`jovanpanetie@gmail.com`, `b898cee4-…`) — 4 jobs

(Full per-job applicant list — `(builder_email, builder_name, profile_id, status, created_at)` — is captured in the discovery DB query output. Reproducible by re-running an equivalent query against `applications`. If Thomas wants a structured spreadsheet, can produce in Phase 2 setup; not duplicating the long list here.)

### CASCADE / preservation check

Phase 1 cannot inspect FK definitions directly without `pg_meta`, but the behaviour is:

- **Soft-delete (Phase 2 plan) writes `UPDATE jobs SET status='paused' WHERE id IN (...)`.** This does not delete rows from `jobs` and does not trigger any CASCADE.
- Even if the FK on `applications.job_id` were `ON DELETE CASCADE` (unknown — not directly verified), it would NOT fire during `UPDATE`. Cascade only fires on `DELETE` of the parent row.
- Therefore: **applications are guaranteed preserved** by the soft-delete approach. Hard-delete would risk cascade (and is forbidden by spec §1 anyway).

Phase 2 verification step will confirm: `SELECT COUNT(*) FROM applications` returns 122 (unchanged) post-soft-delete.

---

## SECTION E — 301 redirect implementation recommendation

### Current behaviour

- `GET https://shipstacked.com/jobs/<seed-id>` → **HTTP 200** with full job detail + JobPosting JSON-LD + Apply button (whose `isActive` flag controls only the button state, not the response code).
- Same for tweeted IDs after soft-delete with no code change: would still 200 (because `/jobs/[id]/page.tsx:41-45` doesn't filter on `status`).

### Target behaviour

- `GET /jobs/<soft-deleted-id>` → **HTTP 301** `Location: /jobs`.
- Real (non-paused) job URLs unchanged → still 200.
- The V2 content-negotiation middleware (which handles `/p/<slug>.json` and `/atlas/roles/<id>.json` rewrites for JSON-LD agents) **must continue working** untouched.

### Recommendation: server-component redirect inside `/jobs/[id]/page.tsx`

Implement the redirect **inside the page server component** (not in middleware). One reason this is cleanest:

1. **No coupling to the V2 middleware.** The middleware currently does early-return rewrites for `/p/<slug>.json` and `/atlas/roles/<id>.json`. Adding job-redirect logic to middleware risks subtle ordering bugs and forces every `/jobs/...` request through an extra Supabase round-trip just to check status. Middleware is also throttled by the `matcher` config — even though `/jobs/...` matches today, the matcher's exclusion list could drift.
2. **The page already queries `jobs` by id.** Adding `if (job.status !== 'active') redirect('/jobs')` before render is a one-line diff at `src/app/jobs/[id]/page.tsx:46-48`.
3. **Both metadata and detail render paths converge on the same query.** Fix both in one place.

### The 301 vs 308 wrinkle

Spec §1 demands 301. Next.js's `redirect()` from `next/navigation` returns **307 (temporary)** by default and `permanentRedirect()` returns **308 (permanent)**. Neither is 301. **The functional difference between 301 and 308 is that 308 preserves the HTTP method (POST→POST), while 301 historically gets coerced by browsers/search engines to GET on follow.** For dead-job URLs:

- Search engines (Google, Bing) treat 308 the same as 301 for indexing — both are "permanent, update the index". This has been settled documented behaviour since 2020.
- Social card refreshers (Twitter, LinkedIn) follow 308 just like 301.
- The strictly-spec-compliant 301 requires either `middleware.ts` with `NextResponse.redirect(url, 301)` or `next.config.ts` `redirects()` with `permanent: true` (which Next.js implements as 308, not 301 — verified in Next.js docs).

**Two paths, Thomas chooses:**

**E1 (recommended — pragmatic, server-component redirect with 308):** Add to `/jobs/[id]/page.tsx` immediately after the `if (!job) notFound()` line:
```ts
import { permanentRedirect } from 'next/navigation'
// ...
if (job.status !== 'active') permanentRedirect('/jobs')
```
Result: HTTP 308 → `/jobs`. Functionally identical to 301 for tweets/SEO; technically not 301.

**E2 (strict — middleware redirect with explicit 301):** Add to `src/middleware.ts` BEFORE the `tryContentNegotiation` call, a job-id detector that queries `jobs.status` via service role and returns `NextResponse.redirect(new URL('/jobs', req.url), 301)` when `status !== 'active'`. Drawbacks: extra Supabase query on every `/jobs/<anything>` request (cacheable but adds latency); coupling to middleware; lives in a different file from the page logic.

**My recommendation: E1.** The 301-vs-308 distinction is technically observable but functionally a wash for the use-case (dead tweeted URLs need to update search-engine + social-card caches; both 301 and 308 do that equally). If you want a literal 301 anyway, switch to E2 — Phase 2 will implement whichever you pick. Either way, the V2 content-negotiation middleware remains untouched.

### One additional consideration

Per Section B, `/api/apply` (B11) does not filter status. Even with the page-level 301, a direct POST to `/api/apply` with a seed-job ID would still create an application row. Two options to harden:

- **Add a status filter to `/api/apply/route.ts:29-33`** (`.eq('id', job_id).eq('status', 'active')`). One-line change. Recommended.
- **Or leave it** — practically no one will hand-craft an `/api/apply` POST without an Apply button to discover IDs. Low risk.

Recommend adding the filter for cleanliness.

---

## SECTION F — Fabricated hires badge + scan for other fabricated numbers

### F1 — The hires badge (the asked-about one)

**Location:** `src/app/page.tsx:216`

**Verbatim line:**
```tsx
<div className="proof-item"><span className="proof-dot" /> {hireCount !== null && hireCount >= 10 ? hireCount : 10}+ hires made</div>
```

**Where `hireCount` comes from:** `src/app/page.tsx:21` declares `const [hireCount, setHireCount] = useState<number | null>(null)`. Line 23-28 fetches `/api/hire-confirm/count`, sets state.

**Underlying real value:**
- `hire_confirmations` table row count: **0** (re-confirmed by DB query).
- `SUM(profiles.hire_count)`: **0** (re-confirmed).
- `/api/hire-confirm/count` therefore returns `{count: 0}`.
- The ternary `hireCount >= 10 ? hireCount : 10` floors at 10. Display: **always renders "10+ hires made"** regardless of real data.
- **It is a hardcoded floor and fabricated.** Confirmed.

### F2 — Other potentially fabricated numbers on the live site

Searched homepage, components, OG generator, layout, /talent, /leaderboard, signup, /atlas, /api-docs for hardcoded traction numbers and computed metrics:

| Surface | Reference | Value | Status |
|---|---|--:|---|
| `src/app/page.tsx:216` | "10+ hires made" badge | hardcoded 10+ floor | **FABRICATED — to remove (Section G).** |
| `src/app/page.tsx:211` | "Join the founding cohort of builders shipping in public" | qualitative copy | Not a number. Not fabricated. |
| `src/app/page.tsx:213` | "Free forever for builders" | not a number | OK |
| `src/app/page.tsx:214` | "Auto-verified when your proof is real" | not a number | OK |
| `src/app/page.tsx:215` | "Live in 5 minutes" | qualitative; not a traction claim | OK |
| `src/app/page.tsx:407` | "Employers on ShipStacked pay $199/month..." | real pricing | OK (true unless pricing changes) |
| `src/app/talent/TalentClient.tsx:312-313` | `{totalCount} matching · {verifiedCount} verified` | **derived from real query** at `talent/page.tsx:66-82` — `profiles WHERE published=true`. Currently real values: ~44 published, ~22 verified. | OK — real, not fabricated. |
| `src/app/leaderboard/page.tsx` | "top 10 by Velocity Score" copy | "10" is the LIMIT clause, not a fabricated count | OK |
| `src/app/og/route.tsx` | per-receipt and per-builder OG cards | no embedded traction numbers; all values derived from row data | OK |
| `src/app/api-docs/page.tsx` | API documentation static page | no traction numbers | OK |
| `src/app/atlas/page.tsx` | Atlas long-form | no traction numbers about ShipStacked itself; market-stat numbers cited in Atlas content are sourced (ManpowerGroup/Bain etc.) | OK |
| `src/app/signup/page.tsx:172` | "Access the full talent directory and message verified builders directly." | no number | OK |

**Conclusion: only the "10+ hires made" badge is fabricated.** All other surface counts are derived from real queries or are qualitative copy. **No additional removals required for cleanliness** unless Thomas wants to also pull/replace the "$199/month" pricing copy in `page.tsx:407` (it's real, but it's the V1 secondary-surface positioning that handover doc 03 says was "demoted").

---

## SECTION G — Proposed Phase 2 change list (FOR THOMAS APPROVAL)

The minimal, additive, fully-reversible set of changes to satisfy the spec. Each item is enumerated so Thomas can approve/decline per item.

### G1 — DATA: soft-delete the 24 seed jobs

Single SQL update via service role. **No new column, no migration.** Uses the existing `'paused'` value convention (established by `EmployerDashboardClient.tsx:153,156`).

```sql
UPDATE public.jobs
SET status = 'paused'
WHERE employer_email = 'oxleethomas+shipstacked@gmail.com'
  AND status = 'active';
-- Expected: 24 rows updated.
```

Post-change DB invariants:
- `SELECT COUNT(*) FROM jobs` = 24 (unchanged).
- `SELECT COUNT(*) FROM jobs WHERE status='active'` = 0.
- `SELECT COUNT(*) FROM jobs WHERE status='paused'` = 24.
- `SELECT COUNT(*) FROM applications` = **122 (unchanged)**.

Reversibility: a single `UPDATE jobs SET status='active' WHERE employer_email = '...' AND status='paused';` restores everything.

**Decision needed:** Confirm scope = all 24 (default), or exclude row #1 (AI Growth Engineer, 2026-04-25) per the caveat in Section A.

### G2 — CODE: server-component redirect on `/jobs/[id]`

`src/app/jobs/[id]/page.tsx` — add a `permanentRedirect` after the `notFound()` check.

**Two lines added (one import + one conditional):**
```ts
import { permanentRedirect, notFound } from 'next/navigation'   // edit existing import to add permanentRedirect
// ...
if (!job) notFound()
if (job.status !== 'active') permanentRedirect('/jobs')          // NEW
```

Result: any tweeted seed-job URL returns **HTTP 308** (functional equivalent of 301 for SEO + social cards). The V2 content-negotiation middleware is untouched. Non-seed (status='active') jobs are unaffected.

**Decision needed:** approve E1 (308 via `permanentRedirect`, recommended) OR switch to E2 (literal 301 via middleware). E1 unless Thomas wants the literal 301.

### G3 — CODE: guard `/api/apply` against soft-deleted jobs

`src/app/api/apply/route.ts:29-33` — add `.eq('status', 'active')` to the existence check:

```ts
const { data: job } = await supabase
  .from('jobs')
  .select('*')
  .eq('id', job_id)
  .eq('status', 'active')          // NEW
  .maybeSingle()
if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
```

One-word addition. Defence-in-depth — practically unreachable after G2, but stops a hand-crafted POST from creating an application row against a paused job.

**Decision needed:** approve / decline.

### G4 — CODE: remove the fabricated hires badge

`src/app/page.tsx:216` — delete the `<div className="proof-item">...10+ hires made</div>` line entirely.

Per spec §3.4: "REMOVE the badge entirely (not replace with 0 — a 0 hires badge is worse than no badge)."

**Adjacent cleanup (recommended):** also delete the now-unused state machinery for `hireCount`:
- `src/app/page.tsx:21` — `const [hireCount, setHireCount] = useState<number | null>(null)`
- `src/app/page.tsx:23-28` — the `useEffect` that fetches `/api/hire-confirm/count`

The fetch endpoint `/api/hire-confirm/count` is not referenced anywhere else (grep-confirmed). Leaving the API route in place is harmless — it still returns `{count: 0}` to any caller — but it would now be a dead endpoint. Per spec §3.4: "if `hireCount` is used elsewhere, leave the query; otherwise remove only the badge display" — here `hireCount` is NOT used elsewhere, so removing both badge display AND the useState/useEffect (and optionally the unused API route) is cleanest.

**Decision needed:**
- (a) Remove badge only.
- (b) Remove badge + dead `hireCount` state + `/api/hire-confirm/count` fetch (recommended).
- (c) Also delete `/api/hire-confirm/count` route file and `/api/hire-confirm/nudge` cron (which is also dormant — 0 rows in `hire_confirmations`, and `hire_count` is never incremented anywhere in code paths grep'd). (b)+(c) is full cleanup. (b) is conservative.

### G5 — DATA / no change: applications preserved

Explicit no-op. **Do not touch `applications`.** Verification step in Phase 2 will assert row count unchanged.

### G6 — OPTIONAL: unpublish the `/company/shipstacked` profile

`employer_profiles.public = false WHERE id = '501d2986-9589-45fd-9d4d-f4110370bc82'`. Currently the `ShipStacked` company profile is the only `public=true` employer profile. After G1, the `/company/shipstacked` page will still render but with an empty jobs list — looks abandoned. Setting `public=false` makes the page itself 404 (per `/company/[slug]/page.tsx:40-45` which requires `public=true`).

**Decision needed:** approve / leave. Recommend approve — internal ShipStacked employer-profile isn't a real employer.

### G7 — OPTIONAL: also redirect `/get-found/[id]` for soft-deleted IDs

Currently `/get-found/[id]` 404s for soft-deleted jobs (Section B3) because it already filters `status='active'` at line 30. If any external traffic links to `/get-found/<seed-id>`, those would 404 (spec §1 forbids 404s introduced by this work, but those URLs presumably weren't tweeted — the tweeted ones are `/jobs/<id>`).

Two options:
- (a) **Leave as-is** (default) — accept that `/get-found/<seed-id>` 404s on the basis that no external reference exists.
- (b) **Also 301 these** — add a `permanentRedirect` in `/get-found/[id]/page.tsx`, mirroring G2.

**Decision needed:** confirm (a) or pick (b). Default (a).

### G8 — VERIFICATION (terminal Claude, pre-commit)

After G1–G4 (and any approved G6/G7), Phase 2 runs the spec §3.5 verification:
- `/jobs` board: 0 seed jobs visible. (Real jobs: 0 — there are none.)
- `curl -I https://shipstacked.com/jobs/<seed-id>` → `HTTP/2 308` (or 301 if E2) with `location: /jobs`.
- `/employer` dashboard (logged in as `oxleethomas+shipstacked@gmail.com`): 0 active jobs shown.
- Homepage: "10+ hires made" line gone.
- `applications` table row count = 122 (unchanged).
- `jobs` table row count = 24 (preserved); `status='paused'` count = 24.
- V2: `curl -I -H "Accept: application/ld+json" https://shipstacked.com/p/<known-slug>` still returns the JSON-LD (middleware untouched). Same for `/atlas/roles/A1.json`.
- `npx tsc --noEmit` clean.
- `npm run build` clean.

### G9 — COMMIT (per spec §3.6 template, customised for actual counts)

```
chore: retire 24 seed jobs (soft-delete + 308 → /jobs), remove fabricated hires badge

- Soft-delete all 24 jobs posted via the internal ShipStacked employer
  profile (oxleethomas+shipstacked@gmail.com). Rows preserved (test-
  interaction signal); flagged status='paused' via existing convention.
- All seed-job /jobs/<id> URLs redirect 308 → /jobs (the tweeted URL
  surface; no 404s introduced). Implemented as a server-component
  permanentRedirect in src/app/jobs/[id]/page.tsx so V2 middleware
  content negotiation is untouched.
- /api/apply hardened with status='active' filter (defence-in-depth).
- Application records to seed jobs preserved intact (122 applications,
  unchanged).
- Removed fabricated "10+ hires" homepage badge (hire_confirmations = 0;
  number was a hardcoded floor at src/app/page.tsx:216). Removed now-dead
  useState/useEffect for hireCount (option b/c per Section G review).
- No impact to non-seed jobs (there are none) or current users.

Discovery + approved change list: docs/audit/SEED_JOB_TEARDOWN_DISCOVERY.md
```

---

## METHOD NOTES

- DB queries executed via temp `/tmp/t0_discovery.mjs` using the project's bundled `@supabase/supabase-js` and the service-role credentials from `.env.local`. Script deleted after use. No repo files modified.
- Every Supabase `.from('jobs')` call in `src/` was located by grep and each call site was read for filter behaviour. Surface inventory in Section B is exhaustive within `src/`.
- Application counts and applicant lists are direct counts from the `applications` table.
- Soft-delete convention was confirmed by reading `src/app/employer/EmployerDashboardClient.tsx:153-156`.
- The "fabricated number" scan covered `src/app/page.tsx`, `src/app/components/`, `src/app/og/route.tsx`, `src/app/layout.tsx`, `src/app/talent/`, `src/app/leaderboard/`, `src/app/signup/`, `src/app/atlas/`, `src/app/api-docs/`. The only hardcoded floor found is the homepage badge.

---

*End of Phase 1 discovery. STOP. Awaiting Thomas's review of Section G before any Phase 2 mutation.*
