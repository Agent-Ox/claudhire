# BENCHMARK — ShipStacked vs. established platforms (industry comparison)

Research-informed competitive benchmark. First application of the locked
**research-first methodology** (`SESSION_2026-05-19_DECISIONS.md`, added
2026-05-23): research established solutions before reasoning from scratch.

Prepared at HEAD `745a08c` on 2026-05-23. Read-only. No code, no DDL.

---

## §A — Executive summary

ShipStacked occupies a genuine whitespace: **an open-access hiring
marketplace with machine-verified proof-of-work as the ranking substrate.**
The 7 comparators cluster into two camps neither of which is where
ShipStacked sits. The *gated* camp (Toptal) achieves trust by an expensive
human admission filter — high trust, low scale, slow. The *open social*
camp (Upwork, LinkedIn, Contra, Behance) achieves scale by letting anyone
in and ranking on social/transactional signals (ratings, endorsements,
appreciations, outcome scores) — high scale, but proof is largely claimed
or peer-asserted. The *machine-verified* camp (GitHub, Stack Overflow)
proves competence from un-fakeable artifacts (signed commits, peer-validated
answers) but isn't a hiring marketplace. ShipStacked's positioning — "we
can't stop trash signing up, but we decide who gets found and in what order"
— deliberately takes **open access from the social camp + machine-verified
proof from the GitHub camp**, applied to a hiring marketplace. That
combination is unoccupied. The benchmark confirms the locked proof-of-work
scoring discipline is not novel invention but convergent industry practice
(every ranking system researched uses multi-signal, anti-gaming, threshold
gating) — which validates Batch 7b's Formula E direction. The dominant gaps
are implementation-not-concept: the ranking engine, search facets, and
entity graph are designed-but-unbuilt, not wrong.

---

## §B — Methodology

Per **Seeto.ai competitive-benchmarking framework**: 5-7 comparators
(3-4 direct + 1-2 adjacent + 1 aspirational); 3 primary dimensions
(capabilities, pricing/business model, positioning); output includes a 2x2
positioning map.

**Comparators (7, locked):**
- *Direct* (matching skilled people to work, proof-based): **Toptal**,
  **Upwork**, **Behance**, **Contra**
- *Adjacent* (different market, overlapping pattern): **GitHub**,
  **Stack Overflow**
- *Aspirational* (category leader at scale): **LinkedIn Talent Search**

**Capability clusters (11):** derived by grouping the 156-item inventory in
`AUDIT_alignment_5_bucket.md` (§1 routes, §2 APIs, §3 tables, §4 modes,
§5 features) into logical areas. Each cluster cites real audit items.

**Classification per cluster:** ALIGNED / PARTIAL / MISSING /
INTENTIONALLY-DIFFERENT / UNCLEAR. Gaps prioritized HIGH/MEDIUM/LOW by
impact on the locked spec + whether they block pending batches.

**Process note:** this is research-informed comparison, NOT feature-parity
audit. ShipStacked has 42 builders; comparators have decades and millions
of users. The goal is patterns worth adapting, not features to copy.

---

## §C — Capability clusters

### C.1 — Talent discovery + ranking
*Audit items: `/talent`, `/api/builders/geo`, ranking sort, `velocity_score`, Batch 7b quality scoring, homepage + `/hirers` featured.*

| Comparator | Capabilities | Business model | Positioning |
|---|---|---|---|
| Upwork | Job Success Score (JSS) is THE primary search-rank input: outcome-based, daily-recomputed over 6/12/24-mo windows ("forgiveness curve"), contract-value-weighted, blends public+private feedback | Tiered client+freelancer fees fund the ranking infra | "Top Rated" badge at JSS ≥ 90%; rank = earnings |
| LinkedIn | Relevancy engine: profile completeness + activity recency + connection proximity + semantic skill-ontology weighting; "Spotlights" (Open-to-Work, Active Talent); personalized per searcher | Recruiter seat subscriptions | "most compatible profiles first" |
| Stack Overflow | Reputation orders visibility; earned via peer upvotes; daily cap | Free; Talent/Teams products monetize | Reputation = earned standing |
| Behance | "For You" + Discover + 100+ human-curated galleries; ranked by appreciations/views + curator pick | Free (Adobe ecosystem upsell) | "highest standards of creativity" |
| Toptal | No public ranking — human-matched by Toptal staff post-vetting | Hidden markup on rate | "we match you" (no self-serve rank) |
| GitHub | No hiring rank; contribution graph is a visible activity proxy | Free + paid orgs | activity-as-signal |
| Contra | Portfolio-driven discovery; lighter algorithmic ranking | 0% commission; Pro upsell | "independent, commission-free" |

