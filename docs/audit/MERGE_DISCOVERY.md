# Tier 1 — V1/V2 Merge — DISCOVERY (Phase 1)

**Author:** Claude (Opus 4.7, 1M context) — read-only discovery
**Date:** 2026-05-16
**Spec:** `docs/v2/TIER_1_MERGE_SPEC.md` §3
**Status:** Phase 1 complete. STOP. Awaiting Thomas's explicit approval of Section H before any Phase 2 mutation.
**Governing constraint reminder (Spec §0):** the merge can ADD; it CANNOT subtract, move, or break. Existing URLs unchanged; existing data preserved; no friction imposed.
**Method:** read-only. Temp DB script (`/tmp/merge_discovery.mjs`) used and deleted. No repo files modified except this report.

---

## ⚠️ Escalations surfaced during discovery (read first)

Per Spec §5, two findings require Thomas's call before Phase 2 can proceed.

### Escalation 1 — the "14" cohort is ambiguous

Spec §3.2 asserts: *"From `docs/audit/KILLERS_2026-05-16.md`: 14 verified-with-substantive-project profiles. The 6 confirmed killers are a subset: Aniket Aslaliya, Sunny Zheng, Emeka Eluwa, Khairul Anwar, Joe Dias, Sumit Dongardive."*

This is internally inconsistent against the killers report. The literal "14 verified-with-substantive-project" set is:

  Aniket · Emeka · Khairul · Joe · Sumit · Yuki · Olalekan · Ifiok · Jan Winum · **John Chambers** · Anant · Andreas · Nneka · Thomas Oxlee

Two problems:
- **John Chambers IS in the literal-14** (he has one substantive project per the outcome+prompt_approach filter) but is also one of the **2 confirmed fakes** (Spec §3.1, killers doc).
- **Sunny Zheng is NOT in the literal-14** (he has 0 narrated projects on profile — the killers doc placed him in the shortlist on his 714/90d GitHub commit graph alone) but the Spec asserts he is in the cohort and §4.7 names him as one of the named acceptance tests.

So the literal substantive-14 is wrong on both ends: includes a fake, excludes a killer. Three principled interpretations of "the cohort to backfill":

- **Interpretation X (cohort = 20):** all 22 verified-and-published profiles MINUS the 2 confirmed fakes (Jenny + John). The "substantive project" filter is a guide for ranking, not a hard cut. Backfill all real verified builders. Sunny is included; the 6 thin-on-substance verified profiles (Ryan Grant, Celestino, vinod, Maya, Avik, Emanuel) get entities at their existing URLs too.
- **Interpretation Y (cohort = 14):** keep the literal substantive-14 as written, swap John Chambers OUT (he's a fake) and Sunny Zheng IN (per Spec §4.7 acceptance test). Net 14. Other verified-but-thin profiles are excluded from backfill until they ship substantive work.
- **Interpretation Z (cohort = 6):** backfill only the 6 named killers. Most conservative; matches the killers-report subset that is unambiguously "real builders with real substance" today. Other 14 verified-real profiles backfill lazily via `findOrCreateHumanEntity` the next time each one acts.

**Default recommendation IF Thomas doesn't pick: Interpretation X (cohort = 20).** Reasoning per Spec §0: "the merge can add" — backfilling more entities is additive and zero-friction. Excluding a real verified user from the proactive backfill imposes a future-friction (their first publish becomes the moment their entity gets created) when we could have removed it now. Interpretation Z under-delivers; Interpretation Y arbitrarily excludes 6 real-verified profiles.

**This is a Thomas decision per §5. Default-X applies unless overridden.**

### Escalation 2 — `thomasoxlee198` has `user_id = NULL`

The founder's own profile row (`profiles.id=15ed3a1b-1abf-480c-b10c-9aecee4b60cb`, username `thomasoxlee198`) has `user_id = NULL`. Per Spec §3.2: *"if any of the 14 has a null/orphan user_id, flag it; it needs special handling."* Spec §5 explicitly lists this as an escalation trigger.

Three options:
- **(a) Exclude `thomasoxlee198` from backfill.** Cohort drops by 1. When Thomas next logs in (with a real `auth.users.id`), `findOrCreateHumanEntity` would create an entity for the auth user — but the link to `profiles.username='thomasoxlee198'` won't form because there's no `user_id` to key on. A new entity with a derived slug gets created — exactly the duplicate-identity bug the merge is trying to close.
- **(b) Find Thomas's real `auth.users.id` and patch `profiles.user_id` before backfill.** Look up the auth user with email `ox@agentagous.com` (or whichever email is Thomas's), set `profiles.user_id = <that uuid>`, then backfill normally. Reversible (`UPDATE profiles SET user_id=NULL WHERE id=...`).
- **(c) Defer Thomas's own profile to Phase 2 post-fix and ship Tier 1 without it.** Founder's profile is non-blocking; rest of the cohort is unaffected.

**Default recommendation: (b) IF Thomas confirms which auth.users.id is his**, otherwise (c). The `thomasoxlee198` profile is the founder's own; this is the cleanest place to ask "which auth account is yours" without ambiguity.

Both escalations are blocking for Phase 2 in the sense that the exact cohort + the `thomasoxlee198` handling must be decided before §3.6 backfill can run. Everything else in this report — fakes, link mechanism, receipts surface, Phase 2 plan — is unaffected and lays out cleanly regardless of which interpretation Thomas picks.

---

## SECTION A — The 2 fakes + neutralization plan

### A.1 The fake rows (current state, live DB)

