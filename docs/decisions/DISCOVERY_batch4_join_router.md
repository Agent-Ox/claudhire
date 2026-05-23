# DISCOVERY — Batch 4: `/join` 4-card router + new entity signup flows

Phase 1 discovery doc. Read-only research. No code mutation, no commits until
operator signs off Section H below.

Prepared at HEAD `d1e9eae` on 2026-05-23.

---

## A. Purpose

Batch 4 builds the **`/join` 4-card router** that the locked
Customer/Entity/Mode/Role spec requires but doesn't exist yet. This is the
**first net-additive batch** in the locked roadmap — Batches 1–3 cleared
deadweight, refactored the type contract, and aligned terminology. Batch 4
ships net-new user-visible product.

Per `SESSION_2026-05-19_DECISIONS.md` UPDATE 2026-05-22, the signup router
has four cards:

1. **Solo AI Builder** — supply identity (free)
2. **Team / Agency / Studio** — supply identity (free)
3. **Autonomous Agent** — supply identity (free)
4. **"I'm here to hire, not to sell my own work"** — buyer-only entity,
   Buyer Mode active by default

Cards 1 and 3 have substantial existing infrastructure (`/join` step flow +
`AgentOnboarding.tsx` + `/api/keys`). Cards 2 and 4 are net-new.

**Honest framing — different from Batches 1-3:**
- First user-visible product change since foundation work.
- Real product UX decisions, not refactor mechanics.
- Card copy, post-signup destinations, payment timing — these are *product
  calls* that shape what users actually experience.
- Eight load-bearing decisions surfaced in §H for operator approval. **The
  doc does not decide them.**

**Out of scope** (see §C): team member-linking, full team profile pages,
agency subcontracting, `employer_profiles` consolidation, DB column
renames from prior batches, auto-enrichment (M5), RLS rollout, any change
to existing Solo Builder `/join` flow logic beyond extending it into the
router.

---

## B. Load-bearing pre-flight finding (READ FIRST)

**`entities.kind` CHECK constraint:** `('human', 'operator', 'fleet',
'agent')` — 4 values, defined in
`supabase/migrations/20260515150752_proof_receipts_v0_1.sql:13`. Only
`'human'` is written at runtime today (per audit).

**Implications for the 4 cards:**

| Card | Required entities.kind | Constraint check |
|---|---|---|
| 1 — Solo Builder | `'human'` | ✓ allowed, already used |
| 2 — Team / Agency | **`'team'`** (proposed) or **`'fleet'`** (existing) | ✗ `'team'` not in CHECK; `'fleet'` allowed but semantically odd |
| 3 — Autonomous Agent | `'agent'` | ✓ allowed, never written yet |
| 4 — Buyer-only entity | `'human'` (if entity is a person hirer) or new value | ✓ if 'human'; otherwise needs CHECK update |

**LOCKED 2026-05-23 to (B-ii): DDL path.** Add `'team'` to the CHECK
constraint via Supabase Dashboard SQL Editor. Same protocol as Batch 1's
§G.1 — BEGIN/COMMIT with BEFORE/AFTER snapshots, reversal block in this
doc. Card 4 uses existing `'human'` (no DDL needed for Card 4). Card 3
uses existing `'agent'` (no DDL needed).

**Considered and rejected:** (B-i) DDL-free path repurposing `'fleet'`
(semantically marginal — `'fleet'` was originally for "fleet of agents";
operator chose to do it right once rather than ship with ambiguous
semantics).

The DDL block runs FIRST (Step 1 of execution); the code commit follows
(Step 2). Both gated separately at execution time.

---

## C. Scope — 4 cards + the router shell

### C.1 — The router shell (`/join` extension)

Today `/join` is a 2-step Solo Builder profile form (`src/app/join/page.tsx`,
306 lines). It auto-detects existing profile → bumps to `/dashboard`.

Batch 4 extends this:
- **New step 0:** 4-card router (the locked card-strip from the spec).
- **Cards 1, 2, 3, 4** each route to a subflow.
- Card 1 = the existing 2-step form (kept as-is, becomes step 1+2 of card 1).
- Cards 2, 3, 4 = new flows (described below).

**URL pattern (decision needed):** see §H.D5.

### C.2 — Card 1 — Solo AI Builder (existing flow, unchanged)

