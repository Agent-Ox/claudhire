# AUDIT — Profile ranking, promotion, and demotion machinery

Read-only audit. No code mutation. No §H decisions to lock — this is a
finding-and-recommendation document. The operator reviews the gap and
decides direction.

Prepared at HEAD `19a233e` on 2026-05-23 after the Batch 5 + reusable-
backfill ship and the 23-profile reality-audit completed.

---

## A. Why this audit exists

Batch 5 made the engine fire on every Card 1 signup. Each enriched
builder produces `proof_receipts` rows carrying machine-classified
Atlas roles, capabilities, stack signals, verification levels, and
confidence scores. **None of this output flows into any ranking or
promotion logic on any public-facing surface.**

The 23-profile post-backfill audit surfaced the symptom: 23 builders
got entities + receipts, but none of them moved up on `/talent` —
because `/talent` sorts by `verified DESC, velocity_score DESC,
created_at DESC` and none of those signals reflect engine output.
The 17 verified builders (a V1 admin-managed flag) sit ahead of 24
unverified builders, regardless of how much shipped work the engine
has surfaced for the latter.

This audit answers: **what ranking signals exist today, what's used,
what's produced and ignored, and where the gap is most visible.**

---

## B. Inventory — every public-facing surface that lists or ranks profiles

For each: query shape, sort order, filters, slice, gate beyond
`published=true`. Confirmed by reading the file (not inferred).

### B.1 `/talent` — `src/app/talent/page.tsx`

| Aspect | Value |
|---|---|
| Reads | `profiles` (+ nested `skills(*)`) |
| Always-applied filter | `.eq('published', true)` (line 53) |
| Optional filters | `.eq('verified', true)`, `.eq('primary_profession', X)`, `.eq('availability', X)` via URL params |
| Sort | `.order('verified', desc)` then `.order('velocity_score', desc) .order('created_at', desc)` (default `sort=velocity`) OR `.order('created_at', desc)` (when `sort=newest`) |
| Slice | Anonymous: `profiles.slice(0, 6)` (line 72). Paid hirer: full list. |
| JSON-LD `ItemList` | Same top-6 teaser (line 112-121) — crawlers see only the paywall slice |
| Reads receipts? | **No** |

### B.2 `/` (homepage) — `src/app/page.tsx`

| Aspect | Value |
|---|---|
| Reads | `profiles` (+ nested `skills(*)`) — fetched **client-side** in `useEffect` |
| Filter | `.eq('published', true) .eq('featured', true)` (lines 43-44), THEN fallback fill `.eq('published', true)` (line 56) |
| Sort | featured-first by `.order('featured_order', asc, nullsFirst: false)` (line 45); fill query: `.order('velocity_score', desc, nullsFirst: false) .order('created_at', desc)` (lines 57-58) |
| Slice | `limit(6)` featured; fills to 6 total from non-featured pool |
| Effect | Homepage "real profiles" block — 6 cards. **Anonymous-only surface — the featured flag plus velocity_score is what decides who appears here.** |

### B.3 `/hirers` — `src/app/hirers/page.tsx`

Same query shape as homepage (lines 36-49): featured-first via
`featured + featured_order`, fill from velocity_score desc, limit 6.

`/employers` is a 308 stub (`src/app/employers/page.tsx:6` →
`permanentRedirect('/hirers')`) — Batch 3 terminology pass. Not an
independent ranking surface.

### B.4 `/feed` — `src/app/feed/page.tsx`

| Aspect | Value |
|---|---|
| Reads | `posts` with `profiles!inner(...)` JOIN — H9a published-gate (line 23, comment explicit) |
| Filter | `.eq('profiles.published', true)` (line 24) |
| Sort | `.order('created_at', desc)` on `posts` (line 25) |
| Slice | `.limit(20)` (line 25) |
| Ranks profiles? | **No — ranks `posts` by recency.** A profile that posts twice today appears twice; a profile that hasn't posted in months doesn't appear at all. |
| Reads receipts? | **No** |