| Field | Jenny Peterson | John Chambers |
|---|---|---|
| `profiles.id` | `40fd9457-9eec-410f-bb14-28696031e21b` | `0b3903c3-50d0-470f-a949-048e6d913c1b` |
| `profiles.user_id` | `643ed642-fb93-434f-a235-770e880b04ea` (valid auth.users row exists) | `e772e27e-6d73-40b9-a14f-1b87893335fe` (valid auth.users row exists) |
| `profiles.username` | `jennypeterson224` | `johnchambers73` |
| `profiles.full_name` | Jenny Peterson | John Chambers |
| `profiles.email` | `oxleethomas+jennypeterson@gmail.com` | `oxleethomas+builder3@gmail.com` |
| `profiles.verified` | **true** | **true** |
| `profiles.published` | **true** | **true** |
| `profiles.velocity_score` | 64 | 44 |
| `profiles.github_username` | **`Agent-Ox`** (Thomas's own org) | **`Agent-Ox`** (same org) |
| `profiles.created_at` | 2026-04-05 11:41 | 2026-04-02 18:32 |

Both have `oxleethomas+...@gmail.com` plus-addressed emails and point at the platform's own `Agent-Ox` GitHub org. Both `auth.users` rows exist (no orphans).

### A.2 Surfaces that currently display or count them

From a grep audit of every `profiles` read in `src/`:

| Surface | File:line | Filter on `published`? | Filter on `verified`? | Effect after `published=false` + `verified=false` |
|---|---|:--:|:--:|---|
| `/u/[username]` (direct hit) | `src/app/u/[username]/page.tsx:15,39` | YES (returns 404 if false) | NO | ✅ becomes 404 — clean reversible hide |
| `/sitemap.xml` (profile pages enumeration) | `src/app/sitemap.ts:30` | YES | NO | ✅ drops out of sitemap on next regen |
| `/leaderboard` (top 10 by velocity, verified badge styling) | `src/app/leaderboard/page.tsx:40-44` | YES + `velocity_score > 0` | NO | ✅ excluded (published=false) — and verified=false drops the verified badge styling on `:123-141` |
| `/talent` (directory listing + verified count) | `src/app/talent/page.tsx:48-66`, count at `:69` | YES | sort/filter only | ✅ excluded (published=false). Verified count drops by 2 because count is computed `profiles.filter(p=>p.verified)` AFTER the published filter. Setting verified=false is belt-and-braces |
| `/employers` (homepage featured builders block) | `src/app/employers/page.tsx:34,47` | YES | NO | ✅ excluded |
| `/` homepage (featured builders) | `src/app/page.tsx:42,55` (`.eq('published',true).eq('featured',true)`) | YES | NO | ✅ already gated on `featured` flag too — and neither fake is featured |
| `/api/builders/geo` (map widget) | `src/app/api/builders/geo/route.ts:124` | YES | NO | ✅ excluded |
| `/og` OG card generation | `src/app/og/route.tsx:256` | YES | NO | ✅ excluded |
| **`/admin` dashboard verified count** | `src/app/admin/page.tsx:30 + 52` (`profiles?.filter(p => p.verified).length`) | **NO** — reads ALL profiles | YES via filter | ⚠️ **published=false alone won't fix this surface.** Setting `verified=false` is REQUIRED to drop the admin verified count by 2. (Admin reads everything by design, so this is the only place the dual flip matters.) |
| `/feed` Build Feed (profile joins on posts) | `src/app/feed/page.tsx:30`, `/api/feed/route.ts:59,157` | not directly — joins on `posts.profile_id`; profile data is returned for display | NO | Posts authored by the fakes (3 by Jenny, 1 by John) would still appear in the feed *if* the post was created — need to verify. They'd display author info but not as "verified builders" since verified=false |

### A.3 Build Feed posts authored by the 2 fakes — flag

- **Jenny Peterson (3 posts)** authored Build Feed entries.
- **John Chambers (1 post)** authored a Build Feed entry.

The Build Feed display does NOT filter on author `published` or `verified`. Setting `published=false` + `verified=false` on the *profile* removes the verified badge from the Build Feed cards (the cards display `profile?.verified` per `src/app/feed/FeedClient.tsx:100`) but the **posts themselves remain in the Build Feed.** This is per Spec §0 "preserve, don't subtract" — Build Feed posts are durable historical signal. **Recommend leaving posts intact.** Flag for Thomas only if he wants to also hide those posts (which would require additional code change to `/feed` and `/api/feed`).

### A.4 Hide-mechanism columns: independent?

Yes. `verified` and `published` are independent booleans on `profiles`. Either can be toggled without the other. `/admin/VerifyToggle.tsx` flips `verified` only. `/dashboard` and `/join` write `published=true`. `auto-verify` (`src/lib/autoVerify.ts:59`) flips BOTH when criteria are met. No cascade between the two.

### A.5 Recommended neutralization (data-only mutation, Phase 2 §4.1)

```sql
UPDATE public.profiles
SET verified = false, published = false
WHERE id IN (
  '40fd9457-9eec-410f-bb14-28696031e21b',  -- jennypeterson224
  '0b3903c3-50d0-470f-a949-048e6d913c1b'   -- johnchambers73
);
-- Expected: 2 rows updated.
```

**Reversal SQL (for the commit message, per Tier 0 precedent):**
```sql
UPDATE public.profiles
SET verified = true, published = true
WHERE id IN (
  '40fd9457-9eec-410f-bb14-28696031e21b',
  '0b3903c3-50d0-470f-a949-048e6d913c1b'
);
```

Both `auth.users` rows are kept. Both `profiles` rows are kept. All historical posts/applications by these users are kept. They're flagged off public surfaces; recovery is one UPDATE away.

---

## SECTION B — The cohort to backfill + user_id validity

### B.1 All 22 verified+published profiles (the universe)

Ranked by `velocity_score` desc (from the killers report; re-verified at query time). Columns: **V** = velocity · **Sub** = substantive projects count · **GH** = has connected GitHub · **uid** = `auth.users` link valid · **Cohort** = inclusion under each interpretation (X / Y / Z, see escalation 1).

| # | Username | Name | V | Sub | GH | uid | X | Y | Z | Notes |
|--:|---|---|--:|--:|:--:|:--:|:--:|:--:|:--:|---|
| 1 | `ryangrant144` | Ryan Grant | 100 | 0 | ✓ | ✓ | ✓ | ✗ | ✗ | high velocity, 0 narrated projects (borderline per killers doc) |
| 2 | `aniketaslaliya801` | Aniket Aslaliya | 100 | 4 | ✓ | ✓ | ✓ | ✓ | ✓ | killer |
| 3 | `sunnyzheng606` | Sunny Zheng | 100 | 0 | ✓ | ✓ | ✓ | ✓* | ✓ | killer despite 0 substantive (GitHub-only signal) — `*` under Y if swapped in for Chambers |
| 4 | `eluwaemekamichael740` | Emeka Eluwa | 80 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | killer |
| 5 | `khairulanwar932` | Khairul Anwar | 80 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | killer |
| 6 | `joedias995` | Joe Dias | 80 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | killer |
| 7 | `sumitdongardive9` | Sumit Dongardive | 80 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | killer |
| 8 | `yuki448` | Yuki | 68 | 3 | ✓ | ✓ | ✓ | ✓ | ✗ | |
| 9 | `celestinokariuki456` | Celestino Kariuki | 67 | 0 | ✓ | ✓ | ✓ | ✗ | ✗ | |
| 10 | `vinodkrishnabanda657` | vinod krishna banda | 66 | 0 | ✓ | ✓ | ✓ | ✗ | ✗ | |
| 11 | `olalekanridwanullah197` | Olalekan Ridwanullah | 65 | 2 | ✓ | ✓ | ✓ | ✓ | ✗ | high-engagement low-substance |
| 12 | `jennypeterson224` | **Jenny Peterson** | 64 | 0 | (fake) | ✓ | ✗ | ✗ | ✗ | **FAKE — neutralize, not backfill** |
| 13 | `ifioksundayuboh72` | Ifiok Sunday Uboh | 61 | 1 | ✓ | ✓ | ✓ | ✓ | ✗ | |
| 14 | `oxleethomasagentox598` | Maya Okonkwo | 59 | 0 | ✗ | ✓ | ✓ | ✗ | ✗ | |
| 15 | `janwinum9` | Jan Winum | 51 | 1 | ✗ | ✓ | ✓ | ✓ | ✗ | |
| 16 | `johnchambers73` | **John Chambers** | 44 | 1 | (fake) | ✓ | ✗ | ✗ | ✗ | **FAKE — neutralize, not backfill** |
| 17 | `avikbhanja723` | Avik Bhanja | 43 | 0 | ✗ | ✓ | ✓ | ✗ | ✗ | |
| 18 | `anantdhavale962` | Anant Dhavale | 40 | 1 | ✗ | ✓ | ✓ | ✓ | ✗ | |
| 19 | `andreaschristodoulou643` | Andreas Christodoulou | 0 | 3 | ✗ | ✓ | ✓ | ✓ | ✗ | marketer pattern (per killers doc) |
| 20 | `emanuelcovelli123` | Emanuel Covelli | 0 | 0 | ✗ | ✓ | ✓ | ✗ | ✗ | |
| 21 | `nnekaewalu847` | Nneka Ewalu | 0 | 1 | ✗ | ✓ | ✓ | ✓ | ✗ | |
| 22 | `thomasoxlee198` | **Thomas Oxlee** | 0 | 1 | ✗ | **NULL** | ⚠ | ⚠ | ✗ | **user_id IS NULL — escalation 2** |

**Cohort totals after exclusions and escalation 2:**
- Interpretation X (default): **20** verified-and-published minus 2 fakes minus 0-or-1 (Thomas-handling-dependent) = **19 or 20**
- Interpretation Y: 14 substantive minus John Chambers plus Sunny Zheng minus 0-or-1 (Thomas) = **13 or 14**
- Interpretation Z: 6 killers (Thomas excluded by default — he isn't a killer) = **6**

### B.2 `auth.users` validity check

- **All 22 `profiles.user_id` values are present and valid in `auth.users`** — EXCEPT `thomasoxlee198` which has `user_id=NULL` (escalation 2 above).
- The 2 fakes both have valid `auth.users` rows. Neutralizing them doesn't touch auth; only `profiles.verified` + `profiles.published` flip.

### B.3 Existing entities for any of these users? (audit said 0 total; re-verified)

`SELECT * FROM entities WHERE owner_user_id IN (<all 22 user_ids>)` → **0 rows.** No entity has ever been created against any of these users. The audit's claim that the duplicate-identity bug has never actually fired in production holds — entities table is still empty, ingestion_log has 8 test-fixture rows from May 15 verification (all with `receipt_id=null`), no real `/paste` publishes by real users have happened.

---

## SECTION C — The exact code paths

Verbatim current code for the three load-bearing files. (File path, line range, code.)

### C.1 `src/lib/entities.ts:60-118` — `findOrCreateHumanEntity` (current logic)

```ts
export async function findOrCreateHumanEntity(
  admin: SupabaseClient,
  user: User,
): Promise<FindOrCreateResult> {
  const { data: existing, error: findErr } = await admin
    .from('entities')
    .select('id, external_id, kind, display_name, slug, owner_user_id')
    .eq('owner_user_id', user.id)
    .eq('kind', 'human')
    .limit(1)
    .maybeSingle();

  if (findErr && findErr.code !== 'PGRST116') {
    throw new Error(`entity lookup failed: ${findErr.message}`);
  }
  if (existing) {
    return { entity: existing as EntityRow, was_created: false };
  }

  const displayName = deriveDisplayName(user);
  const slugBase = deriveSlugBase(user, displayName);
  const slug = await generateUniqueSlug(admin, 'entities', slugBase);

  const row = {
    external_id: entityExternalId(),
    kind: 'human' as const,
    display_name: displayName,
    slug,
    owner_user_id: user.id,
  };

  const { data: inserted, error: insertErr } = await admin
    .from('entities')
    .insert(row)
    .select('id, external_id, kind, display_name, slug, owner_user_id')
    .single();
  // … race-handling …
}
```

`deriveDisplayName(user)` reads `user.user_metadata.full_name` → `name` → email-prefix → `'Builder'`.
`deriveSlugBase(user, displayName)` normalises the display name; falls back to email prefix.
**Crucially: never reads `profiles`.** This is the audit Part 3 bug source.

### C.2 `src/lib/paste/publish.ts:165-187` — where the entity is wired in

```ts
export async function publishProofReceipt(input: PublishInput): Promise<PublishResult> {
  // ... atlas role filtering ...

  // 1. Subject entity (find or create). Track creation so we can roll back.
  let entityResult: { entity: EntityRow; was_created: boolean }
  try {
    entityResult = await findOrCreateHumanEntity(admin, user)
  } catch (e) {
    return { success: false, error: 'server_error', ... }
  }
  const { entity, was_created: entityWasCreated } = entityResult
  // ... receipt insert with subject_id = entity.id ...
}
```

The receipt row's `subject_id` is `entities.id` (numeric `bigserial`). The returned `entity_canonical_url` is `/u/<entity.slug>` (publish.ts:148).

### C.3 `src/app/u/[username]/page.tsx` — current data fetch + section structure

Fetches (lines 11–67):

```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('username', username)
  .eq('published', true)
  .single()
if (!profile) notFound()

const { data: projects } = await supabase.from('projects')
  .select('*').eq('profile_id', profile.id).order('display_order')

const { data: skills } = await supabase.from('skills')
  .select('*').eq('profile_id', profile.id)

const { data: githubData } = await supabase.from('github_data')
  .select('*').eq('profile_id', profile.id).maybeSingle()

const { data: feedPosts } = await supabase.from('posts')
  .select('id, title, problem_solved, outcome, tools_used, time_taken, url, reactions, created_at')
  .eq('profile_id', profile.id)
  .order('created_at', { ascending: false })
  .limit(5)
```

**Section ordering on the rendered page** (each is a `<div className="fade-up ...">` block, with `animationDelay` defining cascade):

| Order | Section | Anchor (file:line) | `animationDelay` | Hidden when empty? |
|--:|---|---|---|---|
| 1 | Hero (avatar, name, role, bio, verified badge) | `154–185` | base | always shown |
| 2 | Pro info card (profession/seniority/work_type/day_rate/timezone/velocity/languages) | `189–237` | 0.08s | shown if any field present |
| 3 | Social / links row | `239–266` | 0.1s | always |
| 4 | About | `268–273` | 0.15s | shown if `about` |
| 5 | AI use cases (Claude skills) | `275–282` | 0.2s | shown if any |
| 6 | GitHub stats card | `285–347` | 0.22s | shown if `githubData` |
| 7 | **Projects** | `349–377` | **0.25s** | shown if `projects.length > 0` |
| 8 | Skills and tools | `379–399` | 0.3s | always (one of the byCategory groups will render) |
| 9 | Build Feed (recent posts) | `402–428` | 0.33s | shown if `feedPosts.length > 0` |
| 10 | Share buttons card | `432–434` | 0.35s | always |
| 11 | Ready-to-hire CTA | `440+` | end | always |

### C.4 `profiles` table — full column list (live, 33 columns)

`id, created_at, username, full_name, email, location, role, bio, about, avatar_url, availability, verified, published, github_url, x_url, linkedin_url, website_url, profile_views, user_id, primary_profession, seniority, work_type, day_rate, timezone, languages, github_connected, github_username, velocity_score, accepts_project_inquiries, hire_count, last_seen_at, featured, featured_order`

**No spare column suitable as an `entity_id` link.** Adding one requires a migration.

### C.5 `entities` table — full column list (from `supabase/migrations/20260515150752_proof_receipts_v0_1.sql:10-19`)

`id (bigserial), external_id (text unique), kind (text check), display_name (text), slug (text unique), owner_user_id (uuid → auth.users), created_at, updated_at`

**No spare column for a `profile_id` link.** Adding one requires a migration.

### C.6 Is `profiles.username` editable from any UI?

**No.** Grep of `src/app/dashboard/edit/EditProfileForm.tsx` shows no `username` field — confirmed (no matches when grepping for `username` in that file). Username is generated ONCE at signup (`src/app/join/page.tsx:87` constructs `generatedUsername = base + suffix` from email prefix + random numeric suffix; inserted at `:92`; never updated thereafter). The Builder API PATCH at `/api/v1/profile/route.ts` does not whitelist `username` either (verified — only updates a defined set of fields, username not among them). **Therefore: `profiles.username` is effectively immutable post-signup.** This matters for the link-mechanism evaluation (Section D).

---

## SECTION D — Recommended link mechanism

Three options re-evaluated against Spec §0 (cannot subtract / move / break) and "best foundation moving forward."

### Option A — explicit FK columns both ways, with migration

Add `profiles.entity_id bigint references entities(id)` and `entities.profile_id uuid references profiles(id)`. One-to-one, nullable. Resolver writes both directions on entity creation.

- **Spec §0 compliance:** ✓ no URL change. Existing `profiles.username` and existing `entities.slug` (which doesn't exist yet — table is empty) are untouched.
- **Migration cost:** one new migration with ALTER TABLE adding two nullable columns + two FK constraints + two indexes. ~10 SQL lines. Pushed via `supabase db push` against prod. No row rewrites.
- **JOIN ergonomics:** `profiles ⨝ entities ON profiles.entity_id = entities.id` is clean. `/u/[username]` can fetch profile, then fetch receipts WHERE `subject_id = profile.entity_id`. Single round-trip if denormalized; two round-trips if separate queries.
- **Durability:** maximum. Username changes (currently impossible, but if ever enabled) wouldn't break the link.
- **Backfill cost:** the backfill writes both `profiles.entity_id` and `entities.profile_id` per row.

### Option B — no schema change, implicit link via `user_id` + slug-equals-username invariant

`findOrCreateHumanEntity` looks up `profiles WHERE user_id = $1` first. When found, reuse `profiles.username` as the entity slug AND `profiles.full_name` as display_name. Link is implicit: same `auth.users.id` keys both rows; `entities.slug == profiles.username` is enforced at write time.

- **Spec §0 compliance:** ✓ no URL change AS LONG AS `entities.slug = profiles.username` verbatim (no normalisation, no transformation).
- **Migration cost:** zero.
- **JOIN ergonomics:** `entities ⨝ profiles ON entities.owner_user_id = profiles.user_id` works but reads less obviously. `/u/[username]` receipts query becomes `proof_receipts WHERE subject_id IN (SELECT id FROM entities WHERE slug = $username)` — three-level indirection vs Option A's one.
- **Durability:** medium. The invariant holds only as long as username never changes (currently true per C.6). If username becomes editable in future, link breaks silently.
- **Backfill cost:** no extra writes beyond entity creation.

### Option C — Hybrid: explicit FK migration + implicit slug-equals-username + reciprocal write

Combination of A and B: do the migration (Option A) AND have the resolver also reuse `profiles.username` as slug (Option B's write rule). Link is queryable via FK AND verifiable via slug invariant.

- **Spec §0 compliance:** ✓
- **Migration cost:** same as A.
- **JOIN ergonomics:** best of both — explicit FK for cheap joins, plus the slug invariant for sanity checks and human-readable URLs.
- **Durability:** maximum + defence-in-depth. If username becomes editable in future, the FK still holds (the link survives even if the slug invariant breaks).

### Recommendation: **Option C**

Reasoning tied to Spec §0 and "best foundation":
- **Spec §0:** none of A/B/C risk a URL change because all three preserve `entities.slug = profiles.username` at write time. The cost asymmetry is durability + ergonomics, not correctness.
- **Best foundation:** Option C is the only one that survives a future username-editing feature (which Tier 3 or a later product change might introduce — the killer report explicitly notes the auto-generated `username` format is awkward, e.g. `aniketaslaliya801`). Option B locks ShipStacked into immutable usernames forever. Option A doesn't, but loses the human-readable URL invariant. Option C gets both.
- **Migration cost is small** — two nullable FK columns + two indexes is ~10 lines of SQL, zero data rewrite, no downtime. Same risk profile as the V2 Step 1 migration that already shipped on 2026-05-15.
- **Disqualification check:** none of A/B/C would change an existing URL.

**Proposed migration (Phase 2 §4.2):** `supabase/migrations/<ts>_merge_profiles_entities_link.sql`:
```sql
-- Bidirectional link between V1 profiles and V2 entities (Tier 1 merge).
-- Nullable both sides — backfill populates for the verified cohort;
-- unverified / new accounts get linked lazily by findOrCreateHumanEntity.
alter table entities  add column profile_id uuid references profiles(id);
alter table profiles  add column entity_id  bigint references entities(id);
create unique index idx_entities_profile_id  on entities(profile_id)  where profile_id is not null;
create unique index idx_profiles_entity_id   on profiles(entity_id)   where entity_id  is not null;
```

The partial unique indexes enforce one-to-one (each profile can link to at most one entity; each entity can link to at most one profile), while allowing many rows where both columns are null (the lazy-link case).

---

## SECTION E — Reciprocal: receipts on `/u/[username]`

### E.1 The receipt → entity → profile join path

- `proof_receipts.subject_id` → `entities.id` (FK already exists per migration `20260515150752_…sql:68`).
- `entities.profile_id` → `profiles.id` (proposed FK, Option C).
- Reverse: from `profiles.username` → `profiles.id` → `profiles.entity_id` → `entities.id` → `proof_receipts.subject_id`.

### E.2 The query to add to `/u/[username]/page.tsx`

After the existing `profile` fetch (line 35-42), and parallel to the existing `projects` / `skills` / `githubData` / `feedPosts` fetches, add:

```ts
// V2 proof receipts (only present after Tier 1 merge backfill or post-paste-publish)
const { data: receipts } = profile.entity_id ? await supabase
  .from('proof_receipts')
  .select('id, slug, title, description, event_type, occurred_at, occurred_at_precision, atlas_confirmed, verification_level, issued_at')
  .eq('subject_id', profile.entity_id)
  .eq('visibility', 'public')
  .order('issued_at', { ascending: false })
  .limit(10)
  : { data: null }
```

Guarded on `profile.entity_id` so profiles without a linked entity (unverified, pre-backfill, or the lazy-resolution-not-yet-fired case) issue zero extra DB calls. Public-only filter respects the visibility check (`proof_receipts.visibility = 'public'` per migration `…sql:96`).

### E.3 Placement on the rendered page

**Recommended: insert a new section between Projects (current order 7, animationDelay 0.25s) and Skills (current order 8, animationDelay 0.3s).** New `animationDelay: 0.28s` slots cleanly in the fade-up cascade. Conceptual adjacency: Projects are "things I've built (narrative)"; Proof Receipts are "things I've shipped (verified atoms)" — they belong side-by-side.

```tsx
{/* Proof receipts (V2, additive — hidden when empty) */}
{receipts && receipts.length > 0 && (
  <div className="fade-up" style={{ marginBottom: '1.5rem', animationDelay: '0.28s' }}>
    <p className="section-label">Proof receipts <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({receipts.length})</span></p>
    {receipts.map(r => (
      <div key={r.id} className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '0.75rem' }}>
        <a href={`/p/${r.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>{r.title}</p>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '0.4rem' }}>{r.description.slice(0, 140)}{r.description.length > 140 ? '…' : ''}</p>
          {r.atlas_confirmed?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {r.atlas_confirmed.map((role: string) => (
                <a key={role} href={`/atlas/roles/${role}`} className="tag-claude">{role}</a>
              ))}
            </div>
          )}
        </a>
      </div>
    ))}
  </div>
)}
```

### E.4 Hidden-when-empty rule

**YES — render nothing when `receipts.length === 0`.** This is the Spec §0 "additive only" rule made concrete. An existing user (Aniket, Sunny, anyone in the backfill cohort) with zero receipts today sees their profile byte-for-byte identical to before the merge. No empty box, no "no receipts yet" placeholder, no friction. The section appears only when there is something to show.

### E.5 Risk audit against Spec §0

- ✅ No section removed.
- ✅ No section reordered (existing animationDelays 0.0 → 0.35 preserved; new 0.28 inserted between 0.25 and 0.30).
- ✅ No URL changed.
- ✅ No new empty state imposed on users with zero receipts.
- ✅ When a user publishes a receipt, it appears on their existing profile at their existing URL — closing the audit Part 3 duplicate-identity bug.

---

## SECTION F — Proactive backfill script shape (dry-run output sample)

### F.1 Script location and shape

**Location:** `scripts/v2/backfill-entities.ts` (sibling to the existing `scripts/v2/verify-step-6.ts` and `verify-step-7.ts` patterns; same `scripts/v2/` directory).

**Inputs:** none required at CLI — cohort is hardcoded from approved Section H. `--dry-run` flag (default behaviour: dry-run if no flag; explicit `--apply` required to write).

**Logic:**
```
1. Load .env.local, create service-role Supabase client.
2. Hardcoded cohort list (the N user_ids approved per Section H — see escalation 1).
3. For each user_id:
   a. SELECT id, username, full_name, user_id, entity_id FROM profiles WHERE user_id = $1
   b. If profile.entity_id already non-null → log "already linked, skip" (idempotency).
   c. SELECT id FROM entities WHERE owner_user_id = $1 → if exists, log "entity exists, linking"
      and patch profiles.entity_id to that entity's id. (Defence against partial-run states.)
   d. Otherwise: insert entities row with kind='human', owner_user_id=user_id,
      slug=profile.username VERBATIM, display_name=profile.full_name, profile_id=profile.id.
   e. Update profiles.entity_id = inserted.id (reciprocal link).
   f. Log the action for the dry-run report.