**ShipStacked:** `/talent` sorts `verified DESC, velocity_score DESC, created_at DESC` today; `velocity_score` has no writer (frozen V1); Batch 7b quality scoring (Formula E) is the designed-not-built replacement.
**Classification: PARTIAL.** The *direction* (multi-signal, recency-decayed, anti-gaming, threshold-gated ranking) matches industry convergence exactly — Upwork's forgiveness curve = recency decay; LinkedIn's completeness+recency+semantic = multi-signal; Stack Overflow's threshold privileges = minimum-threshold gating. The *implementation* is unbuilt. Gap is concept-validated, execution-pending.

### C.2 — Profile structure + signals
*Audit items: `/u/[username]`, `profiles`, `skills`, `projects`, `github_data`, `posts`, Person JSON-LD.*

| Comparator | Pattern |
|---|---|
| LinkedIn | Structured sections (experience/skills/certs/recommendations); fuller = higher rank; 38,000-skill ontology; verified skill badges rank 30% higher |
| GitHub | Pinned repos + contribution graph + Achievements + signed-commit verification |
| Behance | Project-as-unit; view/appreciation counters per project |
| Contra | Profile + projects + services; Pro adds customization |
| Upwork | Profile + work history + JSS + portfolio + skill tests |
| Stack Overflow | Tag-expertise + answer history + reputation |
| Toptal | Curated profile assembled post-vetting |

**ShipStacked:** rich profile (bio/role/skills/projects/github_data/posts) + V2 receipts section; Person JSON-LD with `shipstacked:*` extensions; Atlas role = a skill-ontology analogue (40 roles, 7 clusters).
**Classification: ALIGNED.** Structure matches the LinkedIn/Contra pattern; the Atlas taxonomy is a credible skill-ontology equivalent. Sparseness is handled honestly (render-what-exists). One WEAK edge: the Atlas-role chip renders empty due to the `atlas_confirmed`-only latent bug.

### C.3 — Proof / verification systems
*Audit items: `proof_receipts`, `verification_events`, `attestations`, `/paste` flow, Atlas classifier, verification ladder.*

| Comparator | Verification pattern |
|---|---|
| GitHub | Un-fakeable contribution history; GPG/SSH/S-MIME signed commits; "3-year cadence + real collaborators can't be generated by a chatbot" |
| Toptal | 5-stage human vetting (language → technical → live interview → 1-3wk test project → ongoing) — <3% pass |
| Stack Overflow | Peer-validated answers; accepted-answer + upvotes = competence proof |
| Upwork | Outcome-verified (paid contract + feedback); optional skill tests |
| Behance | Human curation as quality proof |
| LinkedIn | Verified skill badges; endorsements (weak); recommendations |
| Contra | Mostly self-reported portfolio |

**ShipStacked:** the engine — paste/enrich a URL → classify → probe reachability → write a `proof_receipt` with `verification_level` (L0_claimed / L1_artifact_confirmed) + Atlas roles + confidence. This is the **closest analogue to GitHub's "machine-verified, can't-be-faked" model**, applied to arbitrary shipped artifacts not just code.
**Classification: ALIGNED (and differentiating).** ShipStacked's machine-verification of arbitrary artifacts is its strongest GitHub-parallel and its core moat. PARTIAL on the ladder: L2/L3/L4 schema-supported but only L0/L1 have writers; periodic re-verification (the GitHub "still-live" equivalent) is unbuilt (Batch 7c).

### C.4 — Trust / reputation signals
*Audit items: `verified` flag, verification levels, Atlas roles, `velocity_score`, future `quality_score`.*