**Copy (locked spec):**
> "I ship AI work. I want my real builds to get me opportunities."

The existing 2-step `/join` flow IS card 1. No logic change. Reuses:
- `profiles` insert (`src/app/join/page.tsx:89-103`)
- `posts` insert for first build (lines 110-115)
- `skills` insert for tags (lines 124)
- Welcome email via `/api/welcome` (lines 130-134)

Result: `modes.builder = true` via `hasProfile` derivation in
`getEntityModes()`.

### C.3 — Card 2 — Team / Agency / Studio (NEW)

**Copy (locked spec):**
> "We deliver AI implementation for clients. We may also hire specialists."

**Required:** create entity with `kind = ?` (see §B / §H.D7) + display name +
slug. The team profile is "declarative overlay" per the locked spec — soft
proof gate, members linked LATER (Batch 5+ out-of-scope).

**Field scope — LOCKED 2026-05-23 to (a): minimal — team name + email +
1-line description.** Entity row + auth user. Member linking deferred to
Batch 5+. Minimal ships faster + validates demand before investing in the
invitations / case-studies machinery.

**Considered and rejected:** (b) team-first with invitations at signup
(adds member-graph work to Batch 4 — operator chose to keep entity-graph
features in Batch 5+); (c) full profile (bio + service categories + case
studies — same reason; defer).

**Post-signup destination:** new lightweight team dashboard, OR redirect to
`/dashboard` with a "team mode" flag. Probably a new dashboard route to
avoid conflating with builder dashboard. Surface in §H.

**Mode derivation:** `getEntityModes()` today maps `hasProfile → modes.builder`.
A team entity has NO `profiles` row (profiles is for solo humans). So
modes.builder = false. modes.hirer = false (no subscription). modes.client
= false. modes.admin = false. **All modes empty for a team entity** — a
gap. Need to either:
- Add a `modes.team` boolean to the spec, OR
- Treat team-as-supply with `modes.builder = true` via a synthetic check
  (e.g., presence of a `kind='team'` entity), OR
- Defer the modes integration to Batch 5 and let teams have empty modes
  through Batch 4 (acceptable for first ship — they have an entity, no
  active mode).

Recommend the third option for Batch 4 minimal scope; flag the modes
integration as Batch 5 follow-up. **Confirmed in §H.**

### C.4 — Card 3 — Autonomous Agent (mostly existing flow)

**Copy (locked spec):**
> "I'm an agent with my own wallet, tasks, and outcomes."

`AgentOnboarding.tsx` (207 lines, `src/app/dashboard/AgentOnboarding.tsx`)
already implements the post-signup Agent flow:
- Generate API key via `/api/keys` POST (handles "agent mode" with no
  existing profile — creates minimal one)
- Display key once, copy to clipboard
- Show system prompt template for the user to give their agent

The signup page already routes here via `/dashboard?agent=1` (current
behavior in `src/app/signup/page.tsx:67`).

**Card 3 reuses this entirely.** From the `/join` router, Card 3 →
`/dashboard?agent=1`. No new code required for the post-signup agent flow.

**`entities.kind = 'agent'` for Card 3 — LOCKED 2026-05-23 to (a): create
the `entities` row with `kind='agent'` at signup.** Extends
`findOrCreateHumanEntity` into a parameterised helper (or adds a sibling
`findOrCreateAgentEntity`) that writes the dormant `'agent'` value. This
populates the schema slot, prepares for future entity-graph relationships
(linked principal, owner), and gives agents identity-level standing equal
to humans.

**Considered and rejected:** (b) skip entity creation for Card 3 (defers
identity work — operator chose to populate the slot now so the
entity-graph work in Batch 5+ has clean prior art).

### C.5 — Card 4 — Buyer-only entity (NEW)

**Copy (locked spec):**
> "I'm here to hire, not to sell my own work."

The buyer-only entity has no supply profile. Card 4 creates:
- Auth user (email + password OR magic-link only)
- `entities` row (kind = `'human'`, no `profiles` link)
- Optionally: Stripe subscription immediately (per §H.D1)

