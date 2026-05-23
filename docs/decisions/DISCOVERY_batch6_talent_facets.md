# DISCOVERY — Batch 6: `/talent` facets — make engine output filterable

Phase 1 discovery doc. Read-only research. No code mutation, no commits
until operator signs off Section H below.

Prepared at HEAD `d36f954` on 2026-05-23.

---

## A. Purpose

Batch 5 made the engine fire on every Card 1 signup. Each enriched
builder now has `proof_receipts` rows carrying Atlas role
classifications, verification levels, capability tags, and stack
signals. **None of this is filterable on `/talent` today.**

The `/talent` page currently reads from `profiles` only — no JOIN to
`entities` or `proof_receipts`. It filters on three profile columns
(`primary_profession`, `availability`, `verified`) plus one sort
(`velocity_score` | `created_at`). The classified, machine-derived data
that the "proof-of-work, not self-reported" positioning depends on is
unreachable from the discovery surface.

**Goal:** make the engine's output legible and actionable on `/talent`.
Hirers can filter discovery by atlas role, verification level, stack,
and capability. The positioning becomes visible in the surface where
hirers actually look.

**Honest framing — first UX/frontend batch since Batch 4:**
- No DDL expected. No external API integration. Type-safe,
  build-verifiable.
- Cost is bounded; risk is bounded; visible product win.
- Real product UX decisions on facet behavior, aggregation semantics,
  sort options, and access gating. The doc surfaces; operator decides.
- Batch 5's data is now flowing — Batch 6's job is making it useful.

**Out of scope** (see §C): entity-graph relationships, team profile
aggregate receipts, new aggregate columns on `entities`/`profiles`, RLS,
search redesign, mobile responsive overhaul, A/B testing infra.

---

## B. The 8 load-bearing decisions (surfaced — not decided)

Doc does not pick defaults. Each decision lists options with concrete
trade-offs as observed in `src/app/talent/page.tsx`,
`TalentClient.tsx`, and the receipt schema.

### D1 — Filter facets to expose

Confirm or revise the audit's four facets:

- (a) **Atlas role** — `proof_receipts.atlas_confirmed` (preferred) and/or
  `atlas_inferred` (text[]). 40 v0.4 role IDs (`A1..A7, B1..B4, C1..C9,
  D1..D5, E1..E4, F1..F5, G1..G6`). Cluster-level rollup (7 letters) is
  also viable.
- (b) **Verification level** — `proof_receipts.verification_level` (text).
  Stored values today: `L0_claimed`, `L1_artifact_confirmed`. Spec also
  allows `L2_technically_checked`, `L3_externally_attested`,
  `L4_cryptographically_signed`, but those code paths don't ship yet
  (see §D.3). **Today this is effectively a binary filter.**
- (c) **Stack** — `proof_receipts.stack` (jsonb, `StackElement[]`,
  shape `{ name, version?, role }`). NOT three separate columns
  (`repo_languages`, `repo_dependencies`, `stack_signals`) as the
  briefing suggested — see §D.2. Filter logic would need a jsonb `@>`
  or `->>'name'` extraction.
- (d) **Capability** — `proof_receipts.capabilities` (text[]) backed by
  `capabilities_vocab` (the harvested tag dictionary). Already
  GIN-indexed (`idx_receipts_capabilities`). The vocab table has only
  4 fixture-residue rows per the audit; real volume depends on Batch 5
  enrichment of signups.

**Sub-options worth flagging:**

- Atlas role granularity: (a-i) full 40-role grid, (a-ii) 7-cluster
  rollup, (a-iii) both (cluster pre-filter → role chips).
- Capability source: (d-i) text-input free search against the array,
  (d-ii) chip selector backed by `capabilities_vocab` (promoted-only
  vs harvested-too).

Operator picks scope. Doc recommendation deferred to §H.

### D2 — Filter UI shape

`TalentClient.tsx` already implements **chip strips** on desktop and a
**bottom-sheet drawer** on mobile (lines 14-141 + 323-381). URL state
is already in use (lines 235-244). The new facets can extend this or
replace it.

- (a) **Faceted sidebar** (Amazon/eBay style; checkboxes per facet).
  Different layout from today's strip — requires desktop redesign.
- (b) **Top filter strip extension** (more chips below the existing
  profession/availability rows). Lowest disruption; matches current
  visual model. Risk: chip count growth (4 facets × ~5-40 values =
  unwieldy without grouping).
- (c) **Search-bar-driven** (typed facets like `role:A1
  verification:L1 stack:next.js`). Powerful but invisible until typed
  — discovery problem.
- (d) **Dropdown selects per facet** (HTML `<select>` per facet,
  collapsing into a row). Compact; less mobile-friendly.

The mobile drawer pattern scales fine with more facets (sectioned by
heading; already does Role/Availability/Sort/Verified). The desktop
strip is where chip-count growth would bite.

### D3 — URL state

Already established as URL params in the codebase (`?profession=...&
availability=...&verified=true&sort=newest`, lines 235-244 in
TalentClient + lines 19-24 in page.tsx). Almost certainly:

- (a) **URL params** — shareable, bookmarkable, deep-linkable,
  back-button-friendly. Matches existing convention.
- (b) In-memory only — no shareability; breaks Back; no precedent in
  this codebase.

