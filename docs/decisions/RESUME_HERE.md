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
