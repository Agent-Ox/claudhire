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
2. Canonical message rework against the 4-type user model (define 4 flow voices
   + router; D4 → final).
3. Copy-fix diff set (26+5), operator-approved strings, via ship loop.
4. 18-individual enrichment build (discovery doc + diff).
5. D2/D3 company/agent graph build (separate discovery doc).
6. Backlog: intake seam, write-path consolidation, hygiene.

## UPDATE 2026-05-19 — User model finalized

D9 — User model = 4 entity types, not 2:
  1. Solo builder (human) — supply
  2. Team / agency / studio — supply (D3)
  3. Employer / company — demand ($199)
  4. Agent — supply, Phase 1 only
Each is a distinct signup flow.

D10 — Linking model = LinkedIn-style. Entities sign up independently and are
complete alone. Links (person↔company, agent↔sponsor, team↔members) are
OPTIONAL, added AFTER signup, never a signup gate, asymmetric, and tolerate the
other side not existing yet (pending/unclaimed link resolves when it does).
Reference verbatim for the build: "do it like LinkedIn person↔company."

D11 — Agent type, phased:
  - Phase 1 (buildable): Agent-as-Supply, linked to a human/team, as a sub-flow
    that EXTENDS the existing agent path (AgentOnboarding.tsx / /api/v1/profile)
    — must be verified and extended, NOT duplicated.
  - Phase 2 (parked, recorded not specced): autonomous agent — wallet/DID
    identity, on-chain auth, Stripe/Moltbook/RentAHuman history import. Real
    per 2026 market (Stripe agent wallets, RentAHuman, Moltbook live) but
    greenfield. Do not design until Phase 1 ships.

D12 — Velocity Score sub-scores for team/agent: CUT from Phase 1. Velocity
Score is flagged-vanity (architecture audit). Do not extend a weak metric to
new entity types until the Velocity Score question is resolved (backlog).

D4 STATUS CHANGE: D4 (canonical message) was written for the OLD 2-type model.
It is now PROVISIONAL, pending rewrite against the 4-type model (D9). The
copy-fix set must NOT be applied against D4 as-is. Canonical message rework is
the next gated step before any copy fixes ship.

D2/D3 build note: the 4 flows are designed against ONE linked entity graph
(D10), not 4 standalone forms. Separate gated discovery doc. Draft signup flows
(operator-supplied 2026-05-19) are input to that doc, not the spec.

## UPDATE 2026-05-19 (b) — Canonical 4-flow model + voices (D4 FINAL)

STANDING COPY RULE: every live user-facing claim must match shipped backend
capability at publish time. Vision lives in the roadmap; the homepage lives in
the present tense. Router cards are real; claims are phase-honest and evolve as
backend ships. ("Copy promised what wasn't built" = the original disconnect.)

ROUTER (/join — sorts, does not pitch). Four cards. Click → matched flow +
voice. After account creation → "Add linked profiles?" (LinkedIn-style per D10:
optional, post-signup, never a gate).

- Card 1 Solo AI Builder — "I build and ship AI work." → personal profile + agent helpers
- Card 2 Team / Agency / Studio — "We're a team or agency delivering AI implementation." → collective profile + linked members
- Card 3 Employer / Company — "We're hiring AI talent and teams." → company page + jobs + marketplace
- Card 4 Agent — "I'm an agent working on behalf of a builder or team." → agent identity linked to a human/team principal

THE 4 VOICES

1. Solo builder — direct, indie, builder-proud.
   Headline: "Welcome, builder. Let's make your real work impossible to ignore."
   - "Tell us what you ship. We'll handle the rest."
   - "Drop your GitHub or first build — your agent can take it from here."
   - "Your verified work goes live the moment you post your first real outcome."
   (Velocity Score removed per D12.)

2. Team / agency — confident operator, professional, still builder-minded.
   Headline: "Show the world what your team actually delivers."
   - "Build your collective identity. Link your builders."
   - "Add case studies that show real outcomes — not headcount."
   - "Your team's delivery, shown through real shipped work."
   (No "agent fleet"/"+ agent" — Phase 2. No Velocity per D12.)

3. Employer — decisive, no-fluff, hiring manager tired of bad hires.
   Headline: "Find proven AI implementation capability — fast."
   - "Claim your company page and browse real proof of work."
   - "Post a job or search builders and teams by what they've shipped."
   - "No commissions. No résumés. Just verifiable work."
   (No "agent capability" claim — Phase 2.)

4. Agent (Phase 1) — clean, machine-native, principal-linked. Speaks to the agent.
   Headline: "Let's set you up to work on behalf of your builder."
   - "Authenticate with the API key your principal generated."
   - "You'll post builds, outcomes, and verification on their behalf."
   - "Link to your human or team sponsor — accountability stays clear."
   (Extends existing AgentOnboarding.tsx / /api/v1/profile — not a new
   mechanism. Standalone-autonomous wallet/DID copy = Phase 2, evolves here
   when backend ships.)

PHASING (D11 upgraded: COMMITTED, not parked)
- Phase 1 (build now): agent-as-supply, principal-linked, extends
  AgentOnboarding.tsx / /api/v1/profile. Card 4 copy as above.
- Phase 2 (committed roadmap, not parked): standalone hireable autonomous
  agents — wallet/DID identity, autonomous discovery/engagement. Real,
  sequenced after Phase 1. Card 4 copy EVOLVES to autonomous language when that
  backend ships — same card, phase-honest claims.

STATUS CHANGES
- D4: PROVISIONAL → FINAL (this 4-flow model is the canonical message).
- D11: "parked" → COMMITTED roadmap; copy gated to shipped capability (now a
  standing rule, see top of this section).
- SEQUENCING: step 2 (canonical message rework) = DONE. Copy-fix set (step 3)
  proceeds against THIS spec, re-tagged by flow (which of the 4 flows does each
  surface serve; does it speak that flow's voice).
