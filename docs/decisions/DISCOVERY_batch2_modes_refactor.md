# DISCOVERY — Batch 2: single-role → composable modes refactor

Phase 1 discovery doc. Read-only research. No code mutation, no commits until
operator signs off Section H below.

Prepared at HEAD `f219f1d` on 2026-05-22.

---

## A. Purpose

Batch 2 dismantles the single-role identity primitive (`user_metadata.role` as
permanent identity) and replaces it with composable modes attached to an entity
(`builder`, `hirer`, `client`, `admin` — all evaluable independently against
the same logged-in user). This is the foundational change unblocking M1 (mode
toggle UI), M2 (buyer-only entity signup), and M3 (team/agency entity) from
the system-wide audit's MISSING list.

**Honest framing — biggest refactor in the locked roadmap.** Touches auth,
messaging, routing, and roughly a quarter of all classified surfaces (25 of
~100 code surfaces from the audit). Pre-flight verification (§D) is
load-bearing: the goal is to surface every single-role consumer before any
code is touched, not discover them mid-refactor.

Verifiable as: **same user, two modes, both surfaces work** — a logged-in
account with `hasProfile && hasSubscription` can navigate freely between
`/dashboard` and `/employer` without redirect ping-pong, see messages from
both sides via the unified `/messages` page, and have one nav bar that
exposes both surfaces.

Out of scope (explicit, see §C): the "Employer → Hirer/Buyer" terminology
pass (Batch 3), the `/join` 4-card router and buyer-only entity signup
(Batch 4), `employer_profiles` consolidation, RLS rollout, new entity types
(team / agency / autonomous agent), and any DB schema change.

---

## B. Scope — the load-bearing decision + 12 refactor items

### B.0 — Type contract root: `src/lib/user.ts`

**The load-bearing decision.** Replace `UserRole` union + `getResolvedUser()`
returning a single `role` with a modes-based shape. New helper returns ALL
active modes for the current user, not a single role.

Current shape (load-bearing today):
```typescript
export type UserRole = 'employer' | 'builder' | 'client' | 'visitor'
export type ResolvedUser = {
  user: any | null
  role: UserRole
  hasProfile: boolean
  hasSubscription: boolean
  profile: any | null
  subscription: any | null
}
```

**LOCKED shape (Option (i) — booleans-per-mode, approved 2026-05-22):**

```typescript
export type EntityModes = {
  builder: boolean   // = hasProfile
  hirer: boolean     // = hasSubscription
  client: boolean    // = user_metadata.role === 'client' (until Batch 4 merges)
  admin: boolean     // = user_metadata.role === 'admin' (stays — admin is operator)
}
export type ResolvedUser = {
  user: User | null
  modes: EntityModes
  hasProfile: boolean
  hasSubscription: boolean
  profile: ProfileRow | null
  subscription: SubscriptionRow | null
}
```

Rationale (locked):
- **"Visitor"** disappears as a value. It's now expressed as `user === null`
  OR `modes.length === 0` / `!modes.builder && !modes.hirer && !modes.client
  && !modes.admin`. Callers update one site.
- **Mode evaluation is independent.** `modes.builder = hasProfile` and
  `modes.hirer = hasSubscription` are derived from real data, not from
  `user_metadata.role`. The metadata field is now legacy.
- **`client`** stays as a mode in Batch 2 (the brief explicitly notes the
  full `/client` → Buyer Mode merge is Batch 4 work).
- **`admin`** stays single-source via `user_metadata.role === 'admin'`. Admin
  is operator identity, not transactional; treating it as a mode is the
  smallest disruption.

A new helper `getEntityModes()` is the public consumer-facing API.
`getResolvedUser()` either becomes a deprecated alias returning the new shape
(with a synthesized legacy `role` field for any caller mid-migration) or is
deleted outright once all callers are migrated. **Recommendation: rename to
`getEntityModes()` and delete `getResolvedUser` as part of the same commit so
there's no half-migrated state.**

### B.1 — `src/middleware.ts`: delete role-based redirects

Per the audit, three redirect blocks in middleware key off
`user_metadata.role`:

```typescript
// Lines 111-117 — builder hitting /employer or /post-job → /dashboard
const employerOnly = ['/employer', '/post-job']
if (session && employerOnly.some(route => pathname.startsWith(route))) {
  const metaRole = session.user.user_metadata?.role
  if (metaRole === 'builder') return redirect('/dashboard')
}

// Lines 121-128 — employer hitting /dashboard → /employer
if (session && pathname.startsWith('/dashboard')) {
  const metaRole = session.user.user_metadata?.role
  if (metaRole === 'employer') return redirect('/employer')
}

// Lines 131-137 — client hitting /dashboard or /messages → /client/inbox
if (session && session.user.user_metadata?.role === 'client') {
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/messages')) {
    return redirect('/client/inbox')
  }
}
```

**Proposed: delete all three blocks.** Keep content-negotiation (lines 8-71)
and the auth-required gate (lines 102-109). Reasoning:
- `/employer` and `/post-job` are page-level subscription-gated (verified —
  see §D.5). Builder without subscription hits the page, gets the existing
  `redirect('/#pricing')` page-level treatment. No regression.
- `/dashboard` is the default destination — a hirer-mode-active entity SHOULD
  be able to land there (builder side of their identity). The current redirect
  encodes the single-role assumption.
- `/messages` redirect for clients is the only mildly tricky one — see §G.3.

### B.2 — `src/app/auth/callback/page.tsx`: unify hash vs no-hash paths

