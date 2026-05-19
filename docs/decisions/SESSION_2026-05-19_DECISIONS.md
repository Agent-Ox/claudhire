# SHIPSTACKED — LOCKED DECISIONS (2026-05-19)

Single source of truth from the 2026-05-19 session. Supersedes prior positioning
docs for items below. Anything not under LOCKED is NOT decided.

## LOCKED

D1 — Positioning: Doc A. Hiring/recognition marketplace for AI-native builders.
Builders free; hirers pay ($199 Stripe, live). Verification engine = moat
underneath, the mechanism that makes "machine-verified, not self-reported" true.
Doc B ("accountability / discovery-and-classification layer") SUPERSEDED for
positioning; kept only as spec for a deferred expansion. Reasoning (operator):
"Doc A is closest to what we have and closest to revenue; the engine is built
and we must use it — Doc A positioning, engine under the hood."

D2 — Entity model (conceptual target, GREENFIELD, not built): one entity graph.
kind ∈ {human, company, agent}. operator/fleet are RELATIONSHIPS not kinds.
Entities link by membership/ownership (LinkedIn model). Verified 2026-05-19: no
link table exists; entities.kind is dormant (only 'human' ever written/read);
engine is human-exclusive (17/17 entities human). This is a separate gated build.

D3 — Agency/team = first-class builder profile CLASS, distinct from personal
profile, linked person↔company (LinkedIn model). Decision locked; build is the
D2 greenfield track, not yet scoped.

D4 — Canonical message (two-class; supersedes earlier same-day person-only pair):
- Builder/team: "Get hired for what you've already built." (solo → studio → firm)
- Company: "Hire AI talent and teams based on real work."
- Subline: "The marketplace where portfolios, demos, and shipped projects matter
  more than resumes."
- Split hero, two CTAs; builder signup forks individual vs team.
- Rationale: chosen for instant self-identification, not cleverness. Do not
  "improve" back toward clever lines.

D5 — Enrichment cohort: 18 verified individual builders. Rule: verified=true
minus founder/test thomasoxlee198. Operator confirmed (memory) none are agencies
— D2/D3 do not corrupt this cohort; agency work is additive. The 18:
olalekanridwanullah197, sunnyzheng606, vinodkrishnabanda657, ifioksundayuboh72,
sumitdongardive9, joedias995, aniketaslaliya801, avikbhanja723, nnekaewalu847,
celestinokariuki456, anantdhavale962, janwinum9, emanuelcovelli123, yuki448,
khairulanwar932, eluwaemekamichael740, ryangrant144, andreaschristodoulou643.

D6 — Item 1 shipped: H1 accountability reframe reverted, commit c08f13e, live,
prod-verified. Serving-SHA confirmation deferred to Vercel dashboard (residual).

D7 — Atlas scoping rule: the Atlas ESSAY is pure content (engine does NOT use
essay prose — verified; classifier uses only role IDs from atlas_roles table +
locked prompt). Therefore: (a) Atlas role-ID taxonomy = engine machinery, do not
touch. (b) Atlas FRAMING in marketing copy = drift, remove (Doc A wins).
(c) "28 specialist roles" marketing claims = REMOVE the claim entirely from the
3 marketing surfaces (atlas/page, claim/page, hire/page), do NOT renumber.
(d) Essay quality ("slop vs great") = separate later editorial pass, zero engine
risk, does not block shipping.

D8 — "No agencies" (employers/page.tsx:181) = DRIFT/REMOVE. Rationale: it
repelled a now-priority segment while signalling no-middleman. Replacement must
PRESERVE the no-middleman value in different words (e.g. "No recruiters. No
placement fees.") — not just delete the line.

## OPEN / GATED (not decided)

- Copy-fix set: 26 DRIFT + 5 STALE surfaces (audit 2026-05-19, 94 surfaces).
  All confirmed pure copy, zero engine imports. Each fix needs proposed
  replacement string approved by operator before write. Atlas role-count claims
  per D7(c). Folds in Item 1 residue (page.tsx:261).
- D2/D3 company/agent entity-graph build: greenfield, large, own discovery doc,
  scheduled AFTER the 18-individual enrichment build.
- 18-individual enrichment build (D5): contained, unblocked, engine-independent
  of D2 — first real code to ship after copy fixes.
- Residual: operator Vercel-dashboard glance confirming c08f13e (closes D6).

## SEQUENCING

1. Commit this doc.
2. Copy-fix diff set (26+5), operator-approved strings, via ship loop.
3. 18-individual enrichment build (discovery doc + diff).
4. D2/D3 company/agent graph build (separate discovery doc).
5. Backlog: intake seam, write-path consolidation, hygiene.