Flag it for explicit confirmation since adding 4 more facets means
longer URLs. URL-length concern: a four-facet multi-select with 5
values per facet = ~20 query keys — well under any browser limit but
worth noting.

### D4 — Aggregation level: entity vs receipt

`proof_receipts` is per-artifact. A builder with 5 receipts can have
different Atlas roles, verification levels, and stacks per receipt.
When a hirer filters "atlas role = A1," what does it mean?

- (a) **ANY** — builder has ≥1 receipt with that role. Maximally
  inclusive; most matches; "they've done this kind of work at least
  once."
- (b) **DOMINANT** — builder's modal role across receipts is A1.
  Requires computing the mode per-query; restrictive; "this is their
  primary thing."
- (c) **WEIGHTED** — score each builder per role (count of receipts
  with that role / total receipts), filter on threshold. More
  expressive; more compute.

Same question applies to **verification level** (D5 below) and **stack**
(any-of vs majority-of). Capability is per-receipt text[] union →
filter is naturally "any" (D4 doesn't apply identically).

This is a UX semantics question. (a) ANY is the canonical Solr/ES
faceting default — likely what hirers expect.

### D5 — Verification level semantics + display

Per-receipt the value is one of:
- `L0_claimed` — user-claimed; artifact not reachable at publish time.
- `L1_artifact_confirmed` — artifact fetched OK at publish time.

(L2/L3/L4 schema-supported but no code path writes them yet — see
§D.3. Filtering on them today returns 0 rows.)

For a **builder-level** verification level, options:

- (a) **HIGHEST** — builder's verification level = max(receipts'
  levels). One L1 receipt makes them "L1 verified."
- (b) **ALL** — builder's level = min(receipts' levels). All receipts
  must hit the threshold.
- (c) **MAJORITY** — >50% of receipts at or above threshold.
- (d) **PER-RECEIPT FILTER** — don't aggregate; filter is "show
  builders who have ≥1 receipt at level X" (same as D4 ANY).

If today the practical values are just L0/L1, (a) makes the filter "are
they enriched at all" — a useful binary. Long-term as L2+ ships, (a)
becomes meaningful gradations.

