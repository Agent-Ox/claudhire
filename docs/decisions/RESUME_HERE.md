# Resume guide for next Claude chat

You are picking up multi-session work on ShipStacked. Operator = Thomas Oxlee.
Architecture: three-party loop (operator + architect-Claude in chat + terminal Claude in ~/shipstacked).

## Read these files in order before responding:

1. `AGENTS.md` — invariants (especially: published-gate, additive-not-subtractive, Supabase Dashboard for DDL)
2. `docs/decisions/SESSION_2026-05-19_DECISIONS.md` — locked yardstick (Customer/Entity/Mode/Role spec, with UPDATE 2026-05-22)
3. `docs/decisions/SESSION_2026-05-23.md` — latest session journal (most recent date)
4. `docs/decisions/AUDIT_alignment_5_bucket.md` — current platform map (CORE/WEAK/LEGACY-KILL/MISSING/AMBIGUOUS)
5. `docs/decisions/DISCOVERY_batch7_quality_scoring.md` — next planned batch (Formula A vs D pending). NOTE: this + 3 other session docs are UNTRACKED on disk as of 2026-05-23 — confirm they exist / commit them.

## Operating discipline:

- Audit first, kill first, patch only what stays
- Read-only verification needs no gate
- Calibrated friction: reversible single-file ships on operator approval; irreversible/DDL/structural needs full pre-flight gate
- Never propose decisions based on assumptions; verify against code/DB
- FK-check is mandatory before any table kill (lesson from 2026-05-23: a Dashboard-applied table + FK chain were invisible to migration-scan)
- Research-first methodology: for any design problem, web-search established 
  solutions BEFORE first-principles design. Billions has been spent solving 
  these problems already; use / adapt / copy from real platforms (GitHub, 
  Stack Overflow, LinkedIn, etc.) rather than reinventing. First-principles 
  design is appropriate only for genuinely novel problems unique to this 
  platform. See SESSION_2026-05-19_DECISIONS.md "Methodology principle — 
  Research-first, then adapt" for full discipline.

## Communication style:

- Short answers (operator typically on mobile)
- Plain English, no walls of text
- Questions numbered at end if any
- Reflect findings back before recommending
- One question per turn when possible
- "Probably" is a red flag — operator does not allow action on probably

## Three-party loop mechanics:

- Architect-Claude (this chat) does analysis + drafts instructions
- Operator relays between this chat and terminal Claude
- Terminal Claude (in ~/shipstacked) executes
- Terminal Claude's session memory has been unreliable (freezes); rely on git-tracked artifacts not its in-memory state

## Current pending work:

Read the most recent SESSION_<date>.md for the live to-do. Top of the queue at last journal close:
- Batch 7b — Quality scoring algorithm §H decision + code execution (Formula A leading)
- Path D after — Builder mode auto-badge on first verified receipt
- Path B last — Entity graph (D2/D3)

## Recovery artifacts (external, not in repo):

- `/tmp/outreach_engine_recovery_2026-05-23.sql` (outreach engine schema, dropped 2026-05-23)

## Outstanding TO-DOs (manually verify when bandwidth permits)

- **Stripe webhook lifecycle test plan execution** — see `SESSION_2026-05-23.md` "Late-late-session arc" section. Code shipped SHA `04373c7`, all events subscribed in Stripe Dashboard, but local CLI test (5 scenarios) deferred. Run before first real cancellation if possible; definitely before customer count >10. Full execution steps + acceptance criteria in the session journal.

- **British/American spelling split on `subscriptions.status`** — `/api/hirer/cancel` writes 'cancelled' (British), webhook writes 'canceled' (American). Both correctly fail the `status='active'` gate, so access-wise harmless. Tiny cleanup batch to unify (pick 'canceled' since Stripe uses American).

- **Hardcoded Stripe price ID** in `src/app/api/checkout/route.ts:7` — should move to env var. Not blocking. Refactor when bandwidth permits.

- **`current_period_end` clause duplication** — currently in canonical `getEntityModes()` only. The 9 inline `.eq('status', 'active')` checks across the codebase should consolidate into the canonical helper (separate batch).

- **Phase 1 (`11e9a31`) — agent enrichment smoke test (Block 5R §5R.5)** — NOT yet run on prod. With a real `sk_ss_` key, `POST /api/v1/builds`, wait ~30s, then confirm the receipt subject is an agent entity: `SELECT pr.id, pr.slug, pr.subject_id, e.kind, e.slug, pr.verification_level, pr.issued_at FROM proof_receipts pr JOIN entities e ON e.id = pr.subject_id WHERE pr.issued_at > NOW() - INTERVAL '5 minutes' ORDER BY pr.issued_at DESC LIMIT 5;` — expected `e.kind = 'agent'`. If `human`, Block 5R is wrong.