**Payment timing — LOCKED 2026-05-23 to (b): free signup + paywall on
first paid action.** Card 4 signup creates the auth user + buyer-only
entity with NO Stripe touch. The paywall fires when the user attempts a
paid action (post-job, message builder) via the existing `/api/checkout`
path — same gate that exists today for any other route into Buyer Mode.

**Considered and rejected:** (a) pay immediately at signup (introduces
Stripe friction before the user has seen the product — operator chose
low-friction signup); (c) trial/free-message bridge (adds bookkeeping
state to track; the simpler "free signup, paywall on first need" achieves
the same conversion-at-moment-of-need outcome).

**Post-signup destination — LOCKED 2026-05-23 to (b): `/hirer`
empty-state with "Browse talent" CTA.** Consistent with the builder-side
dashboard pattern (builders land on `/dashboard`, hirers land on
`/hirer`) and parallel to how `HirerDashboardClient.tsx` already renders
the "Welcome to ShipStacked" empty-state when no hirer profile is set up.

**Considered and rejected:** (a) `/talent` directly (skips the "this is
your home" anchoring; operator chose dashboard-as-home pattern); (c)
1-step onboarding wizard (premature — minimal scope wins for first ship;
the wizard can be added later if the empty-state proves insufficient).

**Relationship to the existing `client` mode (`/api/inquiry` reactive
flow):** Card 4 is the *proactive* version of the lightweight client. The
`/api/inquiry` path auto-creates `role='client'` users from builder profile
inquiries; Card 4 is the same user shape but landed via intent ("I came
here to hire", not "I clicked send-inquiry on a builder profile"). Same
data model (auth user with `user_metadata.role='client'` OR a paid
subscription depending on §H.D1).

**Mode derivation:**
- If §H.D1 = (a) immediate pay: `modes.hirer = true` via subscription row.
- If §H.D1 = (b) free signup: `modes.client = true` (via
  `user_metadata.role='client'`) until first payment, then becomes
  `modes.hirer`.
- If §H.D1 = (c) trial: same as (b) until trial expires.

---

## D. Out of scope (explicit re-confirmation)

- **Team/Agency member linking + invitations** — Batch 5+ entity graph
  work. Card 2 creates the entity; members come later.
- **Full team profile pages** (`/team/<slug>`) with aggregate proof. Batch
  5+. Card 2 creates the entity but doesn't ship a public profile page in
  this batch.
- **Agency subcontracting infrastructure** — later.
- **`employer_profiles` consolidation into entities** — separate batch.
- **DB column renames from prior batches' deferred lists** — Batch 3's
  preserve-list (`employer_email`, `RESEND_SEGMENT_EMPLOYERS`, etc.)
  stays.
- **Auto-enrichment (M5 CRITICAL OPEN)** — separate batch.
- **RLS rollout** — separate batch.
- **Any change to existing Solo Builder `/join` flow logic** beyond
  extending it into the 4-card router.
- **Team-mode in `EntityModes`** — see §C.3, deferred to Batch 5.

---

## E. Pre-flight verification — results

Read-only steps completed during this discovery prep.

### E.1 — Existing `/join` page structure (full read complete)

`src/app/join/page.tsx`, 306 lines. 2-step form with these characteristics:
- Step 0 ("Who you are"): full_name, email (disabled, from auth),
  role/title, bio, location, github_url, x_url.
- Step 1 ("What you ship"): project title/outcome/url + 4 skill tag groups
  (CLAUDE_USE_CASES, AI_TOOLS, FRAMEWORKS, DOMAINS).
- Step 2: success screen with profile URL + share buttons + dashboard CTA.
- Auth gate: if no user → redirect to `/signup` (line 63).
- Existing-profile bump: if profile already exists → redirect to
  `/dashboard` (line 66).

This shape is preserved as Card 1's flow. The router shell prepends a card
selector step.

### E.2 — Post-Batch-2 `/signup` state (full read complete)

`src/app/signup/page.tsx`, 174 lines. Post-Batch-2 state:
- Single email+password form (no role toggle — removed in Batch 2).
- Post-signup "How do you build?" fork: `/dashboard?agent=1` (Use my agent)
  OR `/join` (Set up myself).
- "Hiring instead?" link → `/#pricing` (Batch 2 preserve-link).

**`/signup` future — LOCKED 2026-05-23 to (a): `/signup` 308-redirects to
`/join`.** Single canonical signup entry. The card subflows on `/join`
each carry their own auth step (email+password input on the form);
`/signup` becomes a stub that preserves the old URL for bookmarks.

**Considered and rejected:** (b) keep `/signup` as auth + `/join` as
selector (two pages, two purposes — operator chose single canonical
entry); (c) `/join` replaces `/signup` entirely with no stub (loses
backwards-compat with existing bookmarks/links — operator chose the 308
stub).

### E.3 — `/api/inquiry` lightweight client pattern (full read complete)

`src/app/api/inquiry/route.ts`, 181 lines. The reactive pattern for Card
4's "free buyer" mode (if §H.D1 = b or c):
- Lookups existing auth user by email (line 42-43).
- If new: `admin.auth.admin.createUser({ email, email_confirm: true,
  user_metadata: { role: 'client', ... } })` — no password set, magic-link
  only entry.
- Inserts a `conversations` row + `messages` + `project_inquiries`.
- Generates magic-link redirect to `/client/inbox` (line 109).

Card 4's proactive signup can reuse this pattern minus the
conversation/messages/project_inquiries side-effects.

### E.4 — `/api/keys` V1 agent key issuance (full read complete)

`src/app/api/keys/route.ts`, 133 lines. Card 3 hooks here:
- POST creates a minimal `profiles` row if none exists (line 55-77),
  using `body.full_name` for username slug.
- Generates `sk_ss_*` key, hashes for storage, returns raw key ONCE.
- Max 5 keys per profile.

**Note:** the current agent-mode flow creates a `profiles` row but does
NOT create an `entities` row. If `entities.kind='agent'` is desired (§H.D8),
this route needs a small extension to also call `findOrCreateHumanEntity`
or a new `findOrCreateAgentEntity` helper. The existing
`findOrCreateHumanEntity` hardcodes `kind: 'human'`.

### E.5 — `entities.kind` schema state (audit)

From `supabase/migrations/20260515150752_proof_receipts_v0_1.sql:13`:
```sql
kind text not null check (kind in ('human','operator','fleet','agent'))
```

TypeScript type at `src/lib/entities.ts:22`:
```typescript
kind: 'human' | 'operator' | 'fleet' | 'agent'
```

**Schema supports 4 values. Runtime uses 1 (`'human'`).** No 'team',
'agency', 'studio', 'buyer' values exist.

Card mapping if DDL-free path (§H.D7 / §H.D8):

| Card | Kind value | Status |
|---|---|---|
| 1 Solo Builder | `'human'` | already in use |
| 2 Team/Agency | `'fleet'` (existing, semantically marginal) OR add `'team'` (needs DDL) | decision §H.D7 |
| 3 Agent | `'agent'` (existing, never written) | decision §H.D8 (use or skip entity creation) |
| 4 Buyer-only | `'human'` (a person who hires) | already supported |

### E.6 — `getEntityModes()` post-Batch-2 shape

`src/lib/user.ts:3-8`:
```typescript
export type EntityModes = {
  builder: boolean   // hasProfile
  hirer: boolean     // hasSubscription
  client: boolean    // user_metadata.role === 'client'
  admin: boolean     // user_metadata.role === 'admin'
}
```

**No `team` mode.** Card 2 entities won't activate any current mode (see
§C.3 discussion). Acceptable for Batch 4 first ship; flag for Batch 5.

### E.7 — Grep for `team` / `agency` / `agent` references in `src/`

- **`team` as identity/profile concept:** zero. Only references are
  `team_size` form field (employer profile metadata, unrelated to
  team-as-entity) and `TEAM_SIZES` constant (same).
- **`agency` references:** **zero in `src/`.** The word doesn't appear
  anywhere — fully greenfield concept.
- **`agent` as entity type:** existing `AgentOnboarding.tsx` component +
  `?agent=1` query param + "agent mode" in `/api/keys`. The semantic
  "autonomous agent" concept exists in copy and routing but never writes
  `entities.kind='agent'`. No `entities` row gets created for agent users
  today — they have a `profiles` row, no entity link.

### E.8 — `AgentOnboarding.tsx` (Card 3 prior art)

`src/app/dashboard/AgentOnboarding.tsx`, 207 lines. Existing component
that handles the entire post-signup agent flow. Triggered from
`/dashboard?agent=1` when no profile exists. Workflow:
1. Show 3-step progress (account-ready, generate-key, brief-agent).
2. Take user's full_name input.
3. POST `/api/keys` with full_name → backend creates minimal profile +
   key.
4. Display raw key with copy-to-clipboard + warning ("shown once").
5. Display system prompt template the user gives their agent.

**Card 3 → `/dashboard?agent=1` is a working route today.** Batch 4
either:
- (3-i) Keep this routing — Card 3 click → `/dashboard?agent=1` →
        AgentOnboarding renders. Minimum disruption.
- (3-ii) Move AgentOnboarding into the `/join` router as Card 3's
        subflow. Cleaner UX (everything in one router) but bigger code
        change.

Recommend (3-i) for minimum disruption; the routing is already
mode-agnostic and clean. Flag in §H.

---

## F. SQL audit block (operator runs in Supabase Dashboard)

Read-only. Returns the schema state needed to confirm or refine §B / §H
decisions. **Run before §H approval** — the row-count and
information_schema findings may shift the operator's choice on §H.D7.

```sql
-- ============================================================================
-- §F.1 — entities.kind distribution (count by kind)
-- ============================================================================
SELECT
  kind,
  count(*) AS row_count,
  count(*) FILTER (WHERE owner_user_id IS NOT NULL) AS with_owner,
  count(*) FILTER (WHERE owner_user_id IS NULL)     AS without_owner,
  count(*) FILTER (WHERE profile_id IS NOT NULL)    AS with_profile,
  count(*) FILTER (WHERE profile_id IS NULL)        AS without_profile
FROM public.entities
GROUP BY kind
ORDER BY kind;

-- ============================================================================
-- §F.2 — entities rows with no owner_user_id link (unclaimed entities)
-- ============================================================================
SELECT
  count(*) AS unclaimed_entities,
  count(*) FILTER (WHERE profile_id IS NOT NULL) AS unclaimed_but_profile_linked
FROM public.entities
WHERE owner_user_id IS NULL;

-- ============================================================================
-- §F.3 — search information_schema for team/agency/agent-related schema
-- ============================================================================
-- Column names containing 'team', 'agency', 'agent', or 'studio'
SELECT
  table_schema,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name ILIKE '%team%'
    OR column_name ILIKE '%agency%'
    OR column_name ILIKE '%studio%'
    OR (column_name ILIKE '%agent%' AND column_name NOT IN ('user_agent'))
  )
ORDER BY table_name, column_name;

-- Tables containing 'team', 'agency', 'agent', or 'studio'
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%team%'
    OR table_name ILIKE '%agency%'
    OR table_name ILIKE '%studio%'
    OR table_name ILIKE '%agent%'
  )
ORDER BY table_name;

-- ============================================================================
-- §F.4 — verify entities.kind CHECK constraint (matches code expectation)
-- ============================================================================
SELECT
  c.conname     AS constraint_name,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t      ON c.conrelid = t.oid
JOIN pg_namespace n  ON t.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.relname = 'entities'
  AND c.contype = 'c';
```

Expected output (informational):
- **§F.1:** All rows should be `kind='human'` per audit. If any other kind
  appears, surface immediately — it changes the Batch 4 plan.
- **§F.2:** Likely zero unclaimed entities (every entity links to an auth
  user). Confirm.
- **§F.3:** Likely zero non-Atlas results. `atlas_*` tables will appear if
  the regex matches but they're unrelated (Atlas role taxonomy). The
  point is to confirm no surprise `teams` / `agencies` / etc. tables
  exist.
- **§F.4:** Should return `CHECK (kind = ANY (ARRAY['human'::text,
  'operator'::text, 'fleet'::text, 'agent'::text]))` confirming the
  constraint matches what the migration file declares.

---

## G. Cross-cutting concerns

### G.1 — `getEntityModes()` integration for new card outcomes

Each card's data writes must produce the correct mode-derivation result:

| Card | DB write | `getEntityModes()` outcome |
|---|---|---|
| 1 Solo Builder | profiles insert | `modes.builder = true` ✓ |
| 2 Team/Agency | entities insert (no profile) | **all modes false** — gap per §C.3, accepted for Batch 4 |
| 3 Agent | profiles insert (minimal) + key | `modes.builder = true` ✓ (treats agent as supply identity); may also create entity per §H.D8 |
| 4 Buyer-only | entities insert + subscription OR user_metadata.role='client' | `modes.hirer = true` if paid; `modes.client = true` if free signup |

### G.2 — `/signup` vs `/join` URL routing

Per §E.2, today's two-page split creates ambiguity. Operator decides at
§H.D5. Whichever path is chosen, NavBar and home page CTAs need a small
sweep to update internal links — minimal edit, ~3-5 sites.

### G.3 — Card 2 modes integration deferred

Team entities will have empty modes through Batch 4. That means:
- Cannot route a team user via `routeAfterAuth()` cleanly — would hit
  `/dashboard` fallback.
- NavBar won't show team-specific links.
- A team-context dashboard needs an alternative gate (probably "user has
  entity with kind='team' or 'fleet'" check, server-side).

This is a real limitation but acceptable for first ship — teams can use
the app at the entity level even without a mode flag. Batch 5 adds
`modes.team` properly.

### G.4 — Card 4 vs existing `client` mode

The `client` mode exists for `/api/inquiry`-created users (reactive). Card
4 is the proactive equivalent. If §H.D1 = (b) free signup, Card 4 just
duplicates the existing client-creation flow with no project-inquiry
context. If §H.D1 = (a) paid signup, Card 4 routes through Stripe
checkout and creates a subscription row → `modes.hirer = true`. Different
data shape, different mode.

### G.5 — Welcome emails

Card 1 already sends a welcome email via `/api/welcome`. New cards
(2/3/4) should follow the same pattern. Either reuse `/api/welcome` with
a card-type parameter, OR create per-card welcome endpoints. Recommend
extending `/api/welcome` with a `type` param to keep email logic in one
place.

---

## H. Approval gate (operator signs off explicitly per item)

Operator: tick each decision before any execution.

**Eight load-bearing decisions — all LOCKED 2026-05-23:**

- [x] **D1 — Card 4 payment timing: LOCKED to (b)** — free signup +
      paywall on first paid action (post-job, message builder). No Stripe
      touch at signup. Paywall fires via existing `/api/checkout` at
      moment of need.

- [x] **D2 — Card 3 signup destination: LOCKED to (a)** — create entity
      (kind='agent', per D8) + issue API key immediately. Reuses existing
      `AgentOnboarding.tsx` flow at `/dashboard?agent=1`.

- [x] **D3 — Card 4 post-signup destination: LOCKED to (b)** — `/hirer`
      empty-state with browse-talent CTA. Consistent with builder-side
      dashboard pattern.

- [x] **D4 — Card 2 field collection scope: LOCKED to (a)** — minimal:
      team name + email + 1-line description. Member linking deferred to
      Batch 5+.

- [x] **D5 — `/signup` after this batch: LOCKED to (a)** — `/signup`
      308-redirects to `/join`. Single canonical signup entry; preserves
      bookmark backwards-compat.

- [x] **D6 — Final card copy: APPROVED with one override.**

  - **Card 1 — Solo AI Builder**
    - Headline: "Solo AI Builder"
    - Subhead: "I ship AI work. I want my real builds to get me opportunities."
    - Bullet: "Free supply profile. Optional Buyer Mode later."
  - **Card 2 — Team / Agency / Studio**
    - Headline: "Team / Agency / Studio"
    - Subhead: "We deliver AI implementation for clients. We may also hire specialists."
    - Bullet: "Free collective supply profile. Optional Buyer Mode."
  - **Card 3 — Autonomous Agent**
    - Headline: "Autonomous Agent"
    - Subhead: "I'm an agent with my own wallet, tasks, and outcomes."
    - Bullet: "Free supply profile. API key issued at signup."
  - **Card 4 — Buyer-only**
    - Headline: **"I want to hire builders"** *(overrides original
      "Hire AI talent" — matches first-person framing across all 4 cards)*
    - Subhead: "I'm here to hire, not to sell my own work."
    - Bullet: "Lightweight buyer-only entity. Buyer Mode active by default."

- [x] **D7 — `entities.kind` for Card 2: LOCKED to (b)** — DDL: add
      `'team'` to the CHECK constraint via Supabase Dashboard SQL
      Editor. Execution Step 1 (DDL) runs first; Step 2 (code) follows.
      Both gated separately at execution time.

- [x] **D8 — `entities.kind='agent'` for Card 3: LOCKED to (a)** —
      create `entities` row with `kind='agent'` at signup. Extend
      `findOrCreateHumanEntity` into a parameterised helper (or add a
      sibling `findOrCreateAgentEntity`).

**Cross-cutting confirmations:**

- [x] **G.3 — Team entities have empty `modes` through Batch 4.**
      Accepted. Card 2 users won't activate any `EntityModes` flag in
      this batch; add `modes.team` in Batch 5.
- [x] **G.5 — Extend `/api/welcome` with a `type` param** rather than
      adding per-card welcome endpoints.

**Operator approval: granted 2026-05-23 — single Batch 4 execution, all
8 decisions + 2 cross-cutting locked. D1=(b) → no Stripe touch at signup;
§M.3 Stripe end-to-end gate is NOT applicable to this batch. Standard
Vercel-green build is sufficient. D7=(b) → DDL applied first (Step 1) via
Supabase Dashboard SQL Editor, code commit follows (Step 2); both gated
separately at execution time.**

---

## I. Code edit + commit plan

Depends heavily on §H decisions. Sketch:

### Definite work (regardless of decisions)

1. **`src/app/join/page.tsx`** — extend with router (step `-1` = card
   strip; current step 0/1/2 become Card 1's flow).
2. **Cards 2, 3, 4 subflow components** — new files under
   `src/app/join/cards/` (or similar) for each new card.
3. **`src/app/api/signup/team`** (or `/api/join/team`) — new POST endpoint
   to create the team entity if §H.D7 ≠ (c).
4. **`src/app/api/signup/buyer`** — new POST endpoint for Card 4 (creates
   auth user + entity, optionally triggers Stripe checkout per §H.D1).
5. **`src/app/api/welcome/route.ts`** — extend with `type` param per
   §G.5.
6. **NavBar / home / FooterBar / signup → /join sweep** per §H.D5 choice.

### Conditional work

- **If §H.D7 = (b):** DDL block via Supabase Dashboard SQL Editor:
  ```sql
  -- Add 'team' to entities.kind CHECK constraint
  BEGIN;
  ALTER TABLE public.entities DROP CONSTRAINT entities_kind_check;
  ALTER TABLE public.entities ADD CONSTRAINT entities_kind_check
    CHECK (kind IN ('human','operator','fleet','agent','team'));
  COMMIT;
  ```
  Plus updates to `src/lib/entities.ts:22` (TypeScript type union).
- **If §H.D8 = (a):** New `findOrCreateAgentEntity` helper in
  `src/lib/entities.ts` (or extend the existing helper with a kind
  parameter). Extend `/api/keys` POST to call it.
- **If §H.D5 = (a) or (c):** Update or delete `/signup` (and the welcome
  email + auth/callback redirects that point there).

### Estimated scope

- Files touched: ~10-15 (depending on D5 + new subflow components).
- New files: 3-5 (subflow components + signup endpoints + maybe new
  team-dashboard scaffold).
- Lines added: ~600-900 (Card 2 + Card 4 are the bulk).
- Lines removed: ~50 (only if D5 = c, deleting /signup).

### Verification

- `npx tsc --noEmit` clean.
- `npm run build` clean — expect 84 + N new routes (where N depends on
  D5 + subflow URL pattern).
- Manual smoke-test of each card click → completion → mode-derivation
  outcome.
- Stripe end-to-end if §H.D1 = (a) — same gate as Batch 2 (now revived
  because Card 4 paid path is real revenue surface).

---

## J. Execution sequence (gated on §H approval)

**Single commit** (recommended) for the bulk of the work. Two-commit if
§H.D7 = (b) requires DDL — code first, then DDL via Supabase Dashboard
per Batch 1 protocol.

1. Branch off `main` at HEAD `d1e9eae` (or latest at execution time).
2. If §H.D7 = (b): apply DDL via Supabase Dashboard SQL Editor BEFORE
   code, OR apply code with type union extended + skip team writes until
   DDL lands. Recommend DDL-first.
3. Build the router shell + Cards 2 / 3 / 4 subflows per the decisions.
4. Local typecheck + build clean.
5. Manual smoke-test (or automated if a test harness lands).
6. Commit, push.
7. Vercel deploy gate per §H.D1 if paid path is live.

---

## K. Verification — what 'green' looks like

- `/join` renders the 4-card router on first visit (no card selected).
- Each card click routes to the correct subflow.
- Card 1 still works for existing builders (no regression).
- Card 2 creates an `entities` row with the chosen kind value; team
  dashboard / placeholder destination loads.
- Card 3 routes to `/dashboard?agent=1` (or whatever D2 dictates) and
  AgentOnboarding renders.
- Card 4 creates the buyer-only entity + (depending on D1) Stripe
  checkout flow runs cleanly.
- `getEntityModes()` returns the expected modes for each card's resulting
  user (per §G.1 table).
- `npx tsc --noEmit` clean.
- `npm run build` clean.
- Vercel build green.

---

## L. Reversal

- **Code changes:** `git revert <SHA>`.
- **DDL** (if §H.D7 = b): reversal block in same Dashboard:
  ```sql
  BEGIN;
  ALTER TABLE public.entities DROP CONSTRAINT entities_kind_check;
  ALTER TABLE public.entities ADD CONSTRAINT entities_kind_check
    CHECK (kind IN ('human','operator','fleet','agent'));
  COMMIT;
  ```
  Note: if any rows have been inserted with `kind='team'` between forward
  and reverse migrations, the reverse will fail unless those rows are
  first updated or deleted. Surfaced at execution time if non-zero count.
- **Subscription rows / auth users:** if Card 4 creates real Stripe
  subscriptions, those are external state; revert only nulls the local
  signup pathway, not the Stripe customer. Acceptable — Stripe-side
  cleanup is operator-managed.

---

## M. Risks / honest notes

1. **First user-visible product change.** Different review bar than
   Batches 1-3. Card copy + payment timing + onboarding destination are
   product calls. Operator + architect involvement at §H is essential.

2. **Card 2 (Team) has the most unknowns.** Field scope (D4), kind value
   (D7), modes integration (G.3 deferred), member linking (deferred to
   Batch 5). If D7 = (c) "defer Card 2", ship Batch 4 with 3 cards and
   the team card greyed out as "coming soon" — operator decides whether
   that's acceptable.

3. **Card 4 paid path is a revenue surface — but NOT in this batch.**
   D1 was LOCKED to (b) free signup + paywall on first paid action. Card
   4 signup itself does NOT touch Stripe. The paywall fires at
   `/api/checkout` only when the user first attempts a paid action —
   that's the existing flow, no new revenue-surface code in Batch 4.
   **Stripe end-to-end verification gate is NOT applicable to this
   batch.** Standard Vercel-green build is sufficient.

4. **Existing `/dashboard?agent=1` AgentOnboarding flow is solid.** Card
   3 reuses it. If D2 = (a), Batch 4 effectively adds no new Card 3 code
   beyond the router shell entry — pure routing change.

5. **`/signup` vs `/join` ambiguity** (D5). The Batch 2 / Batch 3 work
   left signup as a single email+password page with a post-signup fork.
   The 4-card router lives on `/join`. Resolving the duplication is a
   small but visible UX choice.

6. **DDL availability.** The operator's prior batches confirmed DDL via
   Supabase Dashboard SQL Editor is acceptable (Batch 1 ran a 3-table
   DROP). The Card 2 schema change in D7 = (b) is one ALTER TABLE — same
   protocol, much lower risk than Batch 1 destructive drops.

7. **Audit residue from Batch 3.** `grep "employer" src/` post-Batch-3
   returns ~107 lines of deferred-rename Category-D content. These are
   stable and don't interact with Batch 4, but a fresh contributor might
   misread "employer_profiles" references in Card 4's buyer-side
   integration as todo work. They're not — they're explicitly preserved.

8. **No DB schema-rename batches yet.** Batches 1–3 deferred several
   destructive DB migrations (employer_email column rename, attestor_role
   enum value, magic_link drops were already done). Batch 4 may surface
   pressure to do another DDL pass alongside (e.g., a "team" enum value).
   Each DDL stays gated by the same Batch-1 protocol — discovery doc,
   approval, reversal block, atomic transaction.