**Also a display question:** today the `/talent` cards show a binary
`verified=true/false` chip based on `profiles.verified` (a V1 manual
admin flag, not the V2 verification ladder). Batch 6 has the option to
**add** a verification-level chip per card (additive per AGENTS.md
invariant #6) without touching the existing verified pill, or to
unify them. Operator decides.

### D6 — Sort options

Today: `velocity` (default) + `newest`. Velocity is computed by V1's
algorithm (`profiles.velocity_score` numeric column). After Batch 6
adds receipt-aware filters, additional sorts become coherent:

- (a) **Most receipts** — `count(proof_receipts) DESC`. Activity
  proxy. Requires aggregate query.
- (b) **Highest verification level** — `max(verification_level) DESC`
  with tiebreak on count. Needs aggregate + ordinal mapping.
- (c) **Most recent enrichment** — `max(issued_at) DESC` from receipts.
  Aggregate query.
- (d) **Most-relevant-to-current-filter** — relevance score against
  active facets. **Out of scope** for Batch 6 (briefing explicit: defer
  if it requires new aggregate computation).
- (e) **Keep existing sorts only** — velocity + newest; don't add
  receipt-aware sorts. Simplest; no aggregate-query work.

Operator picks default + available sort options. Default-sort change
is more disruptive than adding optional sorts.

### D7 — Empty-state UX

Filter combinations will produce zero matches frequently while supply
is small (audit's 18-builder cohort + post-Batch-5 signups; receipt
count per builder is also low). Options:

- (a) **"No matches" + filter-reset CTA** — current behavior for the
  existing filter set (`TalentClient.tsx:404-413`). Familiar pattern.
- (b) **Auto-relax filters** — drop the most-restrictive filter, show
  closest matches with a banner "no exact matches; showing closest by
  dropping verification level." More helpful, more code; risks user
  confusion ("what did it show me?").
- (c) **Suggest similar builders** — show top-N by velocity ignoring
  filters, banner "no matches; here's our most active builders." Even
  more helpful, even more code; semantically a different page.

(a) preserves the current shape; (b)/(c) introduce ranking logic that
expands scope.

### D8 — Hirer-only vs all-visitor access to filters

Today `/talent` is open to all visitors but paywalled past 6 builders
(`page.tsx:72-73`, `isPaidHirer ? profiles : profiles.slice(0, 6)`).
**Filters apply to the full set BEFORE the paywall slice** — meaning
an anonymous viewer can filter to "L2 + Atlas A1 + stack:next.js" and
see the top 6 of *that* filtered cohort. Three concerns:

- (i) **Filter discovery feature** — paid hirers can use the full
  facet set; anonymous viewers can't. Makes the paywall feature-shaped,
  not just quantity-shaped.
- (ii) **Information leakage** — anonymous viewer running 40 different
  filter combinations could enumerate the whole builder set (6
  builders × ~40 filter combinations covers ~240 unique slots; the
  current published-builder count is comparable to that ceiling). The
  paywall as-is is content-based ("show 6 of N"); a feature-based
  paywall ("filter UI dimmed for non-paying") is a different model.
- (iii) **Locked spec line** ("paid hirers get full talent graph") —
  potentially relevant; doc cannot resolve "graph" vs "filters" without
  operator interpretation.

Options:

- (a) **Stay fully open** — filters available to everyone; paywall
  remains content-based (top-6 slice). Simplest; lowest friction;
  matches today's behavior.
- (b) **Gate filters to logged-in users** — login required to filter;
  paywall still on full content. Adds CTA pressure; minor friction
  loss for hirers comparing sites.
- (c) **Gate filters to paid hirers only** — full paywall on
  filtering. Strongest paywall; biggest friction loss; possibly
  unfair if "filter to find" is the basic task.
- (d) **Hybrid** — basic facets (e.g. atlas role) open; advanced
  (verification level, stack-specific) paid. More design complexity;
  ambiguous boundary.

Operator decides based on positioning intent.

---

## C. Out of scope (explicit)

- **Batch 7+ entity graph** (`modes.team`, member linking, team
  profile pages) — separate batch; depends on team signup data
  accumulating.
- **Backfill of dominant_atlas_role / aggregate columns on `entities`
  or `profiles`** — this batch reads what exists; doesn't write
  derived data. Implication: filter logic is **JOIN/aggregate at
  query time**, not pre-computed. See §F.1.
- **RLS rollout.**
- **Search redesign on `/talent` beyond adding filters** — the existing
  search-text box (if any — see §D.5) stays as-is.
- **Mobile responsive overhaul** — work where needed for new filter UI,
  but no broader redesign.
- **A/B testing infrastructure.**
- **D6 option (d) — relevance-score sort** — defer to a later batch if
  it requires new aggregate computation.
- **`/jobs` filter parity** — `/jobs` has its own filter surface; not
  touched in Batch 6.
- **`/feed` filter parity** — same.
- **Atlas v0.5 role taxonomy bump** — Batch 6 reads what's in
  `atlas_roles` table today (v0.4, 40 roles). Any future Atlas bump is
  separate.
- **DDL** — no new tables or columns. If query performance becomes a
  bottleneck (see §M.4), a denormalized aggregate column is a later
  batch.

---

## D. Pre-flight verification — results

Read-only reads complete.

### D.1 — `/talent` server-side data fetch (`src/app/talent/page.tsx`)

- Reads `profiles` only. No JOIN to `entities` or `proof_receipts`.
- `.select('id, username, full_name, role, location, bio, avatar_url,
  verified, availability, velocity_score, primary_profession,
  skills(*)')` (line 52). The `skills(*)` is a Supabase nested select
  against the `skills` table (V1 — separate from V2 receipts).
- **Always** filters `.eq('published', true)` (line 53) — preserves
  the published-gate universal invariant (AGENTS.md invariant #2).
- Filters applied today: `verified` (line 55), `primary_profession`
  (line 56), `availability` (line 57).
- Sort: always `verified DESC` first (line 60), then `velocity_score
  DESC, created_at DESC` (lines 64-66) or `created_at DESC` (line 62).
- Paywall slice: `displayProfiles = isPaidHirer ? profiles :
  profiles.slice(0, 6)` (line 72). Filters apply BEFORE the slice.
- **Implication for Batch 6:** adding receipt-based filters requires
  either a JOIN at this layer or a two-pass query (fetch matching
  entity_ids from proof_receipts, then `.in('entity_id', ids)` on
  profiles). See §F.1.

### D.2 — `proof_receipts` schema (the actual columns)

From `supabase/migrations/20260515150752_proof_receipts_v0_1.sql`:60-110.

| Column | Type | Notes |
|---|---|---|
| `subject_id` | bigint FK `entities(id)` | Links receipt → entity → profile (via `entities.profile_id`). |
| `event_type` | text NOT NULL | Capability signal. GIN-indexed (`idx_receipts_event_type`). |
| `atlas_claimed` | text[] | User-claimed Atlas role IDs. |
| `atlas_inferred` | text[] | LLM-classifier output. |
| `atlas_confirmed` | text[] | Confirmed roles. GIN-indexed (`idx_receipts_atlas_confirmed`). |
| `atlas_confidence` | numeric(3,2) | Strongest-role confidence 0-1. |
| `verification_level` | text NOT NULL default `'L1_artifact_confirmed'` | See D.3. |
| `capabilities` | text[] | Capability tags. GIN-indexed (`idx_receipts_capabilities`). |
| `stack` | jsonb | `StackElement[]` with `{ name, version?, role }`. NOT indexed. |
| `visibility` | text | Public-read RLS gates `visibility = 'public'`. |
| `issued_at` | timestamptz | Sort key for recency. |

**Briefing-vs-reality discrepancies (flag these immediately):**

- **There is no `proof_receipts.atlas_roles` column.** Three columns
  hold roles: `atlas_claimed`, `atlas_inferred`, `atlas_confirmed`.
  Batch 6 has to pick one (or merge them) for the filter — most likely
  `atlas_confirmed` since that's what the recent-receipts query on
  `/atlas/roles/[id]` uses (`src/lib/atlas/roles.ts:83`).
- **There are no `repo_languages`, `repo_dependencies`, or
  `stack_signals` columns.** Stack signals live in `proof_receipts.stack`
  jsonb (`StackElement[]`). Filtering on stack requires a jsonb
  containment query or a `->>'name'` extraction. There is **no GIN
  index on `stack`** today.
- **`verification_level` is stored as the FULL STRING** (e.g.
  `L1_artifact_confirmed`), not as `L0`/`L1`/`L2`/`L3`. The briefing's
  L0/L1/L2/L3 shorthand is correct semantically but not what's in the
  column. Filter UI strings need to match.

### D.3 — Verification level — current code-path values

From `src/lib/paste/publish.ts:112,149` and
`src/lib/enrichment/profile-adapter.ts:752`:

The TypeScript type is `'L0_claimed' | 'L1_artifact_confirmed'` —
those are the ONLY two values any code path writes today.

The schema supports L2/L3/L4 (`docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md`
§8.3-8.5) but the L2 background-check worker is unimplemented; L3
attestation flow ships post-Phase-1B; L4 cryptographic signing is
future. **Today's "verification level filter" is effectively binary
(L0 vs L1).** If Batch 6 ships a 4-tier filter UI, three tiers return
0 results until later batches.

### D.4 — Profile-to-receipt linkage

From `supabase/migrations/20260516142038_merge_profiles_entities_link.sql`:

- `profiles.entity_id` (bigint FK `entities(id)`, nullable).
- `entities.profile_id` (uuid FK `profiles(id)`, nullable).
- One-to-one via partial unique indexes (`WHERE ... IS NOT NULL`).
- Tier 1 backfill linked the original cohort (17 entities per audit);
  Batch 5 `findOrCreateHumanEntity` lazily links any new Card 1 signup
  that runs enrichment.

The `/u/[username]` page already demonstrates the join pattern
(`src/app/u/[username]/page.tsx:64-71`):

```ts
const { data: receipts } = profile.entity_id ? await supabase
  .from('proof_receipts')
  .select('id, slug, title, ..., atlas_confirmed, verification_level, ...')
  .eq('subject_id', profile.entity_id)
  .eq('visibility', 'public')
  .order('issued_at', { ascending: false })
  .limit(10)
  : { data: null }
```

This is the model. For `/talent` the direction is inverted: fetch
receipts matching the facet filter, derive matching `subject_id`s,
join back to profiles via `entity_id`.

**Edge case:** profiles with `entity_id IS NULL` (pre-Batch-5
unenriched accounts, or signups whose enrichment hasn't run yet)
cannot satisfy any receipt-based filter. They'd be excluded from
filtered results. Open question: should they show with a "not yet
enriched" badge, or be hidden, or be silently dropped (current logical
default)? Surfaced under D7 implicitly.

### D.5 — Existing filter UI primitives in the codebase

`TalentClient.tsx` already implements:
- `FilterChip` (lines 14-30) — desktop chip component.
- `FilterDrawer` (lines 32-141) — mobile bottom sheet, sectioned per
  facet (Role / Availability / Sort by / Verified-only).
- `pushFilters` (lines 235-244) — URL-state mutator using
  `useTransition` + `router.push`.
- `clearAll` (lines 246-248) — URL reset.
- Empty-state UI (lines 393-413) — "No builders match these filters"
  card with clear-filters CTA.

These primitives are extendable; Batch 6 can add 4 more chip rows
(desktop) + 4 more drawer sections (mobile) without touching the
component shapes.

**No search-bar / typed-facet primitive exists today.** Option D2(c)
would require building it.

Other pages with URL-state filter patterns (grep of `searchParams +
useState filter`): `/messages`, `/admin/candidates`, `/dashboard`,
`/atlas/roles/[id]`, `/paste/review`, `/collections/[slug]/optin`.
None are facet-richer than `/talent`. No reusable Facet component
exists in `src/components/` — Batch 6 would refactor in-place or
extract one.

### D.6 — Atlas role catalog (the 40 v0.4 IDs)

From `src/services/atlas-classifier/prompts/v0.1.0.md` (parsed at
module init by `src/lib/atlas/roles.ts`):

- 7 clusters: **A** (workforce, 7 roles), **B** (operations, 4),
  **C** (compliance, 9), **D** (design, 5), **E** (enablement, 4),
  **F** (operators, 5), **G** (practitioners, 6) = 40 roles total.
- `atlas_roles` table in DB has both v0.3 (34 rows) and v0.4 (40 rows)
  per audit doc. `ATLAS_VERSION_DEFAULT = 'v0.4'`.
- Each role has `name` and `cluster`; v0.4 rows also have
  ISCO/SOC/O*NET crosswalk codes + EU AI Act + ISO 42001 articles.

Filter UI granularity choice (D1 sub-option):
- 40-chip grid = comprehensive but visually heavy.
- 7-cluster pre-filter + role sub-chips = drill-down UX.
- Cluster-only = coarse but always visually compact.

### D.7 — Capabilities and stack — current data state (predicted)

Audit (pre-Batch-5) found:
- `capabilities_vocab`: 4 fixture-residue rows (`agent-loop`,
  `tool-use`, `verification-marker`, `step7-marker`); not real data.
- `proof_receipts`: 0 rows in prod (all test ingestions rolled back).

Batch 5 has been live since `702fdb0` + `d36f954` (today, 2026-05-23).
The cohort backfill (F.4 per Batch 5 §H) — if and when run — will
populate ~55 receipts for the 18-builder cohort. New Card 1 signups
will accumulate receipts continuously.

**The SQL audit block in §G must be run before Batch 6 ships** to
verify there's enough data variety to make filters non-theatrical. If
95% of receipts are L1 and 95% are tagged with the same cluster, four
of the eight decisions above are answering a question with no signal.

### D.8 — Paywall mechanics today

`page.tsx:34-47` — `full_access` subscription check via the
`subscriptions` table, gated by `email + status='active' + product=
'full_access' + (expires_at IS NULL OR expires_at > now())`.

`page.tsx:72` — `isPaidHirer ? profiles : profiles.slice(0, 6)`.
`page.tsx:73` — `isTeaser = !isPaidHirer`.

`TalentClient.tsx:443-467` — teaser CTA below the 6 cards
("+N more builders" + "$199/mo" + sign-in link).

The paywall is **content-only** (slice the array); UI controls
(filters, sort) are not gated. D8 considers whether to change that.

### D.9 — Skills as a facet today (related but separate)

`profiles.select` includes `skills(*)`. `ProfileCard` (TalentClient
lines 143-208) renders up to 3 `claude_use_case` skill chips and 2
other-category skills (line 151-152). **Skills are visible but NOT
filterable.** Sub-question for D1: should "skill" be a 5th facet, or
explicitly out of scope (V1 manual tags vs V2 derived capabilities)?
Recommend explicit out-of-scope to avoid confusion between
self-reported skills and engine-derived capabilities.

---

## E. Current filter shape vs. proposed (audit's four facets)

| Surface | Today | After Batch 6 (per D1 options a-d) |
|---|---|---|
| Filter facets | profession (8 vals), availability (5 vals), verified (bool) | + atlas role (7-cluster or 40-role), + verification level, + stack, + capability |
| Sort | velocity (default), newest | per D6 |
| URL params | `?profession=&availability=&verified=&sort=` | + role / cluster / verification / stack / capability params |
| Data source | `profiles` only | `profiles` + `proof_receipts` JOIN (or 2-pass) |
| Empty state | "No builders match" + clear CTA | per D7 |
| Paywall | content-slice (top 6) | per D8 |
| Mobile | bottom-sheet drawer with sections | extend drawer with 4 new sections |
| Desktop | chip strips | extend or restructure per D2 |

---

## F. Cross-cutting concerns

### F.1 — Query strategy (forced by "no DDL" out-of-scope)

Since no new aggregate columns can be added, Batch 6's
receipt-aware filters must compute aggregates at query time. Two
shapes:

- **(F.1.a) Two-pass query** — first fetch matching `subject_id`s
  from `proof_receipts` with the facet predicates, then `.in('entity_
  id', ids)` on `profiles`. Pros: keeps the existing profiles query
  intact; clear separation. Cons: two round trips; second query loses
  the natural ordering of the first.
- **(F.1.b) Single-query JOIN via PostgREST embed** — Supabase
  supports `profiles.select('..., proof_receipts!inner(...)')`
  patterns that JOIN inline. Pros: one round trip. Cons: filters on
  the embedded table are post-JOIN filters, not pre-filters; PostgREST
  syntax for "ANY receipt has X" is awkward; uses inner-join semantics
  which excludes profiles with no receipts.
- **(F.1.c) RPC / view** — a Postgres function or view that
  pre-aggregates. Counts as DDL (a view is a schema object); contradicts
  out-of-scope unless operator widens scope. Performance ceiling
  highest if added.

For the volumes expected (44 published profiles per audit + a small
multiplier of receipts), (F.1.a) is operationally fine. Performance is
a Batch 7+ concern.

### F.2 — Empty-receipts profiles

Builders whose `entity_id IS NULL` or whose entity has zero receipts
cannot satisfy any receipt-based filter. Three behaviors:

- (i) Silently excluded (today's logical default if filter applies).
- (ii) Shown with a "not yet enriched" badge when no filters active;
  excluded when filters active (current empty-state semantics).
- (iii) Always shown if they match profile-side filters (profession /
  availability / verified) even when receipt filters are also active.

Tied to D7 but worth surfacing separately because it's a data-state
question, not a UI question.

### F.3 — Verification-level chip vs. existing `verified` pill

`profiles.verified` is a V1 admin-managed boolean ("Verified" pill on
cards, lines 165-167 in TalentClient). `verification_level` is V2 per-
receipt enum. These are two different verification signals; today only
the V1 pill is visible on cards. Batch 6 has options:

- (a) Leave the V1 pill; add a separate V2 verification-level chip.
- (b) Replace the V1 pill with the V2 derived level (e.g. "L1
  verified").
- (c) Combine: V1 pill shows when admin-marked, V2 chip shows
  separately when receipts exist.

Per AGENTS.md invariant #6 (additive, never subtractive on existing
surfaces), the safer default is (a).

### F.4 — Verified-first sort interaction

`page.tsx:60` always sorts `verified DESC` first. If Batch 6 adds a
verification-level-aware sort (D6.b), interaction with this primary
sort needs definition. Likely: V1 `verified` flag stays as the
top-level visual division (verified divider on TalentClient line 417-
421); V2 level becomes the secondary sort within each section.

### F.5 — Atlas role display on cards

`ProfileCard` does not display Atlas roles today (it shows skill
chips, line 184-188). To make filter feedback legible ("you filtered
to A1; here's why this builder matched"), Batch 6 should consider
showing the matched Atlas role on each card as a chip. Additive per
AGENTS.md invariant #6. Display logic: show top-N atlas_confirmed role
chips per builder (e.g. up to 3, ordered by frequency across their
receipts) — or just the filter-matched roles when a role filter is
active.

### F.6 — `published=true` invariant still applies

Per AGENTS.md invariant #2, every public surface filters on
`profiles.published = true`. The current `/talent` query enforces this
at line 53. Batch 6's receipt-aware filtering must preserve this —
when filtering by atlas_confirmed, the path is still
`profiles.published=true` AND `entity_id IN (matching subjects)`.

### F.7 — Server-side vs. client-side filter application

Today the filtering is server-side (page.tsx is a server component;
filters apply in the Supabase query). For receipt-aware filtering,
server-side stays the right shape — the volume of receipts a client
would have to fetch to filter client-side is unbounded; server-side
filtering applies to the indexed predicate set (atlas_confirmed,
capabilities, event_type all GIN-indexed; stack not indexed).

### F.8 — Indexes already in place vs. missing

GIN indexes exist on `atlas_confirmed`, `capabilities`, and
`event_type`. **No index on `stack` jsonb.** Filter-by-stack at scale
would seq-scan. With 0-100 receipts in prod today, fine. Past
~10K receipts the stack filter becomes a Batch 7+ index-add candidate.

---

## G. SQL audit block (operator runs in Supabase Dashboard, read-only)

This must run before Batch 6 ships so the operator confirms there's
enough data variety to make filters meaningful. Pure read; no DDL, no
writes.

```sql
-- §G.1 — distinct atlas_confirmed values across proof_receipts
-- (top 20 by count). Confirms whether the role distribution has
-- enough variety to make atlas-role filtering non-theatrical.
WITH roles AS (
  SELECT unnest(atlas_confirmed) AS role_id
  FROM public.proof_receipts
  WHERE visibility = 'public'
)
SELECT role_id, count(*) AS receipt_count
FROM roles
GROUP BY role_id
ORDER BY receipt_count DESC
LIMIT 20;

-- §G.1b — same for atlas_inferred (which may have broader coverage)
WITH roles AS (
  SELECT unnest(atlas_inferred) AS role_id
  FROM public.proof_receipts
  WHERE visibility = 'public'
)
SELECT role_id, count(*) AS receipt_count
FROM roles
GROUP BY role_id
ORDER BY receipt_count DESC
LIMIT 20;

-- §G.2 — verification_level distribution. If 100% are
-- 'L1_artifact_confirmed' the filter is single-valued and theatrical;
-- D5 has no signal to operate on.
SELECT verification_level, count(*) AS n
FROM public.proof_receipts
WHERE visibility = 'public'
GROUP BY verification_level
ORDER BY n DESC;

-- §G.3 — event_type distribution. Confirms capability-via-event
-- variety. (Distinct from capabilities text[], which is the harvested
-- tag set.)
SELECT event_type, count(*) AS n
FROM public.proof_receipts
WHERE visibility = 'public'
GROUP BY event_type
ORDER BY n DESC;

-- §G.4 — capabilities tag distribution (top 20). Backs D1(d).
WITH caps AS (
  SELECT unnest(capabilities) AS tag
  FROM public.proof_receipts
  WHERE visibility = 'public'
)
SELECT tag, count(*) AS receipt_count
FROM caps
GROUP BY tag
ORDER BY receipt_count DESC
LIMIT 20;

-- §G.5 — entities with any public receipts vs. zero receipts.
-- Confirms how many builders the receipt-aware filter can match at
-- all (vs. profiles that would be silently excluded per F.2).
SELECT
  CASE WHEN receipt_count > 0 THEN 'has_receipts' ELSE 'zero_receipts' END AS bucket,
  count(*) AS entity_count
FROM (
  SELECT e.id, count(r.id) FILTER (WHERE r.visibility = 'public') AS receipt_count
  FROM public.entities e
  LEFT JOIN public.proof_receipts r ON r.subject_id = e.id
  WHERE e.kind = 'human'
  GROUP BY e.id
) buckets
GROUP BY bucket
ORDER BY bucket;

-- §G.6 — profiles with published=true AND entity_id IS NOT NULL.
-- These are the candidate set for receipt-aware filters; the
-- complement (entity_id IS NULL) is invisible to any such filter.
SELECT
  CASE WHEN entity_id IS NOT NULL THEN 'linked' ELSE 'unlinked' END AS link_state,
  count(*) AS n
FROM public.profiles
WHERE published = true
GROUP BY link_state
ORDER BY link_state;

-- §G.7 — stack signal sampling. NOT a separate column — lives in
-- proof_receipts.stack jsonb (StackElement[] shape). This pulls top
-- distinct stack-element names.
WITH elems AS (
  SELECT jsonb_array_elements(stack) ->> 'name' AS name
  FROM public.proof_receipts
  WHERE visibility = 'public' AND jsonb_typeof(stack) = 'array'
)
SELECT name, count(*) AS receipt_count
FROM elems
WHERE name IS NOT NULL
GROUP BY name
ORDER BY receipt_count DESC
LIMIT 20;

-- §G.8 — sanity check: receipts written since 2026-05-23 (Batch 5
-- ship). If 0, Batch 5 hasn't generated production data yet and Batch
-- 6 filters will hit fixture-residue or empty results.
SELECT
  date_trunc('day', issued_at) AS day,
  count(*) AS receipts_written
FROM public.proof_receipts
WHERE issued_at >= '2026-05-23T00:00:00Z'
GROUP BY day
ORDER BY day;
```

The operator should paste the §G block into Supabase Dashboard SQL
Editor before approving §H, and bring the results back into the
decision process. If §G.1 shows 1-2 distinct roles, §G.2 shows 100%
L1, §G.4 shows the 4 fixture-residue tags, §G.5 shows ~0 entities
with receipts — Batch 6's filter UI ships against zero signal and the
right call may be to defer until backfill (Batch 5 §F.4) has run.

---

## H. Approval gate (operator decides)

Eight decisions to lock. **Doc does not recommend defaults.** Trade-
offs in §B for each. The §G audit results should be read first — they
shape several of the answers.

- [ ] **D1 — Filter facets to expose:**
      `(a) atlas role` + `(b) verification level` + `(c) stack` + `(d) capability` —
      or subset, plus sub-choice on (a) granularity (40 roles vs. 7
      clusters vs. drill-down), and (d) backing (free text vs.
      `capabilities_vocab`).
- [ ] **D2 — Filter UI shape:** (a) sidebar / (b) chip strip extension
      / (c) typed search / (d) dropdowns.
- [ ] **D3 — URL state:** (a) URL params / (b) in-memory.
- [ ] **D4 — Aggregation level:** (a) ANY / (b) DOMINANT / (c)
      WEIGHTED.
- [ ] **D5 — Verification level semantics + display:** (a) HIGHEST /
      (b) ALL / (c) MAJORITY / (d) per-receipt; plus chip-on-card:
      additive vs. unified with V1 pill.
- [ ] **D6 — Sort options:** keep existing (e) / add (a) most-receipts
      / (b) highest-level / (c) most-recent / [(d) relevance OUT OF
      SCOPE]; choose default.
- [ ] **D7 — Empty-state UX:** (a) "no matches" / (b) auto-relax / (c)
      suggest similar.
- [ ] **D8 — Filter access:** (a) fully open / (b) login-gated / (c)
      paid-only / (d) hybrid.

**Cross-cutting confirmations:**

- [ ] **F.1 — Query strategy:** (a) two-pass / (b) PostgREST JOIN /
      (c) RPC. Default (a) given (c) is OOS without operator scope
      change.
- [ ] **F.2 — Empty-receipts profiles:** (i) silently excluded /
      (ii) shown with badge unfiltered + excluded when filtered /
      (iii) always shown if profile-side filters match.
- [ ] **F.3 — V1 verified pill:** (a) keep both / (b) replace / (c)
      combined.
- [ ] **D.9 — Skills as facet:** confirmed OUT OF SCOPE? (recommend
      yes — V1 manual tags vs V2 derived capabilities).

**§G audit:** confirm run + bring back result distributions.

---

## I. Code edit + commit plan

Depends heavily on §H decisions. Sketch:

### Definite work (regardless of choices)

1. **`src/app/talent/page.tsx`** — extend the server-side data fetch
   to support receipt-aware filters per D1. Implementation per F.1:
   most likely two-pass (fetch matching `subject_id`s from
   `proof_receipts` with facet predicates, then `.in('entity_id',
   ids)` on `profiles`). Parse new search params; keep `published=true`
   invariant; keep paywall slice ordering correct.
2. **`src/app/talent/TalentClient.tsx`** — extend `FilterChip` /
   `FilterDrawer` per D2. New chip rows (desktop) and drawer sections
   (mobile) per facet. Update `pushFilters` to include new keys.
   Update empty-state CTA per D7.
3. **Atlas role chip surfacing on `ProfileCard`** (per F.5) — additive
   chips showing matched/top atlas_confirmed roles, when the profile
   has receipts. Empty-hidden when no receipts.
4. **Verification-level chip** on `ProfileCard` per D5(display) +
   F.3 — additive chip with the derived builder-level value.

### Conditional work

- **If D1 includes (a) Atlas role:** new `PROFESSIONS`-style constant
  for the 40 roles (or import from `getAtlasRoles()`); chip grid or
  drill-down per granularity sub-choice.
- **If D1 includes (b) Verification level:** values pulled from the
  observed set (L0/L1 today; future-proof for L2+).
- **If D1 includes (c) Stack:** stack-element name filter; consider
  capping the chip set to top-N most-frequent names (queried from
  §G.7).
- **If D1 includes (d) Capability:** chip set sourced from
  `capabilities_vocab` (promoted=true filter optional).
- **If D6 adds a receipt-aware sort:** server-side aggregate query
  using the `proof_receipts` table.
- **If D8 ≠ (a):** add filter-gating UI (greyed-out controls or login
  CTA) in `TalentClient.tsx`.
- **If F.1 = (c) RPC/view:** DDL — out-of-scope per §C unless operator
  widens scope.

### Estimated scope

- Files touched: 2-3 (`page.tsx`, `TalentClient.tsx`, possibly extract
  a Facet component).
- New files: 0-1.
- New DDL: 0 (per scope).
- New env vars: 0.

### Verification

- `npx tsc --noEmit` clean.
- `npm run build` clean (route-correctness gate — `/talent` is
  in-scope).
- **Manual integration test:** with the post-Batch-5 receipt set,
  apply each new filter; confirm result counts match the SQL audit
  expectations; confirm URL state round-trips on reload + back button.
- **Empty-state test:** apply a filter combination known to return
  zero; confirm D7 behavior.
- **Paywall test (anonymous viewer):** confirm filtered top-6 still
  paywalled; confirm filter controls behavior matches D8 choice.
- **Profile-fakes test:** confirm the published-gate still excludes
  the three test fakes (AGENTS.md invariant #2).
- **JSON-LD parity:** Beacon 1 `ItemList` JSON-LD on `/talent` is the
  teaser slice (page.tsx lines 107-121). Confirm the JSON-LD still
  reflects the filtered teaser slice (current behavior — verify it's
  not accidentally broken).
- **`verify-agent-card.ts`:** `/talent` is not a declared skill URL,
  so no AgentCard verify impact. Confirm.

---

## J. Execution sequence (gated on §H approval)

Single commit expected (UX-only, no DDL).

1. **Step 1 — Run §G SQL audit.** Operator pastes into Supabase
   Dashboard SQL Editor; brings results back into §H decision.
2. **Step 2 — §H decisions locked.**
3. **Step 3 — Code commit:** extend `/talent` server fetch + client
   UI per locked decisions. Single commit.
4. **Step 4 — Verify locally:** `npx tsc --noEmit` + `npm run build` +
   the §I verification checks.
5. **Step 5 — Push + production verification:** poll for prod live;
   manually exercise each new filter on prod `/talent`; confirm
   results against §G audit.

Each step gated separately at execution time.

---

## K. Verification — what 'green' looks like

- Each of the chosen D1 facets has a working filter control on
  desktop AND mobile.
- Filter state survives reload (URL) and Back button.
- Combination filters narrow results monotonically (more filters →
  fewer results, never more).
- Empty-state per D7 fires when expected.
- Paywall mechanics per D8 hold (anonymous viewers see the chosen
  filter-or-content gating).
- `published=true` invariant holds (the three fakes never appear, no
  matter the filter).
- AgentCard verify script still passes (`scripts/v2/verify-agent-
  card.ts`) — confirms no incidental break of other public surfaces.
- `npx tsc --noEmit` clean, `npm run build` clean, Vercel deploy
  green.

---

## L. Reversal

- **Code only.** `git revert <SHA>` returns `/talent` to the
  pre-Batch-6 filter shape (profession + availability + verified +
  sort). No DDL to reverse. No backfill to undo. No external state
  affected.

---

## M. Risks / honest notes

1. **First UX/frontend batch since Batch 4.** No external API surface;
   no DDL. Risk is correctness of filter logic (do "A1" filters
   actually find A1 builders?) and UX clarity (do hirers understand
   what they're filtering on?). Both verified manually since no test
   harness exists.

2. **Receipt data variety is the live risk.** If §G shows ~all
   receipts at L1 with ~3 distinct Atlas clusters, four of the eight
   filter axes are decorative. Operator should defer or scope
   accordingly. The audit's recommendation (D5 in
   `SESSION_2026-05-19_DECISIONS.md` and Batch 5 §C) frames this as
   "biggest cheap UX win on data that already exists" — but "data
   that already exists" needs the §G confirmation.

3. **Verification level today is binary.** L2/L3/L4 don't ship yet.
   Building a 4-tier verification filter UI now means three tiers
   return 0 results until later batches. Either (i) ship a 2-tier
   filter and add tiers when L2+ lands, or (ii) ship 4-tier now and
   accept the dead tiers.

4. **Query performance is fine today, will be a Batch 7+ concern.**
   Volume estimate: ~50 published profiles × ~3 receipts each = ~150
   receipts. Two-pass query is microseconds at this scale. Past
   ~10K receipts, JOIN strategy and stack-jsonb indexing become real
   considerations.

5. **Empty-receipts profiles are silently filtered.** If most published
   profiles have no `entity_id` (pre-Batch-5 cohort that didn't get
   backfilled), receipt-aware filters look bare. F.2 surfaces this;
   the §G.5/G.6 audit confirms the size of the issue.

6. **D8 (paywall on filter UI) is a positioning call, not a build
   call.** The doc surfaces options; the right answer depends on
   intent ("hirers must pay to even discover" vs. "hirers can
   discover; pay to act"). Worth a separate conversation if no clear
   default.

7. **The audit's "atlas role filter" framing assumes one column;
   reality is three** (`atlas_claimed`, `atlas_inferred`,
   `atlas_confirmed`). D1(a) should specify which. Default
   recommendation: `atlas_confirmed` since that's what other surfaces
   use (`/atlas/roles/[id]`, `/llms.txt`, `/u/[username]` filter
   query). But for builders early in their receipt life (everything
   inferred, nothing confirmed yet — the actual current state),
   filtering only on `atlas_confirmed` may show 0 results. Consider
   filtering on `atlas_confirmed OR atlas_inferred` with confidence
   indicator on cards.

8. **The briefing cited `repo_languages` / `repo_dependencies` /
   `stack_signals` as columns; they don't exist.** Stack lives in
   `proof_receipts.stack` jsonb. The filter implementation is jsonb-
   query-based, not column-based. Mentioned in §D.2 — repeated here
   because it's the highest-confidence "the briefing was off" finding.

9. **Skills facet is intentionally OUT OF SCOPE** (D.9) but the
   `ProfileCard` still displays skill chips. Visual contradiction
   risk: hirer sees skill chip, can't filter by it. Either accept the
   asymmetry (skills are visible context, not filter facets) or
   surface "filter by capability" as the V2 analogue more prominently.

---

End of doc. HALT here. Awaiting operator decisions on §H.