### B.5 `/api/feed` — `src/app/api/feed/route.ts`

JSON feed of posts (powers homepage's recent-posts widget). When
`featured=1` query param: `.eq('featured', true) .order('featured_order',
asc)`. Otherwise: `.order('created_at', desc)`. **Ranks `posts`, not
profiles.**

### B.6 `/atlas/roles/[id]` — `src/app/atlas/roles/[id]/page.tsx`

| Aspect | Value |
|---|---|
| Reads | `getAtlasRole` + `getRecentReceiptsAtRole` (`src/lib/atlas/roles.ts`) |
| Filter (the latent bug) | `.contains('atlas_confirmed', [roleId]) .eq('atlas_version', version) .eq('visibility', 'public')` (`src/lib/atlas/roles.ts:82-84`) |
| Sort | `.order('issued_at', desc) .limit(5)` |
| Effect today | **Renders empty "recent receipts" block for every role.** All 47 receipts have empty `atlas_confirmed`; the writer is `/paste/review` user-confirmation only, never the enrichment adapter. Logged as a known deferred bug in commit `4787a7b`. |

### B.7 `/api/builders/geo` — `src/app/api/builders/geo/route.ts`

| Aspect | Value |
|---|---|
| Reads | `profiles.select('location')` (line 120) |
| Filter | `.eq('published', true)` (line 122) |
| Sort | none — aggregates by normalized location code |
| Ranks profiles? | **No** — returns per-country counts. Map widget on homepage. |

### B.8 `/og` image route — `src/app/og/route.tsx`

Single-builder OG card. Reads `profiles.select('full_name, role,
verified, location').eq('username', X).eq('published', true)` (line
253-260). **No ranking. One profile in, one image out.**

Also reads `proof_receipts.select('title, atlas_confirmed,
verification_level, subject_id')` for receipt-OG variant (line 48) —
single receipt, no ranking.

### B.9 `/u/[username]` — `src/app/u/[username]/page.tsx`

Single-profile page. `getPublishedProfile` (`src/lib/profiles.ts:46-55`)
with `.eq('username', X) .eq('published', true) .single()`. Returns
null → `notFound()`. **Not a ranking surface.**

Reads `proof_receipts` per-profile (line 64-71) when `entity_id` set:
`.eq('subject_id', entity_id) .eq('visibility', 'public') .order(
'issued_at', desc) .limit(10)`. Ranks the builder's own receipts by
recency; doesn't rank across builders.

### B.10 MCP `get-builder` — `src/lib/mcp/tools.ts:183`

Single-builder lookup via `getPublishedProfile` (same source as
`/u/[username]`). **No `list-builders` tool exists by design** per
`src/lib/mcp/README.md:30` ("forbidden by design" — anti-bulk-
extraction). MCP cannot rank across the population; single lookups
only.

### B.11 `/collections/[slug]` — `src/lib/collections/assemble.ts`

Reads `profiles` filtered by `consented_collection_members` join.
4-gate filter chain (lines 50-66 per AGENTS.md invariant #2 reference).
Sort: `.order('opted_in_at', asc)` (line 67) — by opt-in time, NOT by
quality. Collection membership is the gate; ordering within a
collection is opt-in-recency.

### B.12 `/jobs`, `/jobs/[id]`, `/company/[slug]`

Confirmed by grep: **none read `profiles` for listing.** `/jobs`
lists job rows; `/company/[slug]` lists `jobs` and reads
`employer_profiles`. Out of scope for builder ranking.

### B.13 `/leaderboard`

**DELETED in Batch 1 KILL pass** (`docs/decisions/DISCOVERY_batch1_kill_pass.md:72`).
No `src/app/leaderboard/` directory exists. The top-10 velocity-DESC
page is gone.

### B.14 `/dashboard`, `/messages`, `/admin/*`

- `/dashboard` and `/dashboard/edit` read the current user's own
  profile only. Not ranking surfaces.
- `/messages` reads message rows with `profiles!builder_profile_id(...)`
  joins. Sort: by message recency, not builder rank.
- `/admin/page.tsx:31` reads ALL profiles `.order('created_at', desc)`
  — admin operational view, not public.
- `/admin/candidates/next` (line 90) — sorts the OUTREACH `candidates`
  table (not `profiles`) by custom tier rank + priority + velocity.
  Operational; not a public surface.

### B.15 Sitemap — `src/app/sitemap.ts`

Generates URLs for all `published=true` profiles. Not ordered for
ranking; ordered by `created_at` for crawler hints. Worth noting:
sitemap exposure is **uniform** across all published profiles, so
search engines see the unverified backfilled profiles equally with
the verified ones. The discoverability question downstream of /talent
is search-driven, not ranking-driven.

---

## C. Columns used in any sort or filter today

| Column | Table | Reads via | Writes (current) | Distribution (operator SQL §F) |
|---|---|---|---|---|
| `published` | profiles | universal gate on every public surface | `autoVerify.ts:59` (`{verified:true, published:true}`), `/api/admin/verify`, manual via Supabase Dashboard, signup path | 41 true / 26 false (per `STEP_3_DISCOVERY.md:21-22`, 2026-05-17 snapshot) |
| `verified` | profiles | primary sort key on `/talent` (`talent/page.tsx:60`); filter chip on `/talent`; primary sort key implicitly via `featured` + admin promotion; visual chip on every card | `src/lib/autoVerify.ts:59` (auto when criteria met), `src/app/api/admin/verify/route.ts:27` (admin manual flip) | 17 true / 24 false among the 41 published (per STEP_3 §A.4) |
| `velocity_score` | profiles | secondary sort on `/talent` default sort, homepage fill, `/hirers` fill | **NO WRITER IN CURRENT CODE** — see §D post-mortem | snapshot values frozen pre-Batch-1; operator SQL §F shows current distribution |
| `featured` | profiles | gate on homepage + `/hirers` featured block; primary sort dimension for those surfaces | manual via Supabase Dashboard (no code writer found) | unknown — operator SQL §F |
| `featured_order` | profiles | sort key for `featured=true` rows on homepage + `/hirers` | manual via Supabase Dashboard | unknown — operator SQL §F |
| `created_at` | profiles | tertiary sort tiebreak on `/talent` default; primary sort when `sort=newest`; sitemap order | Supabase column default | universal |
| `primary_profession` | profiles | filter on `/talent` (`talent/page.tsx:56`) | self-edit via `/dashboard/edit`; admin/import paths | unknown — operator SQL §F |
| `availability` | profiles | filter on `/talent` (`talent/page.tsx:57`); visual chip | self-edit via `/dashboard/edit` | unknown — operator SQL §F |
| `visibility` (on proof_receipts) | proof_receipts | gate on every receipt query (`=public`) | `paste/publish.ts` writes from draft input | 47 rows all `public` (per §G.5 audit results context) |
| `atlas_confirmed` | proof_receipts | gate on `/atlas/roles/[id]` recent-receipts query (broken — see §B.6) | `paste/publish.ts:251` only — empty when via enrichment adapter | 0 receipts with non-empty `atlas_confirmed` (confirmed in Verification 2 above) |
| `issued_at` | proof_receipts | sort on `/u/[username]` receipts + `/atlas/roles/[id]` recent | publish-time | universal |

**No engine output column appears in any `.order()`, `.filter()`,
`.gt()`, `.contains()` clause that affects builder ranking.** Confirmed
by grep:

```
grep "atlas_confidence|atlas_inferred|capabilities|event_type"
  src/app src/lib | grep -E '\.order|\.filter\(|\.gt\(|\.gte\(|\.contains|\.in\('
→ (no results)
```

---

## D. `velocity_score` post-mortem

### D.1 What it was

A 0-100 score computed in V1 from three inputs (per
`SITE_AUDIT_2026-05-16.md:319` and pre-Batch-1 source):

- Commits in the builder's connected GitHub last 90 days (max 40 points)
- Build Feed posts in last 90 days (max 30 points)
- Profile completeness (max 30 points)

Recomputed by `/api/velocity/calculate/route.ts` (POST endpoint). Stored
on `profiles.velocity_score`.

### D.2 Batch 1 KILL pass — what was removed

Per `docs/decisions/DISCOVERY_batch1_kill_pass.md:110-159`:

- `/api/velocity/calculate/route.ts` — **deleted** (the writer)
- `/leaderboard` — **deleted** (the most prominent reader)
- `src/app/join/page.tsx:102` — `velocity_score: 0` initial value on
  signup — **removed**
- Column itself stays; existing reads stay; **only writes were removed**

### D.3 Current writers — verified by grep at HEAD `19a233e`

```
grep -rn "velocity_score" src | grep -E "\.update|\.insert"
→ src/app/api/admin/candidates/import/route.ts:197
  (writes to candidates table — NOT profiles)
```

**No code path writes `profiles.velocity_score` today.** Existing
values are frozen snapshots from pre-Batch-1 recomputes. New signups
since Batch 1 get `velocity_score = NULL` (no default written; column
nullable).

### D.4 Current readers — what still depends on it

| File | Use |
|---|---|
| `src/app/talent/page.tsx:65` | secondary sort key (default sort) |
| `src/app/page.tsx:57` | sort key on homepage fill query |
| `src/app/hirers/page.tsx:48` | sort key on /hirers fill query |
| `src/app/talent/TalentClient.tsx:172-176` | renders velocity chip on card when `>0` |
| `src/app/u/[username]/page.tsx:264-268` | renders velocity bar on profile page when `>0` |
| `src/app/dashboard/page.tsx:80` | passes to BuilderDashboardClient for self-display |
| `src/app/admin/page.tsx:61,275` | admin operational view (high-velocity count + color chip) |
| `src/lib/jsonld/person.ts:183-184` | emits `shipstacked:velocityScore` in Person JSON-LD when `>0` |
| `src/lib/collections/assemble.ts:88,119,196` | passes through to collection JSON-LD |
| `src/app/api/v1/profile/route.ts:98` | V1 builder API output (external consumers) |
| `src/app/og/route.tsx`: passed to `ShareButtons` via `/u/[username]` |
| `src/app/api/messages/route.ts` | included in message-list profile nest |

### D.5 Honest classification

**`velocity_score` is functionally dead but structurally load-bearing.**

- **Dead writes:** nothing recomputes it. New signups get NULL. The
  values for existing profiles are frozen at whatever Batch 1's last
  recompute produced.
- **Live reads:** 14+ code paths still read it. Three of them (the
  three sort queries) **make it the de-facto primary signal for who
  appears in slots 1-6 of `/talent`, `/`, and `/hirers`** for anonymous
  viewers. Other reads are display-only.
- **Implication:** the homepage, hirers landing, and talent default
  sort are ranking by a metric nothing updates. A new builder who
  signs up today and ships 10 receipts via Batch 5 enrichment has
  `velocity_score = NULL` and sorts to the bottom; an old verified
  builder with `velocity_score = 80` from a 2026-04 recompute sits at
  the top, even if they haven't shipped anything since.

### D.6 Staleness window

Without DB access I can't precisely date the freeze, but the Batch 1
discovery doc was prepared 2026-05-16 and the velocity-calc endpoint
was deleted in that batch. Values are at minimum **7 days stale** as
of this audit (2026-05-23) and growing.

The freeze interacts badly with Batch 5: Batch 5 produces fresh
engine signal for every new and updated profile. The sort logic
cannot see that signal.

---

## E. Engine-output utilization gap

For each column the engine writes, where does it surface today, and is
it used for ranking/promotion/demotion across the population?

| Column | Display surfaces | Used for cross-population ranking? |
|---|---|---|
| `proof_receipts.atlas_inferred[]` | `/u/[username]` chip (via receipts row), `/p/[slug]` rendering | **NO** — no sort/filter clause references it anywhere |
| `proof_receipts.atlas_confirmed[]` | `/u/[username]` chip (only when populated; today empty), `/p/[slug]`, `/atlas/roles/[id]` recent-receipts filter (broken — §B.6) | **NO** for ranking; latent broken filter on `/atlas/roles/[id]` |
| `proof_receipts.atlas_confidence` | not displayed on any surface; only stored | **NO** |
| `proof_receipts.verification_level` | `/u/[username]` receipt list (per-receipt chip), `/p/[slug]` verification ladder UI, `/og` receipt-OG card | **NO** — never used as a sort or filter dimension |
| `proof_receipts.event_type` | `/u/[username]` per-receipt label, `/p/[slug]` | **NO** for ranking; indexed but no query uses the index for cross-population work |
| `proof_receipts.capabilities[]` | `/p/[slug]` chip rendering | **NO** — GIN-indexed (`idx_receipts_capabilities`) but nothing queries the index |
| `proof_receipts.stack` | `/p/[slug]` chip rendering | **NO** — not indexed, not queried for filtering |
| `proof_receipts` row existence | `/u/[username]` "Proof receipts" section appears when count > 0 | **NO** — `count(receipts)` per builder isn't sorted or filtered on |

**Summary:** every engine output column is either render-only on the
single-builder/single-receipt page, or completely unused. **Zero
engine-derived signal flows into any ranking decision across the
builder population.**

The Batch 5 ship made the engine fire on every signup. The output
materializes on `/u/<username>` pages. It does not move anyone's
position on `/talent` or `/` or `/hirers`.

---

## F. SQL block — current ranking outcome (operator runs in Dashboard)

Read-only. Reveals (a) the actual current sort order on `/talent`
default, (b) which builders fill slots 1-6 (anonymous-visible vs
paid-only), (c) whether engine signal (receipt_count, max_confidence)
correlates with sort position at all.

```sql
WITH ranked AS (
  SELECT
    p.username,
    p.full_name,
    p.verified,
    p.velocity_score,
    p.featured,
    p.featured_order,
    p.created_at,
    p.entity_id,
    (SELECT count(*) FROM public.proof_receipts r
       JOIN public.entities e ON e.id = r.subject_id
       WHERE e.profile_id = p.id AND r.visibility = 'public') AS receipt_count,
    (SELECT max(atlas_confidence) FROM public.proof_receipts r
       JOIN public.entities e ON e.id = r.subject_id
       WHERE e.profile_id = p.id AND r.visibility = 'public') AS max_confidence,
    (SELECT count(*) FROM public.proof_receipts r
       JOIN public.entities e ON e.id = r.subject_id
       WHERE e.profile_id = p.id AND r.visibility = 'public'
         AND r.verification_level = 'L1_artifact_confirmed') AS l1_count,
    row_number() OVER (
      ORDER BY p.verified DESC NULLS LAST,
               p.velocity_score DESC NULLS LAST,
               p.created_at DESC
    ) AS talent_default_rank
  FROM public.profiles p
  WHERE p.published = true
)
SELECT
  talent_default_rank,
  CASE WHEN talent_default_rank <= 6 THEN '✓ anonymous-visible'
       ELSE 'paid-only' END AS visibility,
  username,
  full_name,
  verified,
  velocity_score,
  featured,
  receipt_count,
  max_confidence,
  l1_count,
  created_at::date AS signup_date
FROM ranked
ORDER BY talent_default_rank;
```

**What to look for:**

1. **Slot 1-6 occupants** — the anonymous-visible cohort. Should be
   the top-6 most-discoverable builders. Are they the ones with the
   strongest engine signal? Or are they whoever happened to have the
   highest pre-Batch-1 velocity_score?
2. **Builders with high `receipt_count` but low `talent_default_rank`
   (i.e. high rank number → late in sort)** — these are the gap
   victims. Engine produced rich signal; ranking can't see it.
3. **`velocity_score` NULL vs non-NULL** — sorting on `DESC NULLS
   LAST` puts NULLs at the bottom. Any post-Batch-1 signup with no
   velocity_score is in the bottom bucket regardless of engine
   activity.
4. **`featured=true` rows** — not visible in this query's sort (which
   reproduces /talent), but the homepage + /hirers featured-first
   queries override the default sort. Worth knowing how many rows
   are `featured=true` and whether they overlap with high-receipt
   builders.

The §F SQL is the single highest-value diagnostic for understanding
"what does the public actually see today, ordered by what."

---

## G. Synthesis — where the gap is most visible

### G.1 The mismatch in one sentence

**The engine produces fresh quality signal per receipt; the ranking
machinery has been reading a frozen V1 score with no live writer
since Batch 1.**

### G.2 The three concrete gap patterns

1. **High-engine-signal builder ranked low.** A post-Batch-5 signup
   with 5 L1 receipts averaging 0.85 confidence has `velocity_score
   = NULL` → ranks after every existing builder with `velocity_score
   > 0`, including builders whose last engine activity was zero. This
   is the gap-victim pattern §F.2 surfaces.

2. **Low-engine-signal verified builder ranked high.** A
   `verified=true, velocity_score=80` profile from a 2026-04 V1
   recompute sits in `/talent` slot 1-6 with no requirement to have
   ever published a receipt. The `verified` flag is admin-managed
   AND auto-set via `autoVerify.ts` based on V1 criteria (1 post
   with outcome + url, profile fields, projects or skills) — none
   of which mention V2 receipts.

3. **Featured but stale.** The homepage + /hirers featured block is
   gated by the manual `featured=true` flag with no auto-population.
   Once set, it doesn't refresh. A builder who was featured in 2026-04
   stays featured indefinitely until manually demoted.

### G.3 Why this is a quiet problem, not a loud one

- /talent default sort still works — it just promotes the wrong people
- /u/<username> renders correctly for everyone (no ranking)
- /atlas/roles/[id] is broken on a separate axis (atlas_confirmed bug)
- The engine isn't visibly failing; it's producing data into a
  surface that doesn't read it for ranking

No one sees a 500. No one sees the gap unless they look at the
ranking SQL.

### G.4 Why the gap will widen, not narrow

- Every new Card 1 signup adds an unranked-by-engine profile to the
  bottom of /talent
- Every existing builder that re-enriches gets fresh receipts that
  don't move them
- `velocity_score` continues to be the de-facto primary signal for
  anonymous viewers' slots 1-6
- The 17-verified-vs-24-unverified split widens as new sign-ups
  accumulate (autoVerify writes to `verified` but the criteria are
  V1 — outcome+url posts, projects, skills — engine activity does
  not satisfy them)

---

## H. Recommendation — derived quality score

### H.1 The shape

A `derived_quality_score` on `profiles` (or on a new
`profile_signal_snapshots` table to keep `profiles` unchanged) that
aggregates engine output per builder. Candidate components:

| Component | Source | Weight (start) |
|---|---|---|
| Receipt count (capped) | `count(proof_receipts WHERE subject_id IN builder's entities AND visibility='public')` | up to 30 |
| Verification-level mix | mean ordinal of `verification_level` per receipt | up to 20 |
| Atlas-classifier confidence | mean of `atlas_confidence` across receipts | up to 20 |
| Recency | days-since-most-recent receipt (decay curve) | up to 20 |
| Profile completeness | `shipstacked:*` field presence (mirror autoVerify criteria) | up to 10 |

Total: 0-100. Same range as `velocity_score` so downstream
display code (`vColor` thresholds, JSON-LD `shipstacked:velocityScore`,
etc.) can be adapted with minimal disruption — or a parallel column
emitted alongside.

### H.2 The hard questions the operator decides

1. **Replace or augment?** Does `derived_quality_score` REPLACE
   `velocity_score` everywhere, or sit alongside it as a second sort
   key? Replacement matches the "engine is the source of truth"
   positioning; augmentation is lower-risk.
2. **Write cadence.** Recompute on each enrichment run (cheap), via a
   trigger on `proof_receipts` insert (cheaper), or via a periodic
   cron (simplest). The Batch 5 doc deferred cron infrastructure;
   trigger is the lightest-touch option.
3. **Does `verified` still gate sort order?** Today `/talent` sorts
   `verified DESC` first. With a derived quality score, should
   `verified` remain the primary key, or should derived quality
   override (and `verified` become a chip-style filter only)?
4. **What about builders with zero receipts?** They get score 0.
   Where do they sort? Bottom of the list (current behavior with
   `velocity_score = NULL` under `DESC NULLS LAST`) is honest but
   harsh on newcomers. A small "newcomer floor" (e.g. 10 points for
   any published profile, regardless of receipts) is also defensible.
5. **Featured override.** Does `featured=true` still trump the
   derived score on homepage + /hirers, or is the manual featured
   flag deprecated in favor of "top-N by derived quality"?
6. **Sparse profiles backfilled by Batch 5.** The 23 just-backfilled
   profiles have ~1.5 receipts each on average. Some have 0 (the
   bare-minimum-fields subset). A derived score would put them
   roughly mid-pack — not bottom (they have SOME signal), not top.
   That seems right but it's a value judgment.

### H.3 Why this is worth building (or not)

**Worth building if:** the operator believes the "proof-of-work, not
self-reported" positioning needs to be visible in the discovery
surface, not just on individual profile pages. Today a hirer using
`/talent` cannot tell which builders are engine-verified vs. just
flagged-verified-in-2026-04. A derived quality score makes that
visible.

**Not worth building if:** `/talent` is treated as a curation surface
(operator-controlled featured + verified flag) and the engine output
is meant for the per-profile depth view only. In that frame,
ranking is editorial; the engine is documentation.

The 23-backfill audit suggests the operator's instinct is the
former — the operator paused Batch 6 to verify reality before
exposing engine-derived facets. That instinct is consistent with
building a derived quality score before (or as part of) Batch 6.

### H.4 Cheaper alternative if H.1 is too much

A two-line `/talent` sort change with no DDL:

```ts
.order('verified', { ascending: false })
.order('receipt_count_subquery', { ascending: false, nullsFirst: false })  // NEW
.order('velocity_score', { ascending: false, nullsFirst: false })
.order('created_at', { ascending: false })
```

Adds `count(proof_receipts)` per builder as a secondary sort BEFORE
velocity_score. Builders with engine activity bubble up; the frozen
velocity score is demoted to a tiebreak. No DDL, no derived column,
no cron, no trigger. Implementation cost: ~10 lines of TypeScript +
the subquery shape.

This doesn't address the deeper "verified flag is V1-derived" issue
(§G.2 pattern 2), but it does address the most visible symptom (§G.2
pattern 1) at near-zero cost.

---

## I. Out of scope (this audit)

- **No code mutation.** Findings only.
- **No DDL.** No new column, table, view, trigger, or cron.
- **No revert of any backfill or column write.** The 23-profile
  backfill stays.
- **No change to the latent `/atlas/roles/[id]` bug** (already noted
  in commit `4787a7b`).
- **No change to `autoVerify` criteria.** Mentioned only as a
  reference for why `verified` doesn't reflect engine activity.

---

## J. What this audit produced

- Confirmation that `velocity_score` has no writer in current code
  (Batch 1 KILL pass complete, no replacement landed).
- Confirmation that every engine output column is unused in any
  ranking/promotion/demotion clause across the entire codebase.
- Identification of the three concrete gap patterns (§G.2).
- An operator SQL block (§F) that surfaces the actual current ranking
  outcome — slots 1-6 (anonymous-visible) vs 7-N (paid-only) — and
  whether engine signal correlates with sort position.
- A bounded recommendation (§H) with a stripped-down alternative
  (§H.4) requiring no DDL.

The operator decides whether to:

1. Adopt §H.1 (build derived quality score; Batch 7-shaped work).
2. Adopt §H.4 (cheap sort patch; one PR, no DDL).
3. Defer both and proceed with Batch 6 as originally scoped (filter
   UI only; ranking stays as-is).
4. Some combination (e.g. §H.4 now, §H.1 later).

No mutations performed. HALT.