Two code paths, structurally similar, with a real bug:

- **Hash-token path (lines 21-58):** sets session, then routes by
  `metaRole === 'employer'` → `/employer` or `/update-password`, `metaRole
  === 'client'` → `/client/inbox`, **subscription fallback** → `/employer`,
  default → `/dashboard`.
- **No-hash path (lines 64-77):** routes by `metaRole === 'employer'` →
  `/employer`, `metaRole === 'client'` → `/client/inbox`, default →
  `/dashboard`. **Lacks the subscription fallback** the hash-token path has.

This is a real bug: a hirer who paid before `user_metadata.role='employer'`
got stamped (legacy / edge case) and lands here via no-hash path gets routed
to `/dashboard` instead of `/employer`.

**Proposed: extract a single `routeAfterAuth(user)` helper** that calls
`getEntityModes()` and returns the destination. Both paths invoke it. The
bug closes incidentally because mode-derivation reads subscription state for
both paths.

Routing precedence (preserves current behaviour with a coherent ordering):
1. `redirectTo` query param (magic link explicit destination) — honoured first
2. `modes.client` → `/client/inbox`
3. `modes.hirer` (with `!hasPasswordSet` check on hash-token path) →
   `/update-password` or `/employer`
4. `modes.builder` → `/dashboard`
5. Default fallback → `/dashboard`

### B.3 — `src/app/login/actions.ts`: same routing helper

`login()` server action has its own metaRole cascade (lines 58-83) that
duplicates auth/callback's logic. Replace with the same `routeAfterAuth()`
helper. The admin-precedence branch becomes `if (modes.admin) redirect('/admin')`
at the top.

### B.4 — `/api/messages` + `/api/messages/[id]` + `/api/messages/unread`: `?as=` query parameter

Per the brief, replace role-branching with `?as=builder` / `?as=hirer` query
param. Route handlers:

```typescript
// /api/messages?as=hirer
const as = req.nextUrl.searchParams.get('as') ?? defaultMode(modes)
if (as === 'hirer' && !modes.hirer) return 403
if (as === 'builder' && !modes.builder) return 403

if (as === 'hirer') {
  // query by employer_email
} else {
  // query by builder_profile_id
}
```