- **Phase 1 (`11e9a31`) — full §I cold walkthrough on prod** — NOT yet run. Verify: homepage step-03 copy (no "Velocity Score"), dashboard "Proof of Work" card, Atlas role chips on `/u/<classified-builder>`, OG image role pills, `/atlas/roles/<id>` lists ≥1 practitioner, `/join` Card 2 + Card 3 copy, junk profiles 404, `verify-agent-card.ts --base https://shipstacked.com` green. Full list in `docs/audit/DISCOVERY_phase1_foundation.md` §M.

## Deploy-time + manual verification checklist (do once, after current session ships)

These accumulated through Session N+1 — none are blocking outreach but each is a 1-2 minute check that closes a real gap.

### Vercel environment variable verification

Confirm in Vercel Dashboard → ShipStacked project → Settings → Environment Variables → Production scope:
- `SUPABASE_SERVICE_ROLE_KEY` — needed by the new `/api/builders/ranked` route (Task 2) and the webhook (Task 3). Should already exist.
- `STRIPE_SECRET_KEY` — Task 3 webhook needs to retrieve subscription.current_period_end on checkout completion
- `STRIPE_WEBHOOK_SECRET` — verified matching Stripe Dashboard live endpoint signing secret (OX agent confirmed)
- `RESEND_API_KEY` — Task 4 feedback widget needs this
- `INTAKE_NOTIFY_EMAIL` — Task 4 feedback widget routes to this

If any are missing in Vercel but present in `.env.local`, copy them over.

### Live behavior smoke tests (after Vercel deploy completes)

Run these in order, ~5 min total:

1. **Formula E ranking live** — hit `https://shipstacked.com/api/builders/ranked?limit=6` in browser. Expect: `{builders:[...]}` JSON with 6 builders. If 500 → env var missing.
2. **Homepage + /hirers builder grids** — load each, confirm 6 builder cards render (no infinite loading state, no empty grid).
3. **/talent anonymous top-6** — load while logged out. Confirm top-6 order: ryangrant144, aniketaslaliya801, janwinum9, sumitdongardive9, sunnyzheng606, joedias995. Confirm "Top ranked" sort label (not "Velocity"), "Ranked by proof of work" header (not "✓ Verified builders").
4. **/talent as paid hirer** — log in with an existing test subscription email. Scroll to confirm "Not yet ranked" badge appears on sub-threshold cards.
5. **Hirer feedback widget** — load `/hirer` as a paying hirer, scroll to the feedback card at the bottom. Submit a test message ("test from launch verification, please ignore"). Confirm it lands in `INTAKE_NOTIFY_EMAIL` inbox within ~30 seconds.

If any step fails, that's the priority bug to fix before outreach.

### Stripe webhook lifecycle test (deferred — see SESSION_2026-05-23.md)

Full 5-scenario Stripe CLI test plan deferred to a later session. Code shipped SHA `04373c7`, events subscribed in Stripe Dashboard, signing secret confirmed matching. Run before first real cancellation if possible; definitely before customer count >10.

### Optional cleanup items (do anytime — none blocking)

- 6 ambiguous-item decisions from `AUDIT_alignment_5_bucket.md`: `/client/inbox`, `/api/client-magic-link`, `/get-found/[id]`, `/api/jobs/xpost`, `claim_submissions` retention, `hire_confirmations` retention
- batch5-test profile cleanup (below-threshold test row sitting in published profiles)
- British/American spelling unification on `subscriptions.status`
- Hardcoded Stripe price ID → env var refactor
- Consolidate 9 inline `status='active'` checks into canonical `getEntityModes()`
- **`/hirer` vs `/hirers` route collision** — singular = paid dashboard, plural = marketing landing. Typo-prone for users; both routes exist and serve different purposes. Defer naming consolidation; for now both stay as-is. Future: consider renaming dashboard to `/dashboard/hirer` or similar.

## Known issues

- **`getRankedBuilders` derives `atlasClusters` from `atlas_inferred` only** (not `atlas_confirmed`). `/api/v1/talent/search` (Phase 3) inherits this behavior for parity with the `/talent` UI. Phase 6 (Atlas wiring) revisits.

## Analytics

- **Tool:** PostHog (free tier, cookieless mode, US region)
- **Dashboard:** https://us.posthog.com (project: ShipStacked)
- **Project API key:** stored in `NEXT_PUBLIC_POSTHOG_KEY` (`.env.local` + Vercel Production scope)
- **Events instrumented:** `talent_page_viewed`, `profile_viewed`, `subscribe_clicked`, `message_button_clicked`, `feedback_submitted`, `hirer_dashboard_viewed`
- **GA4 removed** during Task 5 (replaced by PostHog single-tool model — measurement ID `G-Z6MBHJVV7S` no longer wired)
- **Session replay:** intentionally disabled (privacy-aligned, no consent banner)