4. End-of-run summary: N processed, N created, N already-linked, N errors.
```

**Idempotency:** re-running the script after a successful apply must produce zero new entity rows and zero `profiles.entity_id` writes — every profile in the cohort already has `entity_id` set. Guarded by checks 3b and 3c above.

**Dry-run behaviour:** prints the exact INSERT and UPDATE statements that WOULD execute, with row values populated. No DB writes. Exit code 0.

### F.2 Dry-run output sample (assuming Interpretation X, cohort=19, with `thomasoxlee198` excluded under escalation-2 option (c))

```
backfill-entities.ts — DRY RUN (no writes)
Cohort source: docs/audit/MERGE_DISCOVERY.md §H, Interpretation X less thomasoxlee198
Cohort size: 19

[1/19] ryangrant144 (Ryan Grant)
  user_id     : <uuid for ryan>
  profile.id  : dd263826-1016-4e2c-8223-28c5349421cf
  profile.entity_id : NULL → will write
  WOULD INSERT entities: {kind:'human', owner_user_id:<uuid>, slug:'ryangrant144', display_name:'Ryan Grant', profile_id:'dd263826-...'}
  WOULD UPDATE profiles SET entity_id=<new bigserial> WHERE id='dd263826-...'

[2/19] aniketaslaliya801 (Aniket Aslaliya)
  user_id     : 8f5ec5af-4932-41f1-a60e-c4e8f2a747d4
  profile.id  : d4bc4780-dc1f-4d36-b1e6-8ae2bd905d9b
  profile.entity_id : NULL → will write
  WOULD INSERT entities: {kind:'human', owner_user_id:'8f5ec5af-...', slug:'aniketaslaliya801', display_name:'Aniket Aslaliya', profile_id:'d4bc4780-...'}
  WOULD UPDATE profiles SET entity_id=<new bigserial> WHERE id='d4bc4780-...'