`defaultMode(modes)` picks the user's likely primary mode for the request
when no `?as=` is supplied. **Priority order (locked — mirrors
`routeAfterAuth()` from §G):** `client > hirer > builder`. (Admin doesn't
apply to messaging context — admins don't have message inboxes per se.)
A both-modes (builder + hirer) entity defaults to `?as=hirer` for
parameterless requests; they can switch to `?as=builder` via the tab strip
in the unified `/messages` page. This keeps the two helpers' priority specs
consistent: same precedence for post-auth routing and for `?as=`-less
messaging requests.

An authenticated user with both modes active hits `/api/messages?as=hirer`
for their hirer inbox and `/api/messages?as=builder` for their builder inbox
— both work, no role-stamping required.

**Note:** Realtime channels (Supabase Postgres Changes subscriptions on the
`messages` table) currently work because anon RLS is permissive on
`conversations` and `messages`. Per the brief, RLS rollout is a separate
batch — Batch 2 sets up the code structure assuming proper RLS later. For
this batch, Realtime keeps working as-is; no Realtime code change.

### B.5 — `/messages` + `/employer/messages`: consolidate into one tabbed page

Per the B+ design, two backend queries, one frontend. Single
`/messages?as=builder` and `/messages?as=hirer` route. Tab strip auto-hides
for single-mode users (zero UI change for them).

Structural feasibility (verified — see §D.3): the two pages share ~80% of
their UI structure (identical `timeAgo` helper, identical
conversation-list-plus-thread two-pane layout). Diffs:
- `/employer/messages` has `useSearchParams` + Suspense wrapper for the
  `?new=<profile_id>` direct-message-start feature
- `/messages` shows employer profile context (company_name, logo)
- `/employer/messages` shows builder profile context (username, full_name,
  velocity_score)

**Proposed: single `<MessagesPage />`** with:
- `?as=builder | ?as=hirer | (no param)` controls active tab
- The `?new=<profile_id>` flow gates on `modes.hirer && as === 'hirer'`
- Conversation card renders show-the-other-side: if `as=hirer`, render
  builder details; if `as=builder`, render employer details

The component is bigger than either original, but it's one consolidation —
not net-new logic. Estimated ~400 lines (the two originals total 604).

**LOCKED 2026-05-22:** `/employer/messages` stays as a 308-redirect to
`/messages?as=hirer` for any external links / bookmarks. Costs ~5 lines,
preserves cached references / shared links the operator can't enumerate.
(The alternative — hard delete — was considered. Rejected: 308 stub is
near-zero-cost and preserves graceful redirection.)

### B.6 — `src/app/components/NavBar.tsx`: mode-aware nav arrays

Currently 8 distinct nav arrays keyed on `navUser?.role` + `pathname`. The
client-side fetcher reads `user.user_metadata?.role` directly (line 134).

**Proposed:**
- `navUser` carries `modes: EntityModes` instead of `role: string`
- Nav-array logic becomes pathname + active-mode conditional:
  - If `modes.hirer` and `pathname.startsWith('/employer')`: hirer-context nav
  - If `modes.builder` and `pathname.startsWith('/dashboard')`: builder-context nav
  - If `modes.hirer && modes.builder`: nav exposes BOTH "Dashboard"
    and the equivalent of "Employer area" links (let the user switch modes)
  - Combined unread badge (single API call to /api/messages/unread aggregates
    both sides if both modes active)
- `setNavUser({ email, modes })` on session-mount
- Admin precedence preserved: `modes.admin` → admin-only nav array (unchanged
  from today)

Single-mode users see the same nav they see today (no visible change).
Multi-mode users see both nav surfaces.

### B.7 — `/api/webhooks/stripe/route.ts`: stop stamping `user_metadata.role='employer'`

Line 46 currently writes `user_metadata: { role: 'employer', password_set:
false }` on new user creation post-checkout.

**Proposed:** remove the `role: 'employer'` field. Keep `password_set: false`
(real load-bearing state for the onboarding flow). The subscription row
itself is the Hirer Mode signal — `getEntityModes()` derives `modes.hirer`
from `hasSubscription`. No metadata stamping needed.

**Edge case:** new-user vs existing-user branches. The webhook handler
currently checks `existingAccount` first; if found, only the subscription row
is inserted, no metadata stamping. So the `role: 'employer'` write was only
ever on truly-new users — clean removal.

### B.8 — `src/app/signup/page.tsx`: remove builder/employer toggle

Lines 170, 182, and the `role` state variable backing them. Single signup
form: email + password. No identity choice at this surface. Per the brief:
"the 4-card /join router is Batch 4 — for Batch 2, signup becomes
mode-agnostic; selection of supply identity happens at /join."

The employer-toggle branch (lines 182-onward) currently renders a
checkout-redirect card with `/api/checkout`. **LOCKED 2026-05-22:**
- Remove the toggle UI entirely. Default form is the builder signup form.
- Preserve a **discreet "Hiring instead?" link** somewhere on the page
  (e.g. footer of the signup form: `"Hiring instead? Subscribe →"`)
  pointing to `/#pricing` (or directly to `/api/checkout` if pricing-page
  routing isn't worth the extra hop). Preserves the paid-signup entry point
  without re-introducing the role toggle.
- No `?role=employer` query-param magic. Home page CTAs (already audited)
  point to `/#pricing` or `/api/checkout` directly, not via signup toggle.

(The alternative — hard delete the demand-side entry from `/signup`
entirely, rely on `/employers` + home page CTAs — was considered. Rejected:
the discreet link is a few lines of JSX and avoids creating a dead-end for
any user who lands on `/signup` while in a hiring mindset.)

### B.9 — `/api/comments/route.ts`: derived-mode lookup OR remove fallback

Line 25 reads `metaRole = user.user_metadata?.role || 'builder'` and writes
it to `post_comments.author_role` (line 29). The audit flagged this stored
field as already conflated (comment author_role mixes metaRole + profile.role).

**Proposed:** safest minimum-disruption move is to **leave existing stored
data alone** (don't backfill, don't mutate `post_comments` rows) and replace
the new-write fallback with a derived value from `getEntityModes()`. For a
new comment:
- If `modes.admin`: store `'admin'`
- Else if `modes.hirer && !modes.builder`: store `'employer'` (legacy label
  — Batch 3 terminology pass renames it)
- Else: store `'builder'` (covers solo builder, builder+hirer, default)

This preserves the visible badge UI (`PostComments.tsx:96-97`) while
removing the metaRole read. Document explicitly that this field is legacy
and will be re-evaluated when Batch 3 (terminology) lands.

### B.10 — Page-level branches (10 surfaces — per-surface mode-aware replacements)

Below: every single-role consumer beyond the load-bearing surfaces above,
with the proposed replacement.

#### B.10a — `/api/hire-confirm/route.ts:30-31`
Uses `role` from query string (`?role=builder | ?role=employer`), not
`user_metadata`. **No change needed.** The hire-confirm handshake is a
two-party concept (who clicked the link) and the query-param role is
authoritative.

#### B.10b — `/api/inquiry/route.ts:50-56`
Sets `user_metadata: { role: 'client' }` on auto-created lightweight users.
**Keep as-is for Batch 2.** Client primitive stays through Batch 2 per the
brief. Batch 4 absorbs this into the buyer-only entity flow.

#### B.10c — `/app/jobs/page.tsx` + `/app/jobs/[id]/page.tsx` + clients
Lines: `const role = (user?.user_metadata?.role as 'builder'|'employer'|
'admin'|null) ?? null` and downstream `if (role === 'builder')` for the
applied-state fetch.

**Proposed:** replace with `const { modes, user } = await getEntityModes()`
and `if (modes.builder && user)` for the applied-state fetch. The
`<JobsClient />` / `<JobDetailClient />` consumers receive `modes` (or just
the booleans they need: `isBuilder`, `isHirer`) as props instead of `role`.

#### B.10d — `/app/feed/[id]/page.tsx:81`
`const { role, user: resolvedUser } = await getResolvedUser()`.
**Proposed:** `const { modes, user: resolvedUser } = await getEntityModes()`.
Then `if (modes.builder)` for the edit-affordance check.

#### B.10e — `/app/feed/[id]/FeedPostCTA.tsx:32`
`if (role === 'employer') return null`.
**Proposed:** `if (modes.hirer && !modes.builder) return null` — hide the
"share / inquire" CTA only for hirer-only entities. A builder+hirer entity
sees the CTA (their builder side is the relevant identity for a feed post).

#### B.10f — `/app/feed/[id]/PostComments.tsx:96-97`
Reads `comment.author_role` (stored field, not user_metadata). **No change
needed.** This is reading historical data; storage write site changes via B.9.

#### B.10g — `/app/u/[username]/contact-check.ts:7`
`if (role === 'employer' && hasSubscription) return true`.
**Proposed:** `if (modes.hirer) return true` (note: `modes.hirer` is already
`hasSubscription` by derivation — equivalent semantics, cleaner).

#### B.10h — `/app/u/[username]/page.tsx:79`
Destructures `{ hasSubscription, user: resolvedUser }` (not `role`).
**Proposed:** `const { hasSubscription, user: resolvedUser } = await
getEntityModes()` — `hasSubscription` stays as a top-level field for clarity.

#### B.10i — `/app/company/[slug]/page.tsx:48-51`
Three flag derivations: `showBuilderCTA = role === 'visitor'`, `isBuilder =
role === 'builder'`, `isVisitor = role === 'visitor'`.
**Proposed:**
- `showBuilderCTA = !user` (no logged-in user)
- `isBuilder = modes.builder`
- `isVisitor = !user`
- (current code's `isHirer` derivation if any becomes `modes.hirer`)

#### B.10j — Set/update-password redirects
`/app/set-password/page.tsx:54` and `/app/update-password/page.tsx:54`:
`window.location.href = '/employer'` (hardcoded).
**Proposed:** call the same `routeAfterAuth(user)` helper from B.2. A
hirer-only entity goes to `/employer`; a builder+hirer entity hitting these
flows likely came in via the hirer onboarding (Stripe checkout), so the
helper routes them to `/employer` correctly via the hirer-precedence rule.

### B.11 — `/client/inbox/page.tsx` mode-aware gate

Lines 12-16 currently:
```typescript
const role = user.user_metadata?.role
if (role && role !== 'client') {
  if (role === 'builder') redirect('/messages')
  if (role === 'employer') redirect('/employer/messages')
}
```

**Proposed (Batch 2 minimum):**
```typescript
const { modes } = await getEntityModes()
if (!modes.client) {
  if (modes.hirer) redirect('/messages?as=hirer')
  if (modes.builder) redirect('/messages?as=builder')
  redirect('/dashboard') // fallback for empty-mode users
}
```

Note: per the brief, full `/client` → Buyer Mode merge is Batch 4. For Batch
2, just swap to mode-aware redirects.

### B.12 — Deprecation note on `user_metadata.role` writes

Two remaining write sites after B.7 and B.8:
- `/api/inquiry/route.ts:56` — writes `role: 'client'` on lightweight-buyer
  creation. **Kept** through Batch 2; addressed in Batch 4.
- (anywhere else?) — pre-flight grep §D.1 confirms only `inquiry` writes
  `client` and only `webhooks/stripe` writes `employer`. Stripe write removed
  in B.7. Inquiry write kept until Batch 4.

After B.7 lands, `user_metadata.role` is read-only legacy except in the
inquiry path. The `getEntityModes()` helper still reads `metaRole` for the
`modes.client` derivation (legacy support) and the `modes.admin` derivation
(operator identity). Once Batch 4 merges client into buyer-only-entity,
`modes.client` derivation also drops out.

---

## C. Out of scope (explicit re-confirmation)

- **Terminology rename** ("Employer" → "Hirer/Buyer"). The new helper uses
  `modes.hirer` but ROUTES, COPY, AND DB SCHEMA names still say "employer".
  Batch 3.
- **`/join` 4-card router and buyer-only entity signup.** Batch 4.
- **`employer_profiles` consolidation into entities** + Buyer Mode profile
  shape. Later batch.
- **RLS rollout** (Path A: refactor remaining client-side anon reads to
  server, then enable RLS with policies). Separate batch alongside or after.
- **New entity types** (Team, Agency, Autonomous Agent as first-class
  entities with their own profile shapes). Later.
- **Database schema changes.** Batch 2 is code-only. The
  `user_metadata.role` field stays in `auth.users` rows (we just stop writing
  it from the Stripe webhook and stop reading it for routing in most places).
  Stored `post_comments.author_role` field stays (B.9 only changes new-write
  logic).
- **Removing `auth.users` rows that have `role='employer'` stamped today.**
  Existing employers don't need re-stamping; `modes.hirer` is derived from
  subscription anyway.

---

## D. Pre-flight verification — single-role consumer inventory

Exhaustive grep across `src/` at HEAD `f219f1d`. **25 file-level consumers**
classified by category.

### D.1 — All `user_metadata.role` and `metaRole` consumers

| File:lines | Category | What it does |
|---|---|---|
| `src/lib/user.ts:3,7,50-58` | TYPE CONTRACT + computed shape | `UserRole` union; `getResolvedUser()` cascade |
| `src/middleware.ts:111,113,122-123,131` | ROUTING | 3 redirect blocks (builder/employer/client) |
| `src/app/auth/callback/page.tsx:24,32,38,65,70,72` | ROUTING | hash + no-hash post-login |
| `src/app/login/actions.ts:58,60,64` | ROUTING | server-action post-login |
| `src/app/components/NavBar.tsx:28,46,56,117,134,193,220` | UX FORK | nav arrays + setNavUser + messages href |
| `src/app/api/comments/route.ts:25,29` | STORED FIELD WRITE | `author_role` on insert |
| `src/app/api/messages/route.ts:51,55` | DATA FORK | conversation query side |
| `src/app/api/messages/unread/route.ts:15,19` | DATA FORK | unread count side |
| `src/app/api/hire-confirm/route.ts:30-31` | STORED FIELD (query-param, not metaRole) | which side confirmed |
| `src/app/api/webhooks/stripe/route.ts:46` | STORED FIELD WRITE | sets `role='employer'` on new user |
| `src/app/api/inquiry/route.ts:50,56` | STORED FIELD WRITE | sets `role='client'` on new user |
| `src/app/signup/page.tsx:170,182` | UX FORK | toggle conditionals |
| `src/app/feed/[id]/PostComments.tsx:96-97` | UX FORK (reads stored `author_role`) | badge label/color |
| `src/app/feed/[id]/FeedPostCTA.tsx:32` | UX FORK | hide CTA if employer |
| `src/app/feed/[id]/page.tsx:8,81` | DATA FETCH | `getResolvedUser` consumer + role check |
| `src/app/u/[username]/contact-check.ts:1,4,7` | UX FORK | contact-button visibility |
| `src/app/u/[username]/page.tsx:2,79` | DATA FETCH | `getResolvedUser` consumer (no role read) |
| `src/app/company/[slug]/page.tsx:4,48-51` | UX FORK | 3 derivation flags |
| `src/app/jobs/page.tsx:22,48` | UX FORK + DATA FETCH | role decl + builder-applied fetch |
| `src/app/jobs/[id]/page.tsx:53,61` | UX FORK + DATA FETCH | same pattern |
| `src/app/jobs/JobsClient.tsx:233-234` | UX FORK (client-side) | isBuilder/isEmployer flags |
| `src/app/jobs/[id]/JobDetailClient.tsx:19-20` | UX FORK (client-side) | isBuilder/isEmployer flags |
| `src/app/client/inbox/page.tsx:12,14-15` | ROUTING | gate redirects |
| `src/app/set-password/page.tsx:54` | ROUTING (hardcoded) | post-update → /employer |
| `src/app/update-password/page.tsx:54` | ROUTING (hardcoded) | post-update → /employer |

**Total: 25 consumer surfaces.** Matches the brief's "~25 surfaces" estimate.

### D.2 — `getResolvedUser()` callers (exhaustive)

| Caller | Reads `.role`? | Reads `.modes`-equivalent? |
|---|---|---|
| `src/app/u/[username]/contact-check.ts:4` | Yes | `hasSubscription` |
| `src/app/u/[username]/page.tsx:79` | No | `hasSubscription` |
| `src/app/feed/[id]/page.tsx:81` | Yes | — |
| `src/app/company/[slug]/page.tsx:48` | Yes | — |

4 callers total. Each needs surgical migration to `getEntityModes()`. All
read either `.role` (4 sites) or `.hasSubscription` (2 sites) — both
preserved in the new shape.

### D.3 — Messages B+ consolidation feasibility

Confirmed structurally feasible:
- Both pages share the exact same `timeAgo` helper (24 lines, identical)
- Both pages share the same two-pane conversation list + thread layout
- Both pages share Realtime subscription pattern on `messages` table
- Diffs are: (a) `employer/messages` uses `useSearchParams` + Suspense for
  `?new=<profile_id>`; (b) conversation card show-the-other-side data
  (builder vs employer profile fields); (c) `/messages` shows `hire-confirm`
  status banners that `/employer/messages` doesn't

The diffs are all surface-level rendering choices that swap on
`as === 'hirer' | 'builder'`. No structural blocker.

### D.4 — Subscription gates on supposedly-middleware-protected pages

Verified page-level gates exist independently of middleware redirects:

| Page | Gate | Verified at |
|---|---|---|
| `/employer/page.tsx` | `if (!sub) redirect('/#pricing')` | Line 20 |
| `/post-job/page.tsx` | `if (!sub) redirect('/#pricing')` | Line 28 |
| `/dashboard/page.tsx` | No subscription gate (any auth user) | — |

Deletion of middleware redirects (B.1) does NOT introduce a gating
regression for the paid surfaces. The only question is `/dashboard` for
"employer-only" users — but that's the entire point of composable modes:
hirer-mode-active entities SHOULD be able to see `/dashboard` (their builder
side if they have one) or land there cleanly if they don't.

### D.5 — `/messages` regression check after middleware redirect removal

Today: a `client`-mode user typing `/messages` directly gets redirected to
`/client/inbox` by middleware.

Post-refactor: they hit `/messages?as=builder` (default), the API returns
empty conversations (they have no `profile.id` to match `builder_profile_id`),
they see an empty state. **Mild UX regression** — they see "No conversations
yet" instead of being routed to their actual inbox.

**Mitigation in B.11:** the `/client/inbox` mode-aware gate already covers
the reverse direction (client tries to access /client/inbox without
modes.client → gets routed). Add the **complementary forward gate** to the
unified `/messages` page: if a user has ONLY `modes.client` (no builder, no
hirer), redirect them to `/client/inbox` from the unified page. Clean,
mode-aware, preserves the user's expected destination.

---

## E. Helper return shape — LOCKED to booleans-per-mode (2026-05-22)

**Resolution:** `modes: { builder, hirer, client, admin }` (booleans).
Canonical shape defined in §B.0 above.

```typescript
modes: {
  builder: boolean
  hirer: boolean
  client: boolean
  admin: boolean
}
```

Usage pattern:
```typescript
if (modes.hirer) ...
if (modes.builder && modes.hirer) ...           // both modes
if (!modes.builder && !modes.hirer && !modes.client) ... // visitor-like
```

**Rationale (locked):**
- Mode set changes are RARE (every change is a roadmap-level decision —
  M2 brings buyer-only, later batches bring team/agency/agent). Forcing the
  team to update the type each time is appropriate friction.
- "Any of" checks are infrequent in this codebase; "single mode" checks
  dominate.
- TypeScript-friendliness is high-value given the audit found ~25 surfaces
  touching this — type-driven refactors are safer; `modes.hireer` errors at
  compile time, `modes.includes('hireer')` would not.
- Idiomatic React prop-passing: `<NavBar modes={modes} />` is clear.

**Considered and rejected:** array-of-mode-strings (`modes: Mode[]` with
`Mode = 'builder' | 'hirer' | 'client' | 'admin'`). Rejected because of the
compile-time-typo risk against `.includes()` and the weaker IDE autocomplete.
Either would have been implementable without rework; this is a deliberate
trade-off in favour of type safety over array ergonomics.

---

## F. Cross-cutting concerns

### F.1 — Realtime / RLS interaction

Supabase Postgres-Changes Realtime subscriptions (used by `/messages` and
`/employer/messages` today) currently work because RLS is permissive on
`conversations` and `messages`. Batch 2's `?as=` route param doesn't change
Realtime behavior — client-side `supabase.channel(...).on('postgres_changes',
...)` still subscribes to the same tables.

**Future RLS rollout caveat:** when RLS gets enabled with proper policies,
the Realtime subscription filter must match the policy (e.g., a builder-side
Realtime channel must filter on `builder_profile_id = current_profile_id`).
The `?as=` parameter design is forward-compatible: the channel filter can
mirror the route param. **Flagged here, not solved here** — RLS is a
separate batch.

### F.2 — Single-mode-user UX preservation

Every refactor item in §B must preserve the single-mode user's experience:
- Solo builder (no subscription): sees `/dashboard`, `/messages?as=builder`
  (which renders as just "Messages" with no tab strip), the same NavBar
  they see today.
- Solo hirer (subscription, no profile): sees `/employer`,
  `/messages?as=hirer`, same hirer NavBar.
- Both modes active: sees both surfaces, with mode-switcher UI in NavBar +
  tab strip in messages page.

The tab strip auto-hides for single-mode users. The NavBar uses
`if (modes.hirer && modes.builder)` branching that defaults to the existing
single-mode arrays when only one is active.

### F.3 — `client` mode handling in Batch 2

Per the brief, `client` stays as a mode through Batch 2; full merge into
buyer-only-entity is Batch 4. For Batch 2:
- `modes.client` derived from `user_metadata.role === 'client'` (legacy)
- `/client/inbox` redirects via B.11 (mode-aware gate)
- `/messages` mitigation per D.5 (client-only users routed to `/client/inbox`)
- `/api/inquiry` write site stays untouched (creates lightweight client users)

### F.4 — Admin handling

`modes.admin` stays as `user_metadata.role === 'admin'`. Admin is operator
identity — not transactional, not composable with other modes in any
meaningful sense (an admin doesn't simultaneously have hirer+builder modes;
admin overrides). The audit's standing principle: hardcoded admin email
check + `metaRole === 'admin'` flag is appropriate for single-operator scale.

### F.5 — Subscription product matrix

`getEntityModes()` derives `modes.hirer` from:
```typescript
hasSubscription = subscription !== null
  // where subscription has product='full_access' AND status='active'
  // AND (expires_at IS NULL OR expires_at > NOW())
```

`/post-job` accepts `product IN ('job_post', 'full_access')`. **Question for
the operator:** should `modes.hirer` be true for a `job_post`-only
subscription (one-off job posting, not full hirer dashboard access)? Current
behaviour treats `job_post` as NOT hirer (only `/post-job` works; `/employer`
redirects to `/#pricing`). **Recommendation: preserve current behaviour** —
`modes.hirer` requires `full_access`. `job_post` is a transactional
purchase, not mode activation. Surface for confirmation at §H.

---

## G. Out-of-scope reductions surfaced during research

- **`UserRole`-type cleanup in `auth.users.user_metadata`.** Existing rows
  have `role='employer'` or `role='client'` stamped. We're not backfilling
  or nulling. Batch 2 just stops new writes (B.7) and switches reads
  (everywhere else). Drift between metadata and derived modes is invisible
  because metadata is only read for `modes.client` and `modes.admin` going
  forward.
- **`post_comments.author_role` historical values.** Not migrated. B.9
  changes new-write logic only.
- **Routing precedence question: builder+hirer entity — which dashboard is
  "primary"?** Per the 2026-05-20 standing decision in `SESSION_2026-05-19_DECISIONS.md`
  "cater to all 4 excellently; money-aware prioritization": the paid side
  gets the default. So `routeAfterAuth()` priority should be:
  `client > hirer > builder > admin (top precedence)`. Surface for
  confirmation at §H — the priority order is operator-visible and worth
  ticking explicitly.

---

## H. Approval gate (operator signs off explicitly per item)

Operator: tick each item before any execution.

**Design decision (THE key one):**
- [x] E — Helper return shape: **LOCKED to (i) booleans.** E-ii rejected.

**Refactor items:**
- [x] B.0 — `src/lib/user.ts`: replace `UserRole` + `getResolvedUser()` with
        `EntityModes` + `getEntityModes()`. Rename, don't alias-then-delete.
- [x] B.1 — `src/middleware.ts`: delete the 3 role-based redirect blocks
        (lines 111-138). Keep content-negotiation + auth-required gate.
- [x] B.2 — `src/app/auth/callback/page.tsx`: unify hash + no-hash paths
        through single `routeAfterAuth()` helper. Closes the subscription-
        fallback bug.
- [x] B.3 — `src/app/login/actions.ts`: same `routeAfterAuth()` helper.
- [x] B.4 — `/api/messages` + `/api/messages/[id]` + `/api/messages/unread`:
        `?as=builder|hirer` query param replaces role-branching.
        `defaultMode()` priority mirrors `routeAfterAuth()`: client > hirer >
        builder.
- [x] B.5 — Consolidate `/messages` + `/employer/messages` into unified
        tabbed page. **LOCKED: 308-redirect stub at `/employer/messages`.**
- [x] B.6 — `src/app/components/NavBar.tsx`: mode-aware nav arrays. Combined
        unread badge.
- [x] B.7 — `/api/webhooks/stripe/route.ts`: remove `role: 'employer'` field
        from `user_metadata` write on new-user creation. Keep `password_set:
        false`.
- [x] B.8 — `src/app/signup/page.tsx`: remove builder/employer toggle.
        **LOCKED: preserve discreet "Hiring instead?" link** pointing to
        `/#pricing`.
- [x] B.9 — `/api/comments/route.ts`: derive new `author_role` from
        `getEntityModes()`. Leave historical rows alone.
- [x] B.10 — Page-level branches: 10 surfaces migrated per the per-surface
        plan above. **B.10e approved as a deliberate UX semantics change**
        (`FeedPostCTA` hides for hirer-only entities; builder+hirer entities
        SEE the CTA — change to be flagged explicitly in the commit message).
- [x] B.11 — `/client/inbox/page.tsx`: mode-aware redirect gate.
- [x] B.12 — `user_metadata.role` write deprecation noted; inquiry write
        site stays through Batch 4.

**Cross-cutting confirmations:**
- [x] F.5 — `modes.hirer` requires `full_access` subscription; `job_post`-
        only purchase does NOT activate hirer mode.
- [x] G — `routeAfterAuth()` priority order: `admin > client > hirer >
        builder`. (Admin top because operator override; client second because
        client users typically have nothing else; hirer over builder because
        paid-side gets the default per 2026-05-20 standing principle.)
        `defaultMode()` in B.4 messaging context mirrors this priority
        (excluding admin, which doesn't apply to messaging).

**Operator approval: granted 2026-05-22 — all items approved as a single
pass. §E locked to (i) booleans. B.5 locked to 308-redirect stub at
`/employer/messages`. B.8 locked to preserving the discreet "Hiring
instead?" link on `/signup`. B.10e is a deliberate UX semantics change to
be called out explicitly in the commit message. Single-commit execution
plan per §J.**

---

## I. Code edit + commit plan

### One commit (recommended) or two-commit?

This batch touches 25 surfaces across auth/messaging/routing. There's a
tension between:
- **Single commit:** atomic — every site updates together, no
  half-migrated state, no inter-commit type errors. Larger diff (~600-900
  LOC). Single revert if anything fails.
- **Two-commit (type contract first, callers second):** smaller diffs per
  commit, but the first commit can't compile if `getResolvedUser` callers
  still reference `.role`. Would require a temporary alias on `ResolvedUser`
  during the migration window.

**Recommendation: single commit.** The whole refactor is a coherent unit
(it's "the modes refactor"), the type system catches every consumer at
compile time (no runtime surprise), and `tsc --noEmit` + `npm run build`
green is sufficient evidence the refactor is complete.

### File-by-file edit list

| Order | File | Change |
|---|---|---|
| 1 | `src/lib/user.ts` | New `EntityModes` + `getEntityModes()`. Delete old `UserRole` + `getResolvedUser`. |
| 2 | `src/middleware.ts` | Delete the 3 role-based redirect blocks. |
| 3 | `src/lib/auth-routing.ts` (NEW) | Extract `routeAfterAuth(user)` helper used by callback + login action + set/update-password. |
| 4 | `src/app/auth/callback/page.tsx` | Use `routeAfterAuth()`. |
| 5 | `src/app/login/actions.ts` | Use `routeAfterAuth()`. |
| 6 | `src/app/api/messages/route.ts` | `?as=` param + dual-mode dispatch. |
| 7 | `src/app/api/messages/[id]/route.ts` | Permission check uses `modes` instead of role string. |
| 8 | `src/app/api/messages/unread/route.ts` | `?as=` param + aggregated count when no param. |
| 9 | `src/app/messages/page.tsx` | Becomes unified tabbed `<MessagesPage />`. |
| 10 | `src/app/employer/messages/page.tsx` | 308 stub to `/messages?as=hirer`. |
| 11 | `src/app/components/NavBar.tsx` | Mode-aware arrays. |
| 12 | `src/app/api/webhooks/stripe/route.ts` | Remove `role: 'employer'` field. |
| 13 | `src/app/signup/page.tsx` | Remove toggle; preserve discreet hire CTA. |
| 14 | `src/app/api/comments/route.ts` | New `author_role` from modes. |
| 15 | `src/app/feed/[id]/page.tsx` | `getEntityModes()` + `modes.builder` check. |
| 16 | `src/app/feed/[id]/FeedPostCTA.tsx` | `modes.hirer && !modes.builder` check (B.10e). |
| 17 | `src/app/u/[username]/contact-check.ts` | `modes.hirer` check. |
| 18 | `src/app/u/[username]/page.tsx` | `getEntityModes()` consumer. |
| 19 | `src/app/company/[slug]/page.tsx` | `modes` + `!user` derivations. |
| 20 | `src/app/jobs/page.tsx` | `getEntityModes()` + `modes.builder` check. |
| 21 | `src/app/jobs/[id]/page.tsx` | Same. |
| 22 | `src/app/jobs/JobsClient.tsx` | Receives `modes` (or specific booleans) as prop. |
| 23 | `src/app/jobs/[id]/JobDetailClient.tsx` | Same. |
| 24 | `src/app/client/inbox/page.tsx` | Mode-aware gate. |
| 25 | `src/app/set-password/page.tsx` | `routeAfterAuth()` instead of hardcoded `/employer`. |
| 26 | `src/app/update-password/page.tsx` | Same. |
| 27 | `src/app/feed/[id]/PostComments.tsx` | No change (reads stored `author_role`). |

Total: 26 file edits + 1 new file (`src/lib/auth-routing.ts`).

### Verifications during the commit

- `npx tsc --noEmit` clean — the type system catches every missed migration
  site.
- `npm run build` clean — Next.js compilation + static analysis.
- Spot-check manual: log in as a test account, verify NavBar renders,
  `/messages` loads, `/dashboard` loads, `/employer` loads if hirer. The
  audit found no real paid users; spot-check uses a test signup.

---

## J. Execution sequence (gated on §H approval)

**Single commit.** After approval:

1. Branch off `main` at HEAD `f219f1d` (the post-Batch-1 SHA, or whatever
   `main` points to at execution time).
2. Apply all 27 file changes per §I list.
3. `npx tsc --noEmit` clean.
4. `npm run build` clean.
5. Local dev smoke test: dev server, sign in, navigate the surfaces above.
6. Commit, push.
7. **Vercel deploy gate (lighter than Batch 1's §J gate):** Vercel build
   green on main = sufficient. No Stripe end-to-end gate this time (the
   webhook change in B.7 is removing a `user_metadata` write, not touching
   subscription row creation; the only failure mode is "hirer signup
   succeeds but no hirer-mode signal" — but `modes.hirer` derives from the
   subscription row, which IS still being inserted, so the signal works
   correctly post-refactor without `user_metadata.role` being set).
8. Discovery doc updated with execution timestamp + SHA + verification
   confirmation.

---

## K. Verification — what 'green' looks like

- `npx tsc --noEmit` clean — every consumer migrated; type system enforces it.
- `npm run build` clean.
- `/messages` works for solo builder (no tab strip visible).
- `/messages?as=hirer` works for solo hirer (no tab strip visible).
- `/messages` works for both-modes entity (tab strip visible, default tab
  picks based on `defaultMode()` ordering).
- `/employer/messages` 308-redirects to `/messages?as=hirer`.
- `/dashboard` loads for both-modes entity without redirect ping-pong.
- `/employer` loads for both-modes entity without redirect ping-pong.
- NavBar shows correct nav arrays per mode + combined unread badge.
- Auth callback post-login routes correctly for: solo builder → /dashboard;
  solo hirer → /employer; both modes → /employer (per priority order); admin
  → /admin; client → /client/inbox.
- Vercel build green on main.
- Stripe webhook still creates subscription rows (the load-bearing behavior
  for hirer mode); the absence of `user_metadata.role='employer'` doesn't
  break anything because `modes.hirer` derives from the subscription row.

---

## L. Reversal

**Code-only refactor** — `git revert <SHA>` is full reversal. No DDL, no
data migration, no external service state change.

The only thing that's "different post-revert" is any new `auth.users` row
created during the refactor's deploy window won't have
`user_metadata.role='employer'` stamped (because B.7 stopped writing it).
That's fine — the helper at the time of revert would read those users via
`getResolvedUser` and derive `role='employer'` from the subscription
fallback. No data corruption.

---

## M. Risks / honest notes

1. **Biggest refactor in the roadmap.** 27 file edits, 25 consumer surfaces.
   Type system catches consumer-side errors (TypeScript strict-null-checks +
   the removal of `UserRole` would error at every missed site). Build catches
   route-level errors. Smoke test catches UX regressions.

2. **No real paid users currently** (per audit + operator confirmation in
   Batch 1's §J skip). The Stripe webhook change (B.7) is low-risk in
   practice. Production-impact is also low overall — but the refactor
   touches load-bearing surfaces, so verification rigor stays high.

3. **Realtime subscriptions** are out of scope this batch. They keep working
   because RLS is currently permissive. When RLS rollout lands, channel
   filters must match policies — flagged in F.1, not solved here.

4. **B.10e — `FeedPostCTA` semantics change.** Today: any employer hides
   the CTA. Locked: only hirer-only entities hide the CTA. A builder+hirer
   entity sees the CTA (their builder side is the relevant identity for a
   feed post). Deliberate UX improvement, approved at §H, called out
   explicitly in the commit message.

5. **Client mode is partial-state.** Through Batch 2, `client` is a mode
   derived from `user_metadata.role`. Batch 4 absorbs it into buyer-only
   entity primitive. The doc explicitly notes this.

6. **`/employer/messages` 308 stub.** If hard-deleted instead of stubbed,
   anyone with a bookmark gets a 404. Stub is 5 lines; recommendation is
   stub.

7. **Routing priority order** (`admin > client > hirer > builder`) is
   load-bearing for the both-modes-active common case (a builder+hirer
   entity defaults to `/employer` post-login). Locked at §H; `defaultMode()`
   in messaging context mirrors it (excluding admin). Aligned with the
   2026-05-20 standing principle (paid-side gets defaults).

8. **Edge case: a user with NO modes but a logged-in session.** This
   shouldn't happen post-Batch-2 (signup creates either a builder profile
   directly or a hirer subscription via Stripe), but if it does (e.g., a
   user who signed up but bailed before completing either path), they hit
   `/dashboard` (the fallback). Acceptable — same as current behaviour.