| Comparator | Trust signal |
|---|---|
| Stack Overflow | Reputation number + badges; thresholds unlock privileges |
| Upwork | JSS % + Top Rated / Rising Talent / Expert-Vetted tiers |
| LinkedIn | Verified badges, endorsement counts, recommendations, "Open to Work" |
| Toptal | Membership itself = the trust signal (you're in the 3%) |
| GitHub | Stars, followers, verified commits, Achievements |
| Behance | Appreciation counts, curated-gallery features |
| Contra | Reviews, completed-project counts |

**ShipStacked:** `verified` (V1 admin/autoVerify flag) + verification levels + (future) `quality_score`.
**Classification: PARTIAL → moving to ALIGNED via Batch 7b.** Today's `verified` flag is V1-criteria (not engine-derived) — a known WEAK. The locked principle correctly separates operator-vouched legitimacy (`verified`) from engine-derived quality (`quality_score`), mirroring how GitHub separates "verified commit" from "stars." Industry validates: a single number (JSS, reputation) as the headline trust signal works at scale.

### C.5 — Onboarding + signup flows
*Audit items: `/join` 4-card router, `/api/join/team`, `/api/join/buyer`, `/api/keys`.*

| Comparator | Onboarding |
|---|---|
| Toptal | Gated 5-stage gauntlet (5-8 weeks) — admission IS the product |
| Upwork | Open signup + profile-approval review |
| LinkedIn | Open, frictionless, completeness-nudged |
| Contra | Open, fast, link-shareable profile |
| GitHub | Open, instant |
| Stack Overflow | Open, instant; privileges earned post-signup |
| Behance | Open, instant; visibility earned via curation |

**ShipStacked:** open 4-card router (Solo / Team / Agent / Buyer-only); no gate; identity selection then optional linking.
**Classification: INTENTIONALLY-DIFFERENT (validated).** ShipStacked deliberately rejects Toptal's gate ("we can't stop trash signing up") and adopts the open model of LinkedIn/GitHub/Contra. This is positioning-aligned: the moat is *ranking*, not *admission*. The divergence from Toptal is intentional and correct per the locked spec, NOT an oversight. The 4-card router (supply identities + use-case 4th card) is a clean adaptation of the standard open-signup pattern.

### C.6 — Search / filter UX
*Audit items: Batch 6 `/talent` facets (designed), current filter chips, URL params.*

| Comparator | Search/filter |
|---|---|
| LinkedIn Recruiter | Rich faceted search (Boolean, skills, Spotlights, semantic); the gold standard |
| Upwork | Category + skill + JSS + rate + availability filters |
| Behance | Field/tool/color/category facets |
| GitHub | Search by language, stars, topic |
| Stack Overflow | Tag-based filtering |
| Contra | Service + skill filters |
| Toptal | N/A (staff-matched) |

**ShipStacked:** today profession/availability/verified filters; Batch 6 designed atlas-role/verification/stack/capability facets (not built).
**Classification: PARTIAL.** Basic facets exist; the engine-output facets (the differentiator — filter by machine-verified role/verification/stack) are designed not built. Industry (LinkedIn especially) validates that faceted search on verified attributes is table-stakes for talent discovery. Gap blocks the "machine-verified proof visible in discovery" positioning.

### C.7 — Hirer/buyer-side discovery + messaging
*Audit items: `/hirer`, `/hirers`, `/messages`, `/api/messages`, `saved_profiles`, `/post-job`, `/jobs`, `/company/[slug]`.*

| Comparator | Buyer side |
|---|---|
| LinkedIn | Recruiter seat: search + InMail + pipelines + Spotlights |
| Upwork | Post job + search + invite + message + hire |
| Toptal | Talk to a matcher; they assemble candidates |
| Contra | Browse + message + contract + pay |
| Behance | Contact creative directly; hiring is off-platform-ish |
| GitHub | No hiring side (sponsors aside) |
| Stack Overflow | Talent product (separate) |

**ShipStacked:** `/hirer` dashboard + `/talent` browse + `saved_profiles` shortlist + `/messages` + `/post-job` + `/jobs` + `/company/[slug]`.
**Classification: ALIGNED.** The buyer toolkit (browse → shortlist → message → post-job) matches the Upwork/LinkedIn pattern at appropriate scale. Messaging, saved profiles, and company pages are all present. No major gap; the paywall gates the right things (browse-full-graph + outbound = paid).

### C.8 — Pricing + monetization
*Audit items: `subscriptions`, `/api/checkout`, `/api/webhooks/stripe`, Buyer Mode toggle, $199/mo.*

| Comparator | Model |
|---|---|
| Upwork | Tiered client+freelancer fees (5-20% sliding) + 3% client charge + subscriptions |
| Toptal | Hidden markup (up to ~50%) on freelancer rate; blended rate to client |
| Contra | **0% freelancer commission; monetize via Pro upsell + pass transaction fees to client** |
| LinkedIn | Recruiter seat subscriptions (high $) + premium tiers |
| GitHub | Free + paid orgs/enterprise |
| Stack Overflow | Free + Teams/Talent products |
| Behance | Free (Adobe Creative Cloud upsell) |

**ShipStacked:** free for supply (builders); **flat $199/mo for hirers** (Buyer Mode paid toggle); no commission, no markup, no transaction fee.
**Classification: INTENTIONALLY-DIFFERENT (validated).** The asymmetric "free supply / paid demand" model directly matches Contra's and LinkedIn's logic (shift cost to the demand side; supply liquidity is the moat). ShipStacked's *flat* $199 (vs. per-seat tiers or % markup) is a deliberate simplification — "No commissions" is the positioning. Validated against the locked composable-modes spec (Hirer = paid toggle, asymmetric: supply needs proof, demand needs money). PARTIAL on implementation: the paywall exists but the "enable Buyer Mode → $199/mo on an existing supply entity" toggle UX is unbuilt.

### C.9 — Anti-spam + anti-gaming
*Audit items: Yuki-class URL validation (`7b88014`), published-gate (INV2), `dedupe_key`, proof-of-work scoring discipline.*

| Comparator | Anti-gaming |
|---|---|
| Stack Overflow | Daily reputation cap (200/day); threshold gating; downvote mechanics |
| GitHub | Commits only count if not a fork, on default branch, email-linked — structural anti-fake filters |
| Upwork | Private feedback (can't be gamed by asking for 5 stars); JSS forgiveness windows |
| LinkedIn | Endorsement weighting; activity-recency requirements |
| Behance | Human curation as the anti-gaming backstop |
| Toptal | The 5-stage gate IS the anti-gaming |
| Contra | Reviews + verified payments |

**ShipStacked:** Yuki-class URL guard, `dedupe_key` (no duplicate receipts), published-gate, and the locked proof-of-work scoring discipline (breadth-not-volume, median-not-avg, reachability, diversity, recency, threshold gating).
**Classification: ALIGNED (principle) / PARTIAL (built).** The locked discipline is a near-exact map of GitHub's structural filters + Stack Overflow's caps/thresholds + Upwork's forgiveness windows. The principle is industry-convergent. Built today: URL validation + dedupe + published-gate. Unbuilt: the scoring-side anti-gaming (breadth/median/threshold) lands with Batch 7b Formula E.

### C.10 — Machine-discovery surfaces (the differentiator)
*Audit items: `/api/mcp`, AgentCard, JSON-LD content negotiation, `llms.txt`, Consented Collections, Atlas roles dereferenceable.*

| Comparator | Machine-discovery |
|---|---|
| GitHub | Public API; machine-readable everything |
| Stack Overflow | Public API + data dumps |
| LinkedIn | Closed; aggressively anti-scraping |
| Upwork / Toptal / Contra / Behance | Largely closed to machine discovery |

**ShipStacked:** MCP endpoint (read-only, no-oracle), A2A AgentCard, JSON-LD/CSV content negotiation, `llms.txt`, Consented Collections, dereferenceable Atlas roles.
**Classification: INTENTIONALLY-DIFFERENT (and a genuine moat).** No talent-marketplace comparator exposes structured, consented, agent-readable talent data. This is ShipStacked-unique — closest analogue is GitHub's openness, but applied to *verified talent* with *consent gating*. This is the "proof-of-work network for the agentic economy" positioning made real. Validated as a deliberate, positioning-aligned difference — not a gap.

### C.11 — Entity graph / relationships
*Audit items: `entities`, modes, relationships table (MISSING), D2/D3 build.*

| Comparator | Graph model |
|---|---|
| LinkedIn | The canonical person↔company↔skill graph; the explicit model ShipStacked's D10 cites ("do it like LinkedIn person↔company") |
| GitHub | org↔member, repo↔contributor |
| Upwork/Contra | Agency↔member (lighter) |
| Toptal/Behance/SO | Minimal relationship graph |

**ShipStacked:** `entities` table exists; relationships (Works-At / Owns / Sponsors / Hired) MISSING; D2/D3 greenfield.
**Classification: MISSING.** The locked spec (A.2 LinkedIn-style linking, A.3 relationships) explicitly calls for this; it's unbuilt. LinkedIn is the validated reference model. Blocks Card 2 (Team) member-linking and Card 3 (Agent) principal-linking.

---

## §D — Findings by classification

**ALIGNED (5):**
- C.2 Profile structure + signals
- C.3 Proof/verification (core engine) — *and differentiating*
- C.7 Hirer/buyer-side discovery + messaging
- C.9 Anti-gaming (principle level)
- (C.4 Trust signals — ALIGNED-pending after Batch 7b)

**PARTIAL (5):**
- C.1 Talent discovery + ranking — direction validated, engine unbuilt
- C.4 Trust/reputation signals — `verified` is V1-criteria; `quality_score` pending
- C.6 Search/filter UX — basic facets exist; engine-output facets designed-not-built
- C.8 Pricing — model validated; Buyer Mode toggle UX unbuilt
- C.9 Anti-gaming — built: URL/dedupe/gate; unbuilt: scoring-side anti-gaming

**MISSING (1):**
- C.11 Entity graph / relationships

**INTENTIONALLY-DIFFERENT (3, all validated as positioning-aligned):**
- C.5 Onboarding — open signup, not Toptal's gate (moat is ranking, not admission)
- C.8 Pricing — flat $199 free-supply/paid-demand (vs. % markup or per-seat)
- C.10 Machine-discovery surfaces — agent-readable consented talent data (unique)

**UNCLEAR (0 from clusters):** none at cluster level. The 4 remaining audit AMBIGUOUS items (`/client/inbox`, `/get-found/[id]`, `/api/jobs/xpost`, `/api/client-magic-link`) are surface-level, not capability-cluster-level, and are tracked in the alignment audit not here.

---

## §E — Priority-ranked gap roadmap

For each PARTIAL / MISSING item: HIGH / MEDIUM / LOW by impact on locked
spec + whether it blocks pending batches.

| Gap | Cluster | Priority | Rationale | Maps to |
|---|---|---|---|---|
| Quality scoring engine (Formula E) | C.1, C.4, C.9 | **HIGH** | Core to proof-of-work positioning; ranking is broken (frozen velocity_score) without it; industry-universal pattern; blocks the entire "who gets found" thesis | Batch 7b |
| Engine-output search facets | C.6 | **HIGH** | Makes machine-verified proof *visible* in discovery; without it the moat is invisible to hirers; LinkedIn validates faceted-on-verified as table-stakes | Batch 8 (post-7b) |
| Entity graph / relationships | C.11 | **HIGH** | Locked spec (A.2/A.3) explicitly requires; blocks Card 2 team + Card 3 agent linking; LinkedIn is the reference model | Path B (D2/D3) |
| Periodic re-verification (L2) | C.3 | **MEDIUM** | 11.7% link-rot today; GitHub's "still-live" equivalent; degrades the verification claim over time but not blocking near-term; needs cron infra | Batch 7c |
| Builder-mode auto-badge | C.4 | **MEDIUM** | A.3 "EARNED" mode; trust-signal visibility; lower impact than the ranking engine itself | Path D |
| Buyer Mode toggle UX ($199 on enable) | C.8 | **MEDIUM** | Model validated; paywall works today via subscriptions; the explicit "enable on existing entity" UX is a revenue-UX refinement, not a blocker | (unscheduled) |
| `verified` flag → engine-derived (D3=d) | C.4 | **LOW** | Today's V1 `verified` works as operator-vouching; redefining is a positioning refinement; can wait until quality_score is live | (with Batch 7b D3) |
| Atlas-confirmed latent bug fix | C.2 | **LOW** | Cosmetic empty-render; no crash; bundled with future attestor flow | (deferred, recorded) |

**Top-3 HIGH:** (1) Quality scoring engine — Batch 7b, in flight; (2) Engine-output search facets — Batch 8; (3) Entity graph — Path B.

---

## §F — 2x2 positioning map

**Axes** (the two primary differentiation dimensions surfaced by the research):
- **X — Access model:** Open (anyone signs up) ←——→ Gated (admission filter)
- **Y — Proof basis:** Self-reported / social ←——→ Machine-verified work

```
                 MACHINE-VERIFIED PROOF (work probed / un-fakeable)
                              ▲
                              │
        GitHub ●              │
        Stack Overflow ●      │   ★ ShipStacked
                              │   (open access + machine-verified
                              │    proof-of-work, applied to hiring)
                              │
   OPEN ◀──────────────────── ┼ ──────────────────▶ GATED
   ACCESS                     │                       /CURATED
                              │
        Contra ●              │        ● Toptal
        Upwork ●              │   (gated + human-vetted
        LinkedIn ●            │    = "verified" but via
        Behance ●             │     human gate, not machine)
                              │
                              ▼
                 SELF-REPORTED / SOCIAL PROOF (claims, ratings,
                          endorsements, appreciations)
```

**Reading the map:**
- **Bottom-left (open + social):** Upwork, LinkedIn, Contra, Behance. High scale, proof is claimed/peer-asserted (ratings, endorsements, appreciations, JSS-from-feedback).
- **Top-left (open + machine-verified):** GitHub, Stack Overflow — and **ShipStacked**. Proof from un-fakeable artifacts. But GitHub/SO are *not hiring marketplaces*. ShipStacked is the only **hiring marketplace** in this quadrant.
- **Bottom-right / right (gated):** Toptal. Trust via expensive human admission; proof is human-judged, not machine-probed; low scale.
- **Whitespace:** the top-left quadrant *for a hiring marketplace* is unoccupied. ShipStacked's "open access + machine-verified proof-of-work, ranked" is a position no incumbent holds. The strategic risk is execution (the ranking + facets must actually ship for the position to be real), not contested territory.

---

## §G — Honest gaps in this benchmark itself

**Proprietary / unconfirmable (inferred, not confirmed):**
- **LinkedIn's exact ranking weights** are proprietary. The signals (completeness, recency, proximity, semantic, Spotlights, endorsement-count, verified-badge-30%-boost) are documented by third parties + LinkedIn's own guidance, but the weighting function is not public. Treated as directional, not exact.
- **Upwork JSS exact formula** is deliberately opaque ("the way Upwork weights long-term clients, contract value, and private feedback" is undisclosed). The *shape* (outcome ratio, time windows, forgiveness curve, contract-value weighting) is well-documented by Upwork support + third parties; the precise coefficients are not.
- **Toptal's acceptance funnel percentages** (26% → 7% → 3.6% → final) are Toptal-published marketing figures; independent verification is limited.

**Single-source-risk areas (flagged):**
- Behance ranking specifics rely heavily on Behance's own help docs + curation blog; fewer independent algorithmic analyses exist than for Upwork/LinkedIn.
- Contra's monetization detail (Pro upsell + client-side fees) is consistent across sources but Contra is newer with less third-party scrutiny.

**Not researched (out of scope per brief):**
- Marketing / distribution / GTM comparisons.
- Pricing competitive intelligence beyond "what business model."
- Cost estimates to close gaps (separate batch each).

**Inference confidence:**
- HIGH: pricing models, onboarding models, the existence + direction of multi-signal ranking, GitHub/SO machine-verification patterns (all multi-source-confirmed).
- MEDIUM: exact ranking signal lists (documented but not authoritative).
- LOW: precise weighting functions (proprietary everywhere).

**Methodological honesty:** this benchmark applied the research-first
principle — every cluster's comparator claims trace to web sources, not
to first-principles reasoning. Where sources were thin or proprietary, it's
flagged above rather than fabricated.

---

## §H — Sources

Talent-marketplace ranking + verification + pricing research, 2026-05-23:
- Upwork JSS: support.upwork.com (Job Success Score articles), uphunt.io, profilepolisher.com
- Stack Overflow reputation: stackoverflow.blog "Membership Has Its Privileges", internal.stackoverflow.help, canonica.ai
- Toptal vetting: toptal.com/top-3-percent, teilurtalent.com, earnifyhub.com
- LinkedIn talent search: leonar.app, jhanviai.com, sifars.com, resumly.ai
- GitHub trust signals: docs.github.com (profile-contributions, commit-signature-verification), dev.to
- Contra: contra.com/how-it-works, jobbers.io, ruul.io, earnifyhub.com
- Behance: behance.net help/galleries/blog, makeuseof.com, creativebloq.com
- Pricing models: fatcatremote.com (Toptal), yo-gigs.com + oyelabs.com (Upwork), contra.com/commission-free

---

End of benchmark. Read-only; no code, no DDL, no decisions locked. Operator
reviews §D classifications + §E priorities + §F map before next-batch
decisions. No finding contradicts an in-flight batch — Batch 7b's Formula E
direction is *confirmed* by the research, not challenged.