[3/19] sunnyzheng606 (Sunny Zheng)
  user_id     : <uuid for sunny>
  profile.id  : 3cca9dd5-ad54-4c56-a2c7-dbdd53398e6f
  profile.entity_id : NULL → will write
  WOULD INSERT entities: {kind:'human', owner_user_id:<uuid>, slug:'sunnyzheng606', display_name:'Sunny Zheng', profile_id:'3cca9dd5-...'}
  WOULD UPDATE profiles SET entity_id=<new bigserial> WHERE id='3cca9dd5-...'

... [4–19] same shape ...

SUMMARY (dry-run):
  19 profiles processed
  19 entities WOULD be created
  19 profiles.entity_id updates WOULD apply
  0 already-linked
  0 errors
  Estimated wall-clock for --apply: ~3-5s (sequential, no batching needed at this size).
```

The slug field on every line is verbatim `profile.username`. No transformation. This is the critical invariant for Spec §0.

### F.3 The backfill explicitly excludes

- ✗ The 2 fakes (Jenny Peterson, John Chambers) — they get the Section A neutralization instead.
- ✗ All unverified profiles (45 of 67) — no proactive backfill. Lazy resolution via the patched `findOrCreateHumanEntity` covers them if/when they act.
- ✗ Effectively-empty / dead profiles (8 per audit) — same lazy path.
- ✗ `thomasoxlee198` — pending escalation 2 decision. Option (c) excludes; option (b) includes after a separate `user_id` patch.

---

## SECTION G — Additive visible improvements (each tagged Tier-1-safe or deferred)

Per Spec §3.7 "if visible updates make the product better, we add them — but existing users should feel no pain."

| Candidate | Spec §0 risk | Friction risk | Recommendation |
|---|---|---|---|
| **G.a Proof receipts section on `/u/[username]`** (Section E above; hidden when empty) | None — additive between Projects and Skills, hidden when zero receipts | None — existing users see byte-identical profile until they publish a receipt | **Ship in Tier 1.** Core of the merge. |
| **G.b "Turn your GitHub work into verified proof — paste a repo" prompt** on profile or dashboard | Risk depends on placement. On `/dashboard` (logged-in builder), low risk. On `/u/[username]` (public profile), moderate risk — visible to viewers, looks like marketing copy on someone else's profile | If dismissible + non-modal: low. If always-on banner: moderate | **Defer to Tier 3.** Reasoning: it's a marketing nudge, not a structural addition. Helpful for "Sunny-type" users with 714 commits and no narrated work — but the right time to ship it is *after* the receipts section has product-market fit signal. Phase 2 commit doesn't need this; it can be A/B-tested later without blocking the merge. |
| **G.c Atlas role(s) on profile if existing projects can be classified** | Moderate — would require running the V2 atlas classifier over existing `projects` rows. Classifier output is a probability not a fact. Displaying classification on someone's existing profile imposes a label they didn't request | High — a builder might disagree with how their project was classified. Imposing a label is exactly the friction Spec §0 says to avoid | **Defer to Tier 3.** The right surface for atlas roles is the V2 `/paste` flow where the user opts into the classification before publish, not retroactively across pre-existing profile content. |
| **G.d Nothing visible yet** (pure structural merge) | Zero | Zero | Fallback if G.a is somehow disputed. Not recommended — the merge is invisible to existing users without G.a. |

**Recommended Tier-1-safe set: G.a only.** It's the minimum that makes the merge real (a published receipt actually appears at the user's URL) while imposing zero friction on users with zero receipts. G.b and G.c defer.

---

## SECTION H — Proposed Phase 2 change list (FOR THOMAS APPROVAL)

Numbered, each individually approvable, each individually reversible. Numbering parallels Spec §4.

### H1 — Data: neutralize the 2 fakes (Spec §4.1)

```sql
UPDATE public.profiles SET verified=false, published=false
WHERE id IN (
  '40fd9457-9eec-410f-bb14-28696031e21b',  -- jennypeterson224
  '0b3903c3-50d0-470f-a949-048e6d913c1b'   -- johnchambers73
);
-- Expected: 2 rows updated.
```
Reversal: `UPDATE … SET verified=true, published=true WHERE id IN (…);`
Verification post-change: `/admin` verified count drops by 2; `/leaderboard` and `/talent` exclude them; `/u/jennypeterson224` and `/u/johnchambers73` 404.

### H2 — Migration: bidirectional FK columns (Spec §4.2)

New file `supabase/migrations/<timestamp>_merge_profiles_entities_link.sql`:
```sql
alter table entities  add column profile_id uuid references profiles(id);
alter table profiles  add column entity_id  bigint references entities(id);
create unique index idx_entities_profile_id  on entities(profile_id)  where profile_id is not null;
create unique index idx_profiles_entity_id   on profiles(entity_id)   where entity_id  is not null;
```
Apply via `supabase db push`. Reversal: `ALTER TABLE … DROP COLUMN …` (Supabase migration `down` if generated, or manual SQL).

### H3 — Code: rewrite `findOrCreateHumanEntity` (Spec §4.3)

`src/lib/entities.ts` — replace the existing function with logic that:
1. First looks up `profiles WHERE user_id = $1 AND user_id IS NOT NULL`.
2. If found AND `profile.entity_id` already set → return `entities WHERE id = profile.entity_id` (idempotent).
3. If found AND `profile.entity_id` null → check `entities WHERE owner_user_id = $1`; if present, link `profiles.entity_id = entity.id` and return. If absent, INSERT entity with `slug = profile.username` verbatim, `display_name = profile.full_name`, `profile_id = profile.id`, then UPDATE `profiles.entity_id`. Return.
4. If profile NOT found (genuinely new user with no V1 profile) → existing fallback behaviour (derive slug from `user_metadata.full_name`/email).

### H4 — Code: receipts section on `/u/[username]` (Spec §4.4)

Add the query at C.3 and the JSX block at E.3. Insert between existing Projects (animationDelay 0.25s) and Skills (animationDelay 0.3s). Hidden when `receipts.length === 0`. No other changes to `/u/[username]/page.tsx`.

### H5 — Backfill: run `scripts/v2/backfill-entities.ts --apply` for the approved cohort (Spec §4.5)

Cohort size depends on Thomas's escalation-1 + escalation-2 decisions:

| Decision combo | Cohort size |
|---|--:|
| Interpretation X + Thomas-option (c) [default] | **19** |
| Interpretation X + Thomas-option (b) | **20** |
| Interpretation Y + Thomas-option (c) | **13** |
| Interpretation Y + Thomas-option (b) | **14** |
| Interpretation Z + Thomas-option (c) [most conservative] | **6** |
| Interpretation Z + Thomas-option (b) | **6** (Thomas not in killer subset; option (b) doesn't affect Z) |

Workflow: dry-run first (output captured in Phase 2 report), then `--apply`. Idempotent re-run produces zero new rows.

Reversal SQL (in commit message per Tier 0 precedent):
```sql
-- Drop the new entity rows + clear the link
UPDATE public.profiles SET entity_id = NULL WHERE entity_id IS NOT NULL;
DELETE FROM public.entities WHERE kind='human' AND profile_id IS NOT NULL;
```

### H6 — Additive UI: only G.a (Spec §4.6)

Ship the receipts section (H4 above). Defer G.b (paste-prompt nudge) and G.c (atlas-on-existing-projects) to Tier 3.

### H7 — Verification (Spec §4.7)

Before commit, against local dev + service-role DB:
- `/u/aniketaslaliya801` renders identical to today (4 projects, github stats, velocity 100, no new empty boxes since receipts=0).
- Aniket's entity row exists; `entities.slug='aniketaslaliya801'` EXACTLY; `entities.profile_id` and `profiles.entity_id` both populated.
- `/u/sunnyzheng606` renders identical; entity created with slug verbatim.
- The 4 other killers (Emeka, Khairul, Joe, Sumit) same check.
- `/u/jennypeterson224` and `/u/johnchambers73` return 404.
- `/admin` verified count: 22 → 20 (drop of 2 = the fakes).
- `/leaderboard` and `/talent`: no Jenny, no John.
- Simulated trace (no execution): a backfilled user's `/api/paste/publish` POST resolves to their existing entity, returns `entity_canonical_url` = `https://shipstacked.com/u/<their-existing-username>`. The audit Part 3 bug is closed.
- V2 spine green: `curl /atlas/roles/A1.json` returns 200 application/ld+json; `curl /p/<any>.json` works.
- `npx tsc --noEmit` clean; `npm run build` clean.

