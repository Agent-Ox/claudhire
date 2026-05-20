# DISCOVERY — Composable-modes refactor + single-role middleware bug fix

Date: 2026-05-20. Full pre-flight gate (auth-critical refactor; fixes a live
shipping bug; no DDL).

## GOAL

Land the locked composable-modes model (UPDATE (c) of 2026-05-19 decisions)
in code, and fix the live shipping bug it surfaces. The model is already
written down; the codebase still assumes single-role-per-user.

## GROUNDED IN THE STRESS-TEST (read-only verification, 2026-05-20)

- Free/paid line already matches the locked spec. NO copy or product-behavior
  change required.
- Hirer mode is already shipped via `subscriptions` (product='full_access').
  NO DDL needed.
- Builder mode is already derivable from `profiles.verified` +
  `proof_receipts` count. NO DDL needed.
- Team mode is the ONE mode that needs new schema — deferred to D2/D3
  (where `entity_relationships` arrives). Out of scope here.
- The blocker is a single-role assumption in ~5 files keyed on
  `auth.users.user_metadata.role` (a single-valued string).

## THE LIVE BUG (must fix; not hypothetical)

If an existing Builder pays $199 to enable Hirer mode using their existing
email: the webhook correctly leaves their `user_metadata.role='builder'`
alone (it only stamps role on first-ever account creation). But
`src/middleware.ts:110-117` redirects any `metaRole==='builder'` user away
from `/employer/*` to `/dashboard`. They pay and cannot access what they
paid for. Live in production today against the locked spec.

Also: `src/app/auth/callback/page.tsx` has TWO paths (hash and no-hash) —
the hash path correctly falls back to a subscription check (line 41-50:
`sub ? '/employer' : '/dashboard'`), the no-hash path hard-routes on
metaRole with NO subscription fallback. Both must share one mode-aware
helper; the divergence IS part of the bug.

## SCOPE — refactor, not rewrite

EDIT (5 files):
1. `src/lib/user.ts` — change `getResolvedUser()` return shape from
   `{ role: UserRole }` to `{ modes: { builder: bool, team: bool, hirer: bool } }`.
   Derive: builder = verified && (proof_receipts count > 0); hirer = active
   full_access subscription not expired; team = false (Phase 1, until D2/D3).
   Keep a back-compat `role` field for any caller not yet migrated, computed
   from modes.
2. `src/middleware.ts` — replace single-`metaRole` redirects with capability
   checks. `/employer/*` and `/post-job` require `modes.hirer`, NOT
   `metaRole==='employer'`. `/dashboard` reachable by anyone with
   `modes.builder` (does NOT redirect hirers away). `/client/*` unchanged
   (client is a separate inbound-inquiry role, not a builder/hirer mode).
3. `src/app/auth/callback/page.tsx` — landing resolution by modes; both
   hash and no-hash paths unified through the same mode-aware helper (the
   live bug fix). See ROUTING DECISION below for the default.
4. `src/app/api/webhooks/stripe/route.ts` — on existing-user-pays path
   (already correctly skips role overwrite, line 42-47), confirm and add a
   comment marking it as the composable-mode-preserving branch. New-user-pays
   path may still stamp `role:'employer'` as the BEST-GUESS-default until they
   add Builder activity — that's acceptable; modes derivation in `user.ts`
   will read subscription + proof_receipts independently of the metadata stamp.
5. `src/app/components/NavBar.tsx` — change `role` type from
   `'employer' | 'builder' | 'admin' | 'client' | null` to a modes shape.
   Surface mode-aware items: show "Dashboard" if `modes.builder`, show
   "Hire / Employer" if `modes.hirer`. If both, show both. One-click
   switching between the two surfaces is NON-OPTIONAL — without it the
   /employer default becomes a single-role assumption in disguise.

HYGIENE (in same refactor; not optional):
- Consolidate the 12+ inlined `subscriptions WHERE email=... AND
  product='full_access' AND status='active' AND (expires_at IS NULL OR
  expires_at > now)` queries to use `getResolvedUser()` / a single
  `getModes()` helper. Half-refactor = drift; this MUST be done as part of
  the same change.

## ROUTING DECISION (resolved)

Builder+hirer landing: `/employer` is the default. Reasoning: matches
existing code precedent (auth/callback line 50: `sub ? '/employer' :
'/dashboard'`) and the locked "money-aware prioritization" principle (paid
surface gets default landing; free supply stays one click away). Not a
pigeonhole — NavBar MUST surface BOTH /dashboard and /employer for users in
both modes, one click apart, mode-aware. Frictionless switching is
non-optional; without it the default becomes a single-role assumption in
disguise.

Both auth/callback paths (hash + no-hash) MUST share one mode-aware helper —
the live bug is partly that they don't. Unification through
`getResolvedUser()` / `getModes()` is part of the refactor scope.

## NON-GOALS (explicit)

- NO DDL. No `entity_modes` table, no new columns. All modes derived.
- NO Team mode implementation (deferred to D2/D3).
- NO auto-enrichment changes (separate gated step 6).
- NO change to the free/paid line — already matches spec.
- NO touch to `/p/<slug>`, `/talent` gating logic, or any of the enrichment
  code shipped 9ecc723.
- NO change to `profiles.role` (job-title field — different concept from
  mode).

## RISK + ROLLBACK

- Auth-critical refactor: bugs here break login, paid-access, or
  builder-access. Mitigation: ship behind exhaustive tsc + build + manual
  prod verification of all 4 access paths (unpaid builder, paid
  builder-only, paid builder+hirer, client) BEFORE declaring done.
- Single commit, reversible by `git revert`. No data migration to undo.
- The live bug means delay is also a cost: every day an existing builder
  could pay and hit the bug.

## SHIP LOOP (full pre-flight)

1. Apply refactor across the 5 files + the inline-query consolidation.
2. `npx tsc --noEmit` && `npm run build`.
3. Grep verify: no remaining inline `subscriptions WHERE email=... AND
   product='full_access'` outside the new helper (the consolidation is real).
4. HALT. Report: diffs per file, tsc, build, grep. Operator reviews.
5. Operator approves push.
6. Prod-verify 4 access paths:
   (a) unauth visitor → /talent shows 6-profile teaser (unchanged)
   (b) auth'd unpaid builder → /dashboard reachable, /employer/* redirects
   (c) auth'd paid hirer-only → /employer reachable, /dashboard not blocked
   (d) auth'd paid builder+hirer → BOTH /dashboard AND /employer/* reachable
       AND NavBar shows both items (this is the bug-fix verification — must
       work, must show both nav surfaces)