Post-deploy production verification (same shape as Tier 0):
- `curl https://shipstacked.com/u/aniketaslaliya801` → 200 with intact profile.
- `curl https://shipstacked.com/u/jennypeterson224` → 404.
- DB readback: entities count = approved cohort; profiles.entity_id populated for cohort; verified count adjusted.

### H8 — Commit + push (Spec §4.8)

Commit message includes (per Tier 0 precedent):
- The escalation decisions Thomas made (cohort interpretation, thomasoxlee198 handling).
- Exact list of users backfilled (by username + entity slug).
- Exact reversal SQL for: the fake-flag flip, the entity inserts, the entity_id updates.
- The migration is reversible via standard `supabase db push` rollback or manual ALTER TABLE.
- Named acceptance test results (the 6 killers + 2 fakes verification).
- Documents that G.b + G.c are deferred to Tier 3, and that lazy-resolution still applies to the 45 unverified + 8 dead accounts.

### H9 — What this does NOT do (explicit non-goals)

- Does NOT change any existing URL.
- Does NOT modify any existing profile field, project, post, application, or skill row.
- Does NOT delete any data (the 2 fakes are flagged, not deleted; cohort entities are added, never replacing).
- Does NOT touch the V2 middleware, the `/paste` flow, the Atlas pages, or any Tier 0 work.
- Does NOT remove the `/api/hire-confirm/*` route family (per the Tier 0 deferral).
- Does NOT atlas-classify existing projects (Tier 3).
- Does NOT add a paste-prompt UI on existing profiles (Tier 3).
- Does NOT enable username editing (deliberately keeping the slug invariant strong).

---

## Method notes

- DB queries via `/tmp/merge_discovery.mjs` using bundled `@supabase/supabase-js` + service role from `.env.local`. Script deleted after use.
- Every `from('profiles')` call in `src/` greped and audited for `verified` / `published` filter behaviour.
- The 2-fake row data + the 14-substantive cohort were re-confirmed at query time; no reliance on the earlier killers report's frozen snapshot.
- `entities` count re-verified as 0 — no test fixture or smoke test has populated entities since Tier 0.
- Username-immutability claim verified by grepping `src/app/dashboard/edit/EditProfileForm.tsx` (no `username` field) and inspecting `/api/v1/profile/route.ts` (no `username` in whitelisted updates).

---

*End of Phase 1 discovery. STOP. Awaiting Thomas's review and explicit Section H approval (with the two escalation decisions) before Phase 2.*
