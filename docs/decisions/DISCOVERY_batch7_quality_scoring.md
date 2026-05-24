# DISCOVERY — Batch 7: Quality scoring engine

Phase 1 discovery doc. Read-only research. No code mutation, no commits
until operator signs off Section H below.

Prepared at HEAD `19a233e` on 2026-05-23 after the ranking machinery
audit (`docs/decisions/AUDIT_ranking_machinery.md`).

---

## A. Purpose

The ranking audit established the gap: every public surface that ranks
profiles (`/talent`, `/`, `/hirers`) sorts by `verified DESC,
velocity_score DESC, created_at DESC` — and **`velocity_score` has no
writer in current code** (Batch 1 KILL pass deleted the recalc
endpoint; nothing replaced it). Every engine output column
(`atlas_inferred`, `atlas_confidence`, `verification_level`,
`event_type`, `capabilities`, `stack`, receipt-row existence) is unused
in any sort or filter clause across the codebase.

**Batch 7's job:** design a `quality_score` driven by engine output,
validated against the current 42-profile dataset, that replaces (or
augments) the frozen V1 sort. First version doesn't have to be
perfect — it has to be defensibly better than the current state.

**Honest framing — first ranking/scoring batch:**

- Math choices have real product consequences. The operator should
  see candidate formulas concretely scored against the actual data
  before locking a weight.
- The 42-profile dataset (per `STEP_3_DISCOVERY.md §A.1` — 41 published
  builders at 2026-05-17, plus the Batch 5 backfill activity since)
  is the test harness. The formula must respect operator intuition
  about who's a top builder.
- Eight load-bearing decisions surfaced in §H for operator approval.
  The doc does NOT decide them.

**Out of scope** (see §C): filter facet UI (deferred Batch 8), DB
column removals, full historical backfill of `quality_score`,
auto-enrichment threshold gating.

---

## B. The 8 load-bearing decisions (surfaced — not decided)

### D1 — Scoring inputs

Which engine outputs feed the score?

- (a) **Receipt count alone.** Simplest. Sortable today via subquery.
  Vulnerable to volume-without-quality.
- (b) **Receipt count + max confidence.** Adds the classifier's
  strongest-role-confidence as a quality dampener. Mid-confidence
  spammy receipts contribute less.
- (c) **(b) + L1 count.** Distinguishes artifact-confirmed receipts
  from L0_claimed. Today only L1 and L0 exist; L0_claimed is rare per
  the publish-flow heuristic (`publish.ts:149-160`). May be effectively
  the same as receipt count today.
- (d) **(c) + `event_type` weighting.** Weights event types: e.g.
  `shipped_agent` > `shipped_app` > `shipped_site` > `published_repo`.
  Aligns with the platform's "real product shipped" positioning.
- (e) **(d) + recency decay.** Receipts older than N days decay in
  weight. Counters the "stuff from 2024" failure mode for builders
  who haven't shipped recently.
- (f) **(e) + atlas-role diversity.** Builders with receipts spanning
  multiple Atlas role clusters get a diversity bonus. Signals range,
  not single-domain spike.
- (g) **Custom.** Operator proposes weights per signal. Lowest-trust
  but most flexible — recommend only if (a)-(f) don't fit.

**Trade-off:** (a) is shipping in minutes; (f) is shipping in days.
Each step up adds defensibility AND fragility (more knobs to tune;
more chances to mis-tune).

### D2 — Scoring formula shape — ⚠ SUPERSEDED: needs Formula E before §H lock

> **UPDATE 2026-05-23:** Formulas A/B/C/D below were DIAGNOSTIC, not final.
> Per the locked "Proof-of-work scoring discipline" principle
> (`SESSION_2026-05-19_DECISIONS.md`, added 2026-05-23), none of A-D satisfy
> all six required signals (breadth / median-confidence / reachability /
> event-type diversity / recency decay / minimum-threshold gating). **D2
> cannot be locked at §H until a Formula E is specified** that implements
> all six. See new §F.6. The A-D options below are retained as the tournament
> baseline that surfaced the gap (Formula D promoting `nnekaewalu847` to rank 2
> on 2 receipts at a single portfolio host was the tell).

How are the inputs combined into a single 0-100 score?

- (a) **Simple weighted sum.**
  `score = w1*receipts + w2*avg_confidence*100 + w3*l1_receipts + ...`
  Pros: linear, transparent, easy to argue about weights. Cons:
  unbounded if any input is unbounded (need caps).
- (b) **Multiplicative.**
  `score = receipts * avg_confidence * (1 + l1_ratio)`
  Pros: zero confidence → zero score (honest). Cons: harsh on
  single-receipt builders with mid confidence.
- (c) **Tiered.**
  `score = band_base[receipts_bucket] + confidence_bonus + l1_bonus`
  Pros: handles long-tail outliers (someone with 50 receipts doesn't
  trivially dominate). Cons: bucket boundaries are arbitrary.
- (d) **Log-scaled.**
  `score = log2(1 + receipts) * 10 + avg_confidence * 40 + l1_ratio * 30 + ...`
  Pros: handles long tails naturally; 1→2→4→8 receipts smooths into
  a curve. Cons: less intuitive to explain.

§F runs (a)/(b)/(c)/(d) side-by-side against the actual 42-profile
dataset. Operator picks based on observed behavior, not abstract
preference.

### D3 — How does `verified` interact with `quality_score`?

The current `verified` flag is admin-managed + autoVerify-managed
based on V1 criteria (1 post with outcome+url, profile basics, project
or skills). It does NOT reflect engine activity. Today it's the
primary sort key.

- (a) **Drop from sort entirely.** `verified` becomes a badge only;
  ranking is engine-driven. Risk: operator-vouched legitimacy lost
  as a ranking signal.
- (b) **Modest bonus.** `quality_score + 0.2*verified` or similar.
  Preserves "operator-curated bump" without overriding engine signal.
- (c) **Primary partition stays.** `verified DESC` first, then
  `quality_score DESC` within each partition. Matches current shape
  exactly except velocity → quality. Least disruptive.
- (d) **Redefine.** `verified` becomes a computed flag: e.g.,
  "≥2 L1 receipts at confidence ≥ 0.5." Operator-flag becomes
  legacy; engine-derived flag replaces. Highest risk but most
  internally consistent.

### D4 — Storage mechanism

Where does the score live?

- (a) **Computed at query time (no DDL).** SQL aggregate via subquery
  on every `/talent`, `/`, `/hirers` request. 42 profiles × ~10
  microseconds per profile-subquery = ~0.5ms total. Trivial at this
  scale. Lifts naturally when receipts change. **Recommended unless
  scale-driven reasons emerge.**
- (b) **Stored column on profiles or entities, refreshed on write.**
  DDL + trigger or app-code refresh. Drift risk if trigger fails
  silently. Faster reads (but reads aren't a bottleneck at 42-profile
  scale).
- (c) **Stored column with periodic refresh.** Requires cron
  infrastructure (deferred per Batch 5 §D6 / §D7 — no Vercel cron, no
  pg_cron, no external scheduler in place today).

### D5 — Validation against the dataset

Before locking the formula, how does the operator confirm it works?

- (a) **Spot-check.** Pick 5 builders the operator considers obvious
  top-rankers. Confirm formula puts them in top 6. Cheap; subjective.
- (b) **Pairwise invariants.** Define rules like
  "any builder with ≥2 L1 receipts at confidence ≥ 0.7 ranks above
  any builder with 0 receipts" — confirm formula respects them.
  More rigorous; takes time to write.
- (c) **Formal validation set.** Operator-curated "should be top 10"
  list. Measure overlap with formula's top 10. Most rigorous; needs
  the operator to do curation work.
- (d) **Hybrid.** Invariants from §G + spot-checks against 3-5 named
  examples. Recommended balance.

§G proposes invariants; §J runs the validation after the formula is
locked.

### D6 — Recompute cadence (only if D4 = b or c)

If D4 = (a) computed-at-query-time, this decision is N/A. Otherwise:

- (a) **On every new receipt write.** Trigger-based or
  `publishProofReceipt`-app-code refresh. Cheapest; staleness window
  = trigger latency.
- (b) **On every profile update + receipt write.** Adds profile-edit
  triggering.
- (c) **Periodic cron.** Requires cron infrastructure (we don't have).
- (d) **Lazy.** Recompute when stale on read. Adds read-time
  complexity.

### D7 — Operator override mechanism (the `featured` flag)

Today `featured=true` + `featured_order` are manual operator
promotions, gating + sorting the homepage and `/hirers` featured
block. With a quality score, where does manual override fit?

- (a) **Keep as today.** Manual `featured=true` overrides ranking on
  homepage/hirers; `/talent` uses quality_score only. Cleanest
  separation.
- (b) **Featured becomes informational.** Quality score sorts
  everywhere; `featured=true` shows a badge but doesn't reorder.
- (c) **Hybrid.** Featured profiles rank within their quality_score
  tier (i.e., featured + high quality > featured + low quality >
  non-featured + high quality).

### D8 — Backward-compat behavior during transition

- (a) **Clean break.** `/talent` sort becomes
  `verified-or-not DESC (per D3), quality_score DESC`. Drop
  `velocity_score` from sort entirely. Existing display chips for
  velocity stay (column not removed; just unused for sort).
- (b) **Parallel.** Quality score is primary; velocity_score is a
  tiebreaker. Operator sees the new behavior dominate while the old
  signal remains in place. Lowest-disruption.
- (c) **Feature flag.** Env var or query param toggles V1 sort vs V2
  quality-score sort. Lets the operator compare prod side-by-side.
  Highest infrastructure cost; lowest commitment cost.

---

## C. Out of scope (explicit)

- **Any formula that does not satisfy all six required signals** of the
  locked "Proof-of-work scoring discipline" principle (added 2026-05-23 to
  `SESSION_2026-05-19_DECISIONS.md`): breadth (distinct hosts, not raw count),
  median-confidence (not avg), reachability ratio, event-type diversity,
  recency decay, and minimum-threshold gating. A single-metric or
  avg-confidence-primary formula is OUT OF SCOPE — it would contradict a
  locked principle. The final formula is **Formula E** per §F.6.
- **Batch 8 filter facet UI** — separate batch; will run on
  quality-sorted base.
- **Removing the `verified` or `velocity_score` columns.** Both stay
  in the schema. Only how they participate in sort changes.
- **Auto-enrichment threshold gating.** Operator already decided open
  signup; ranking does the filtering, not signup gates.
- **Historical backfill of `quality_score`** — if D4 = (b) and we
  add a stored column, first-run population is a separate operator
  step (one-shot SQL UPDATE based on §F formula).
- **Changing `autoVerify.ts` criteria.** V1 verified-flag semantics
  unchanged. If D3 = (d), redefinition happens via a NEW computed
  flag (e.g., `engine_verified`), not by changing the existing one.
- **Updating MCP `get-builder` to expose `quality_score`.** Possible
  follow-up; this batch focuses on ranking surfaces.
- **Atlas v0.5 role taxonomy bump.** Atlas v0.4 is the live
  classifier output; Batch 7 uses what's in `atlas_inferred[]` today.
- **Touching the `/atlas/roles/[id]` `atlas_confirmed`-only bug**
  (recorded in commit `4787a7b`). Separate deferred item.

---

## D. Pre-flight verification — results

### D.1 — `proof_receipts` field-write semantics

From `src/lib/paste/publish.ts` (the sole receipt writer) +
`src/lib/enrichment/profile-adapter.ts` (the upstream draft builder
for enrichment-generated receipts):

| Field | How it's set | Range today |
|---|---|---|
| `atlas_inferred[]` | Atlas classifier output (`classifyAtlasRoles`); 1-5 role IDs | 0-5 entries; 99 total entries across 47 receipts → ~2.1 avg |
| `atlas_confirmed[]` | ONLY from `/paste/review` user confirmation; enrichment writes `[]` | 0 across all 47 receipts (the documented gap) |
| `atlas_confidence` | Classifier's strongest-match confidence (0.0-1.0); clamped + validated (`index.ts:170-174`) | Per the spec, 0.32-0.92 spread on the locked fixtures; live distribution unknown without §F SQL run |
| `verification_level` | `resolveVerificationLevel(draft)` (`publish.ts:149-160`); L0_claimed if no artifacts OR explicit unreachable; else L1_artifact_confirmed | Per audit §G.2: effectively binary (`L0_claimed` / `L1_artifact_confirmed`); L2/L3/L4 not written by any code path |
| `event_type` | Classifier output (one of 10 enum values; see D.2) | Distribution unknown without §F SQL — recommendation: §F runs it |
| `capabilities[]` | Analyzer output, harvested per-source | Per audit §G.4 only 4 fixture tags pre-Batch-5; live distribution unknown post-backfill |
| `stack` (jsonb) | Analyzer output (`StackElement[]`) | Schema enforced; live distribution unknown |
| `issued_at` | `now()` at publish time | Sorted naturally; recency available |
| `visibility` | from draft; default `public` | All 47 receipts `public` per pre-audit |

### D.2 — Event type enum (10 values)

From `src/schemas/proof-receipt-v0.1.ts:57-68`:

```
shipped_app, shipped_site, shipped_agent, shipped_workflow,
shipped_integration, deployed_mcp_server, published_repo,
completed_eval, delivered_engagement, resolved_incident
```

**Implicit quality ordering** (worth surfacing as part of D1 (d)
weight): `shipped_*` events represent finished products;
`deployed_mcp_server`, `completed_eval`, `delivered_engagement`,
`resolved_incident` represent operational outcomes;
`published_repo` is the weakest signal (open-source code without
deployment evidence). For an agentic-economy platform,
`shipped_agent` and `deployed_mcp_server` are the most positioning-
aligned. **Operator picks weights at D1.**

### D.3 — Atlas role taxonomy (40 v0.4 roles in 7 clusters)

From `src/services/atlas-classifier/prompts/v0.1.0.md` + parsed by
`src/services/atlas-classifier/roles.ts`:

- Cluster A (workforce, A1-A7) — AI integration, FDE, deployment,
  agent workflow implementation
- Cluster B (operations, B1-B4) — reliability engineering, cost,
  inference serving
- Cluster C (compliance, C1-C9) — audit, risk, governance,
  red-teaming, provenance
- Cluster D (design, D1-D5) — workflow, architecture, prompt
  engineering, handoff, evals
- Cluster E (enablement, E1-E4) — implementation lead, trainer,
  translator, fractional head
- Cluster F (operators, F1-F5) — solo / boutique / vertical /
  function / integration agent operators
- Cluster G (practitioners, G1-G6) — AI-native legal / medical /
  finance / architecture / wealth / education

**Notable for scoring:** the prompt instructs the classifier to
*"prefer specific roles over general"* and to drop confidence below
0.4 when guessing. A1 (AI Integration Operator) is a catch-all;
F1 (Solo Agent Operator) is more specific; G4 (AI-Native Architecture
Practitioner) is highly specific. **Role specificity is a signal;
extracting it is a Batch-7-or-later question.** Recommend Batch 7
does NOT weight by role specificity in v1 (too many knobs); revisit
in a v2 of the formula.

### D.4 — Confidence semantics from the classifier

From `src/services/atlas-classifier/prompts/v0.1.0.md:21-28`:

- 0.95+ = "obviously this"
- 0.7-0.9 = "strong match"
- 0.5-0.7 = "best guess but could be another"
- Below 0.4 = "guessing — should say so in reasoning"

This is the published calibration. Formulas using `atlas_confidence`
should respect: 0.4 is a floor below which the classifier itself is
flagging "weak." A natural threshold for "confident receipt" is ≥ 0.5
(the operator's brief used 0.5 in §G invariants).

### D.5 — The 42-profile dataset shape (what we know without running §F SQL)

| Aspect | Value | Source |
|---|---|---|
| Total published profiles | 41 at 2026-05-17 | `STEP_3_DISCOVERY.md:21` |
| Plus or minus since (Batch 5 backfill, new signups) | "42-profile dataset" per operator brief; likely 1-2 net change | operator framing |
| With `entity_id` | 17 at 2026-05-17; after backfill all 23 unlinked got entities → ~40 of 41 today | STEP_3 §A.4 + Batch 5 backfill report |
| Total public receipts | 47 | operator brief |
| atlas_inferred entries across all receipts | 99 (~2.1 avg per receipt) | operator brief |
| atlas_confirmed entries | 0 | operator brief + audit Verification 2 |
| verification_level distribution | likely 100% L1_artifact_confirmed | audit + publish.ts code |
| Cohort spread | 18 verified (original cohort, ~55 receipts pre-rollback, ~20-30 post-Batch-5) + 24 unverified (most newly backfilled today) | Batch 5 + backfill audit |

**What §F SQL will reveal that we don't know yet:**
- per-builder receipt count distribution (probably long-tail)
- per-builder max_confidence distribution
- per-builder event_type mix
- the actual L1 count (probably equals receipt count since L0 is rare)

---

## E. The current ranking outcome (audit §F)

The audit's §F SQL block (`AUDIT_ranking_machinery.md §F`) was
output to the operator. Its result would establish the baseline:
who currently occupies the anonymous-visible slots 1-6 of `/talent`
under the existing `verified DESC, velocity_score DESC, created_at
DESC` sort, and who is in slots 7-N.

**Status:** SQL block issued; results not pasted back into this
discovery. Operator likely has the output; this doc proceeds without
it because §F (below) generates its own formula-comparison output
which is what's actionable for Batch 7.

---

## F. Candidate formula tournament (operator runs in Dashboard)

Four candidate formulas, each ready to paste. Each returns the **top
10 by that formula**, side-by-side with the inputs each formula
weights. Operator sees concretely what each formula promotes.

Run all four. Compare outputs side-by-side. The right formula is the
one where:
1. The top 6 (anonymous-visible) match operator intuition.
2. Slots 7-15 don't contain obvious outliers ("how is X above Y?").
3. The invariants in §G are respected.

### F.1 — Formula A: weighted sum (D2 option a)

`score = receipt_count*8 + avg_confidence*30 + l1_count*5 +
shipped_weight*12 + recency_weight*15`

Where:
- `shipped_weight` = (count of receipts whose event_type LIKE 'shipped_%' OR 'deployed_mcp_server') / max(receipt_count,1)
- `recency_weight` = max(0, 1 - days_since_most_recent_receipt/180)

```sql
WITH per_builder AS (
  SELECT
    p.id AS profile_id, p.username, p.full_name, p.verified, p.entity_id,
    COALESCE((
      SELECT count(*) FROM public.proof_receipts r
        JOIN public.entities e ON e.id = r.subject_id
        WHERE e.profile_id = p.id AND r.visibility = 'public'
    ), 0) AS receipt_count,
    COALESCE((
      SELECT round(avg(r.atlas_confidence)::numeric, 3) FROM public.proof_receipts r
        JOIN public.entities e ON e.id = r.subject_id
        WHERE e.profile_id = p.id AND r.visibility = 'public'
    ), 0) AS avg_confidence,
    COALESCE((
      SELECT count(*) FROM public.proof_receipts r
        JOIN public.entities e ON e.id = r.subject_id
        WHERE e.profile_id = p.id AND r.visibility = 'public'
          AND r.verification_level = 'L1_artifact_confirmed'
    ), 0) AS l1_count,
    COALESCE((
      SELECT count(*)::numeric / NULLIF(count(*),0) FROM public.proof_receipts r
        JOIN public.entities e ON e.id = r.subject_id
        WHERE e.profile_id = p.id AND r.visibility = 'public'
          AND (r.event_type LIKE 'shipped_%' OR r.event_type = 'deployed_mcp_server')
    ), 0) AS shipped_ratio,
    GREATEST(0, 1 - EXTRACT(EPOCH FROM (now() - COALESCE((
      SELECT max(r.issued_at) FROM public.proof_receipts r
        JOIN public.entities e ON e.id = r.subject_id
        WHERE e.profile_id = p.id AND r.visibility = 'public'
    ), now() - interval '999 days'))) / 86400 / 180) AS recency_weight
  FROM public.profiles p
  WHERE p.published = true
),
scored AS (
  SELECT *,
    LEAST(100, ROUND(
      receipt_count * 8
      + avg_confidence * 30
      + l1_count * 5
      + shipped_ratio * 12
      + recency_weight * 15
    )) AS score_A
  FROM per_builder
)
SELECT score_A, username, full_name, verified,
       receipt_count, avg_confidence, l1_count,
       round(shipped_ratio::numeric, 2) AS shipped_ratio,
       round(recency_weight::numeric, 2) AS recency_weight
FROM scored
ORDER BY score_A DESC, receipt_count DESC, username
LIMIT 15;
```

### F.2 — Formula B: multiplicative (D2 option b)

`score = receipt_count * avg_confidence * (1 + l1_ratio) * (1 + shipped_ratio) * recency_weight * 12`

Zero confidence → zero score (honest). Zero receipts → zero score.

```sql
WITH per_builder AS (
  SELECT
    p.id AS profile_id, p.username, p.full_name, p.verified,
    COALESCE((SELECT count(*) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS receipt_count,
    COALESCE((SELECT avg(r.atlas_confidence) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS avg_confidence,
    COALESCE((SELECT count(*) FILTER (WHERE r.verification_level='L1_artifact_confirmed')::numeric
      / NULLIF(count(*),0) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS l1_ratio,
    COALESCE((SELECT count(*) FILTER (WHERE r.event_type LIKE 'shipped_%' OR r.event_type='deployed_mcp_server')::numeric
      / NULLIF(count(*),0) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS shipped_ratio,
    GREATEST(0, 1 - EXTRACT(EPOCH FROM (now() - COALESCE((
      SELECT max(r.issued_at) FROM public.proof_receipts r
        JOIN public.entities e ON e.id=r.subject_id
        WHERE e.profile_id=p.id AND r.visibility='public'
    ), now() - interval '999 days'))) / 86400 / 180) AS recency_weight
  FROM public.profiles p WHERE p.published=true
)
SELECT
  LEAST(100, ROUND(
    receipt_count * avg_confidence * (1 + l1_ratio) * (1 + shipped_ratio) * recency_weight * 12
  )) AS score_B,
  username, full_name, verified,
  receipt_count, round(avg_confidence::numeric,3) AS avg_confidence,
  round(l1_ratio::numeric,2) AS l1_ratio,
  round(shipped_ratio::numeric,2) AS shipped_ratio,
  round(recency_weight::numeric,2) AS recency_weight
FROM per_builder
ORDER BY score_B DESC, receipt_count DESC, username
LIMIT 15;
```

### F.3 — Formula C: tiered (D2 option c)

Bands of receipt counts, each with a base score, plus confidence and
shipped-ratio bonuses.

```sql
WITH per_builder AS (
  SELECT
    p.id, p.username, p.full_name, p.verified,
    COALESCE((SELECT count(*) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS receipt_count,
    COALESCE((SELECT avg(r.atlas_confidence) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS avg_confidence,
    COALESCE((SELECT count(*) FILTER (WHERE r.event_type LIKE 'shipped_%' OR r.event_type='deployed_mcp_server')::numeric
      / NULLIF(count(*),0) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS shipped_ratio
  FROM public.profiles p WHERE p.published=true
)
SELECT
  LEAST(100,
    CASE
      WHEN receipt_count = 0 THEN 0
      WHEN receipt_count = 1 THEN 20
      WHEN receipt_count BETWEEN 2 AND 3 THEN 40
      WHEN receipt_count BETWEEN 4 AND 7 THEN 60
      WHEN receipt_count BETWEEN 8 AND 15 THEN 75
      ELSE 85
    END
    + ROUND(avg_confidence * 10)
    + ROUND(shipped_ratio * 5)
  ) AS score_C,
  username, full_name, verified, receipt_count,
  round(avg_confidence::numeric,3) AS avg_confidence,
  round(shipped_ratio::numeric,2) AS shipped_ratio
FROM per_builder
ORDER BY score_C DESC, receipt_count DESC, username
LIMIT 15;
```

### F.4 — Formula D: log-scaled (D2 option d)

`score = log2(1+receipts) * 10 + avg_confidence * 40 + l1_ratio * 30 + shipped_ratio * 20`

Log-scale on receipt count smooths the long tail (1→2→4→8→16 maps to
1→1.58→2.32→3.17→4.09). Confidence is the dominant signal.

```sql
WITH per_builder AS (
  SELECT
    p.id, p.username, p.full_name, p.verified,
    COALESCE((SELECT count(*) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS receipt_count,
    COALESCE((SELECT avg(r.atlas_confidence) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS avg_confidence,
    COALESCE((SELECT count(*) FILTER (WHERE r.verification_level='L1_artifact_confirmed')::numeric
      / NULLIF(count(*),0) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS l1_ratio,
    COALESCE((SELECT count(*) FILTER (WHERE r.event_type LIKE 'shipped_%' OR r.event_type='deployed_mcp_server')::numeric
      / NULLIF(count(*),0) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS shipped_ratio
  FROM public.profiles p WHERE p.published=true
)
SELECT
  LEAST(100, ROUND(
    log(2, 1 + receipt_count) * 10
    + avg_confidence * 40
    + l1_ratio * 30
    + shipped_ratio * 20
  )) AS score_D,
  username, full_name, verified, receipt_count,
  round(avg_confidence::numeric,3) AS avg_confidence,
  round(l1_ratio::numeric,2) AS l1_ratio,
  round(shipped_ratio::numeric,2) AS shipped_ratio
FROM per_builder
ORDER BY score_D DESC, receipt_count DESC, username
LIMIT 15;
```

### F.5 — Side-by-side combiner (after F.1-F.4 individually inspected)

After running F.1-F.4 and comparing, the operator can run this
combined query to see all four scores per builder in one table:

```sql
WITH base AS (
  SELECT
    p.id, p.username, p.full_name, p.verified, p.velocity_score,
    COALESCE((SELECT count(*) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS receipts,
    COALESCE((SELECT avg(r.atlas_confidence) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS conf,
    COALESCE((SELECT count(*) FILTER (WHERE r.verification_level='L1_artifact_confirmed')::numeric
      / NULLIF(count(*),0) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS l1_ratio,
    COALESCE((SELECT count(*) FILTER (WHERE r.event_type LIKE 'shipped_%' OR r.event_type='deployed_mcp_server')::numeric
      / NULLIF(count(*),0) FROM public.proof_receipts r
      JOIN public.entities e ON e.id=r.subject_id
      WHERE e.profile_id=p.id AND r.visibility='public'), 0) AS shipped_ratio,
    GREATEST(0, 1 - EXTRACT(EPOCH FROM (now() - COALESCE((
      SELECT max(r.issued_at) FROM public.proof_receipts r
        JOIN public.entities e ON e.id=r.subject_id
        WHERE e.profile_id=p.id AND r.visibility='public'
    ), now() - interval '999 days'))) / 86400 / 180) AS recency
  FROM public.profiles p WHERE p.published=true
)
SELECT
  username, verified, receipts,
  round(conf::numeric,3) AS conf,
  LEAST(100, ROUND(receipts*8 + conf*30 + (receipts*l1_ratio)*5 + shipped_ratio*12 + recency*15)) AS score_A,
  LEAST(100, ROUND(receipts * conf * (1 + l1_ratio) * (1 + shipped_ratio) * recency * 12)) AS score_B,
  LEAST(100,
    CASE WHEN receipts=0 THEN 0 WHEN receipts=1 THEN 20
         WHEN receipts BETWEEN 2 AND 3 THEN 40
         WHEN receipts BETWEEN 4 AND 7 THEN 60
         WHEN receipts BETWEEN 8 AND 15 THEN 75
         ELSE 85 END
    + ROUND(conf*10) + ROUND(shipped_ratio*5)) AS score_C,
  LEAST(100, ROUND(log(2, 1+receipts)*10 + conf*40 + l1_ratio*30 + shipped_ratio*20)) AS score_D,
  velocity_score AS old_v1
FROM base
ORDER BY GREATEST(
  LEAST(100, ROUND(receipts*8 + conf*30 + (receipts*l1_ratio)*5 + shipped_ratio*12 + recency*15)),
  LEAST(100, ROUND(receipts * conf * (1 + l1_ratio) * (1 + shipped_ratio) * recency * 12))
) DESC, receipts DESC;
```

This produces the full 42-row table with all four scores side by
side, sorted by max(A, B) descending. Operator reads it once and can
see which formula best matches intuition.

### F.6 — Formula E (proof-of-work compliant) — THE FINAL FORMULA

> **Added 2026-05-23 after operator pushback.** A/B/C/D were diagnostic.
> The tournament surfaced the gap: Formula D promoted `nnekaewalu847` to
> rank 2 on 2 receipts at a single portfolio host — volume + confidence
> without breadth or reachability scrutiny. Operator's framing: *"anyone
> can claim they shipped an excellent thing. that's the point of
> 'proof of work'. hence our algo needs to go further than the claim."*

Formula E is not yet a single SQL expression — it is the **set of six
hard requirements** the final formula must satisfy, per the locked
"Proof-of-work scoring discipline" principle in
`SESSION_2026-05-19_DECISIONS.md` (added 2026-05-23):

1. **Breadth, not volume.** Score on `count(DISTINCT artifact_host)` (or
   distinct projects), not raw `count(receipts)`. Five receipts on one host
   ≠ five shipping events.
2. **Consistency, not peaks.** `median(atlas_confidence)`, NOT `avg`. Median
   resists single-lucky-receipt inflation. (All A-D used avg — this is the
   single biggest change.)
3. **Reachability non-optional.** `L1_artifact_confirmed` ratio is first-class;
   dead links (`L0_orphaned`, when Batch 7c ships) reduce score.
4. **Event-type diversity.** Distinct event types demonstrate range;
   `5x published_repo` is one thing repeated.
5. **Recency decay.** Receipts older than ~180d lose weight.
6. **Minimum-threshold gating.** Below a floor (e.g. `< 3 receipts AND
   < 2 distinct hosts`), a builder is "not yet ranked" — shown but unranked,
   not low-ranked (Stack Overflow model).

**Status:** Formula E must be designed (SQL expression + weights) BEFORE the
§H D2 lock. The next step after this doc update is: design Formula E against
the six requirements, re-run the tournament with E alongside A-D for
comparison, then lock §H. The §F.5 combined query above should be extended
with a `score_E` column at that point — it currently lacks the distinct-host,
median-confidence, event-diversity, and threshold-gating terms.

**SQL building blocks Formula E will need (not in F.5 yet):**
- `count(DISTINCT split_part(replace(replace(artifacts->0->>'url','https://',''),'http://',''),'/',1))` — distinct artifact host count
- `percentile_cont(0.5) WITHIN GROUP (ORDER BY atlas_confidence)` — median confidence
- `count(DISTINCT event_type)` — event-type diversity
- A `CASE` threshold gate returning NULL/"unranked" below the floor

### F.7 — Formula E specification (the proof-of-work-compliant formula)

> **Added 2026-05-23 (Batch 7b resume).** Implements all six required signals
> from the locked "Proof-of-work scoring discipline." Weights below are
> **TOURNAMENT CANDIDATES, not locked** — the tournament run (§F.5-equivalent,
> Step 2) decides final weights against real production data. The doc specifies
> the *shape* and *signals*; the data picks the *coefficients*.

**The six signals → SQL building blocks:**

| # | Principle | SQL term | Range |
|---|---|---|---|
| 1 | Breadth not volume | `log(2, 1 + count(DISTINCT host))` where `host = split_part(regexp_replace(lower(artifacts->0->>'url'),'^https?://(www\.)?',''),'/',1)` | log curve; 1 host→1.0, 2→1.58, 4→2.32, 8→3.17 |
| 2 | Consistency not peaks | `percentile_cont(0.5) WITHIN GROUP (ORDER BY atlas_confidence)` (median) | 0.0–1.0 |
| 3 | Reachability | `count(*) FILTER (WHERE verification_level='L1_artifact_confirmed')::numeric / NULLIF(count(*),0)` | 0.0–1.0 |
| 4 | Event-type diversity | `log(2, 1 + count(DISTINCT event_type))` | log curve; 1 type→1.0, 2→1.58, 4→2.32 |
| 5 | Recency decay | `GREATEST(0, 1 - days_since_max_issued / 180)` (linear, same as Formula A) | 0.0–1.0 |
| 6 | Threshold gate | `CASE WHEN receipts < THRESH_R AND distinct_hosts < THRESH_H THEN below-threshold` | gate, not score term |

**The formula (with tournament-candidate weights):**

```
score_E =
  CASE
    WHEN receipts < 3 AND distinct_hosts < 2   -- principle 6: threshold gate
      THEN 0   -- (operator may prefer NULL / 'below-threshold' label instead of 0)
    ELSE LEAST(100, ROUND(
        w1 * log(2, 1 + distinct_hosts)        -- (1) breadth, log-scaled
      + w2 * (median_conf * 100)               -- (2) consistency, median not avg
      + w3 * (l1_ratio * 100)                  -- (3) reachability ratio
      + w4 * log(2, 1 + event_diversity)       -- (4) event-type diversity, log-scaled
      + w5 * recency                           -- (5) recency decay, 0–1
    ))
  END

-- Tournament-candidate weights (NOT LOCKED — Step 2 tournament tunes these):
--   w1 = 14    breadth        (log hosts; up to ~44 at 8 hosts before cap)
--   w2 = 0.30  median conf    (median×100 → up to 30)
--   w3 = 0.18  reachability   (l1_ratio×100 → up to 18)
--   w4 = 8     event diversity (log; up to ~19 at 4 types)
--   w5 = 12    recency        (0–1 → up to 12)
-- Rough cap: strong realistic builder lands high-80s/90s; only multi-host,
-- high-median, fully-reachable, diverse, recent builders approach 100.
```

**Open weight options for the tournament (operator-pickable):**
- **Quality-dominant:** raise w2 (median conf) + w3 (reachability) so a small
  but high-confidence/reachable builder beats a broad-but-shallow one.
- **Breadth-dominant:** raise w1 (distinct hosts) so range across independent
  artifacts dominates — anti-single-portfolio-host gaming.
- **Balanced (above):** the candidate weights as written.
- **Threshold tuning:** the gate `(< 3 receipts AND < 2 hosts)` is operator-
  pickable. Tighter (`< 5 AND < 3`) ranks fewer; looser (`< 2 AND < 1`) ranks
  almost everyone. The tournament shows where the cut lands in the real data.

**What the tournament decides (not this doc):** final w1–w5, the threshold
cut, and whether below-threshold builders score `0` or get an explicit
`'below-threshold'` label (D2/D5 lock).

---

## G. Invariant proposals

Rules the formula must satisfy. Operator approves, revises, or rejects
each. If the chosen formula in §F violates any approved invariant, the
formula is wrong — revise weights before locking.

### G.1 — Receipt-presence invariants

- **G.1.a** Any builder with ≥1 L1 receipt at confidence ≥ 0.5 ranks
  above any builder with 0 receipts (regardless of `verified` flag).
- **G.1.b** Any builder with ≥2 L1 receipts at confidence ≥ 0.7 ranks
  in the top 50% of all published builders.
- **G.1.c** Any builder with 0 receipts AND `verified=false` ranks in
  the bottom 25% (independent of profile completeness — the engine
  hasn't seen them).

### G.2 — Event-type invariants

- **G.2.a** A `shipped_agent` receipt at confidence ≥ 0.7 outweighs a
  `published_repo` receipt at the same confidence, all else equal.
- **G.2.b** A `deployed_mcp_server` receipt outweighs a `published_repo`
  receipt at the same confidence (the platform's positioning treats
  deployed > merely-public-source).
- **G.2.c** Multiple `published_repo` receipts at low confidence do
  NOT trivially out-rank one `shipped_app` at high confidence.
  Formula must avoid quantity-dominates-quality.

### G.3 — Confidence invariants

- **G.3.a** A receipt at confidence < 0.4 contributes less than 25%
  the weight of a receipt at confidence ≥ 0.8 (matches the
  classifier's self-stated "guessing" tier).
- **G.3.b** Average confidence across a builder's receipts must
  influence ranking — a builder with 5 receipts at avg 0.3 ranks
  below a builder with 3 receipts at avg 0.85.

### G.4 — Recency invariants

- **G.4.a** A receipt published this week outweighs the same receipt
  6 months ago by at least 1.5x (recency decay must be meaningful).
- **G.4.b** A builder who hasn't shipped in 12+ months falls behind
  builders who shipped this quarter, all else equal. (Not a hard
  rule; weights determine the crossover point.)

### G.5 — Operator-vouching invariants (depend on D3)

- **G.5.a** (If D3 = c) Within a verified-vs-unverified partition,
  quality_score is the only sort.
- **G.5.b** (If D3 = a, b, or d) An operator-vouched `featured=true`
  builder may still rank below a non-featured builder with stronger
  engine signal — operator vouching is one signal among many.

### G.6 — Stability invariants

- **G.6.a** Single-receipt changes (one new L1 receipt at typical
  confidence) move rank by ≤3 positions for an existing top-10
  builder, ≤5 for a top-25 builder. Score must not jitter wildly.
- **G.6.b** Ties are broken deterministically (receipt_count desc,
  then username asc). No randomness.

---

## H. Approval gate (operator decides)

After running §F SQL blocks and reviewing the candidate formula
outputs, operator approves §G invariants and locks D1-D8.

- [ ] **D1 — Scoring inputs:** (a)/(b)/(c)/(d)/(e)/(f)/(g)
- [ ] **D2 — Formula shape:** (a) weighted sum / (b) multiplicative /
      (c) tiered / (d) log-scaled — pick based on §F observed behavior
- [ ] **D3 — `verified` interaction:** (a) drop from sort / (b) modest
      bonus / (c) primary partition / (d) redefine
- [ ] **D4 — Storage:** (a) query-time / (b) stored+write-refresh /
      (c) stored+cron — recommend (a) unless scale-driven
- [ ] **D5 — Validation:** (a) spot-check / (b) invariants / (c)
      formal validation set / (d) hybrid — recommend (d)
- [ ] **D6 — Recompute cadence:** N/A if D4=(a); else (a)/(b)/(c)/(d)
- [ ] **D7 — Operator override:** (a) featured stays / (b) featured
      informational / (c) hybrid
- [ ] **D8 — Backward-compat:** (a) clean break / (b) parallel /
      (c) feature flag

**Invariants approved** (§G):
- [ ] G.1.a, G.1.b, G.1.c
- [ ] G.2.a, G.2.b, G.2.c
- [ ] G.3.a, G.3.b
- [ ] G.4.a, G.4.b
- [ ] G.5.a or G.5.b (depends on D3)
- [ ] G.6.a, G.6.b

---

## I. Code edit + commit plan

Depends on D1-D8. Sketch under recommended-default assumptions
(D1=(e) or (f), D2=tournament-pick, D3=(c), D4=(a), D5=(d), D7=(a),
D8=(b)):

### Definite work (regardless of choices)

1. **`src/app/talent/page.tsx`** — extend the server-side data fetch.
   Replace `.order('velocity_score', desc)` with a SQL-aggregate-based
   sort using the locked §F formula. Two paths:
   - **(a) Sort in JS after fetch.** Fetch all `published=true`
     profiles with their receipt aggregates via a single Supabase
     query using nested selects + computed columns, then sort
     client-side (server-component still). Simplest; doesn't require
     a view.
   - **(b) Postgres view.** Define a view `profiles_with_quality`
     that includes the computed score. `/talent` queries the view.
     DDL — minor — but worth it for re-use by `/`, `/hirers`, MCP.
   - **(c) Postgres function.** A SQL function that returns the
     ranked-profile rowset; `/talent` calls it as RPC.
   - Recommendation: (a) for first ship, (b) if reusing across
     surfaces.
2. **`src/app/page.tsx`** — homepage fill query. Replace
   `.order('velocity_score', desc)` with the same logic.
3. **`src/app/hirers/page.tsx`** — same.
4. **`src/app/talent/TalentClient.tsx`** — quality_score chip on
   `ProfileCard` (additive per AGENTS.md invariant #6; the existing
   velocity chip stays under D8=(b)).
5. **`src/lib/jsonld/person.ts`** — emit `shipstacked:qualityScore`
   alongside the existing `shipstacked:velocityScore` (additive).

### Conditional work

- **If D4 = (b):** DDL — add `quality_score` column to `profiles`,
  trigger on `proof_receipts` insert/update/delete to recompute the
  affected entity's owner profile's score. Plus reversal SQL.
- **If D3 = (d):** new computed column `engine_verified` on profiles
  (or a function); migration + reversal SQL.
- **If D8 = (c):** env var `RANKING_USE_QUALITY_SCORE` toggling the
  sort in /talent/page.tsx, page.tsx, hirers/page.tsx.

### Estimated scope

- Files touched: 4-6.
- New files: 0-1.
- New DDL: 0 (D4=a) or 1-2 (D4=b).
- New env vars: 0 (D8=a or b) or 1 (D8=c).

### Verification

- `npx tsc --noEmit` clean.
- `npm run build` clean.
- **§J validation report regenerated post-implementation** — the
  formula's actual top-10 on prod matches the §F tournament's top-10
  (i.e., the code matches the SQL).
- Invariant tests: implement §G.1-G.6 as a test script
  (`scripts/v2/verify-quality-score.ts`) that asserts each invariant
  holds against the live data.
- Manual /talent inspection: anonymous + paid-hirer view.
- Crawler view: JSON-LD `ItemList` reflects the new top-6.

---

## J. Validation report — FILL AFTER §F + §H LOCKED

This section is intentionally empty until:
1. Operator runs §F SQL blocks and pastes results back.
2. Operator picks D1+D2 (input set + formula shape).
3. The locked formula is computed against the 42-profile dataset.

**Output shape when filled:**

- **Top 10 by locked formula** — full table with username,
  full_name, verified, receipt_count, avg_confidence, score.
- **Invariant check results** — for each §G invariant, pass/fail
  with which builders satisfy/violate.
- **Diff vs. current /talent sort** — the audit's §F SQL produces
  the current sort; this section compares positions. Net movement
  per builder.
- **Operator sign-off** — explicit confirmation that the new top-10
  matches operator intuition. No code execution before this sign-off.

---

## K. Verification — what 'green' looks like

After Phase 2 ship:

- `/talent` default sort produces the §F-locked-formula top 10 in
  the first 10 positions (verify via prod curl + parse).
- Homepage + `/hirers` reflect the new sort (same).
- All §G invariants pass against live data.
- A new receipt write for a builder X moves their `quality_score`
  measurably within one request cycle (D4 = (a) makes this
  automatic; D4 = (b)/(c) requires verifying the trigger/cron).
- `npx tsc --noEmit` clean, `npm run build` clean, deploy green.
- The verified-vs-unverified split (per D3) behaves as locked.
- Existing surfaces (`/u/[username]`, `/feed`, `/p/[slug]`,
  `/atlas/roles/[id]`) are byte-identical to pre-batch — Batch 7
  touches ranking, not display.
- `verify-agent-card.ts` against prod still passes (no AgentCard
  changes).

---

## L. Reversal

- **Code only (D4 = a):** `git revert <SHA>` returns `/talent`, `/`,
  `/hirers` to the frozen-velocity sort. No DB state to undo.
- **DDL (D4 = b or D3 = d):** reversal SQL block in this doc + commit
  message:
  ```sql
  -- D4=(b) reversal
  DROP TRIGGER IF EXISTS proof_receipts_quality_refresh ON public.proof_receipts;
  ALTER TABLE public.profiles DROP COLUMN IF EXISTS quality_score;

  -- D3=(d) reversal
  -- (depends on implementation — function drop, column drop, etc.)
  ```
- **Backfilled data (if D4=b initial population happened):** drop
  column = drop data. Reversible because the source data
  (`proof_receipts`) is untouched.

---

## M. Risks / honest notes

1. **First ranking/scoring batch.** Math choices have product
   consequences. Operator MUST run §F before locking. Don't pick a
   formula on theoretical preference; pick on observed behavior
   against the actual 42-profile dataset.

2. **`atlas_confirmed` is 0 today.** Any formula component using
   `atlas_confirmed[]` will produce zero signal. §F uses
   `atlas_inferred[]` exclusively (and confidence). If the operator
   wants to weight confirmed-vs-inferred, that requires the latent
   bug from commit `4787a7b` to land first.

3. **Verification level is binary.** All 47 receipts are
   `L1_artifact_confirmed` (or close to it). Formulas weighting L1
   vs L2+ won't differentiate until L2 background-check infra ships
   (deferred past Batch 7).

4. **The 42-profile dataset is small.** Whatever formula performs
   well today may behave unexpectedly at 200 or 2000 builders. Recommend
   re-running §J validation periodically as the dataset grows.

5. **`autoVerify.ts` criteria are V1.** Verified flag still flips
   based on 1 post + outcome + url + projects/skills. Under D3=(c)
   the operator-vouched verified flag remains the primary partition.
   Under D3=(d) the flag becomes engine-derived. The two paths have
   very different operator effort downstream — (c) means existing
   admin verify flow stays, (d) means redefining what "verified"
   means and dealing with the resulting flips.

6. **Featured flag is manual.** No auto-population. The current 6
   homepage slots are operator-picked. Whether they should be
   auto-picked from top-quality-score (D7 = c) is a positioning
   call — manual curation has value, but at 200+ builders it stops
   scaling.

7. **The formula is exposed.** Once shipped, the score becomes
   public (via JSON-LD shipstacked:qualityScore + via the
   /talent UI). Builders can reverse-engineer to game it ("ship 10
   github repos to boost"). Mitigations: confidence weighting + event
   type weighting both naturally penalize gaming patterns. But this
   is a permanent product question — operator should be aware.

8. **The "fakes" pattern is mostly closed but worth watching.** The
   3 known fakes are `published=false` and excluded. New fakes (if
   any appear) would be `published=true` and could accumulate
   receipts via Batch 5 auto-enrichment. The quality_score doesn't
   detect fakes; it ranks honestly across whoever is `published=true`.
   The fake-detection mechanism is upstream (autoVerify, admin
   review), not the ranking formula.

9. **Performance at scale.** At 42 profiles, query-time aggregation
   (D4=a) is microseconds. At 4,200 profiles, it's still fast (4,200
   × ~10μs = ~40ms). At 42,000+, may want D4=(b) with a trigger.
   Not a Batch 7 problem.

10. **The "12-point shipped bonus" in F.1 is arbitrary.** All weights
    are arbitrary at first cut. The §F tournament's job is to surface
    which COMBINATION of weights produces sensible rankings. Final
    weights should match operator intuition after seeing the output;
    they shouldn't be inherited from this doc verbatim.

---

End of doc. HALT here. Awaiting operator to:
1. Run §F.1, F.2, F.3, F.4 SQL blocks (or §F.5 combined).
2. Approve or revise §G invariants.
3. Lock D1-D8 in §H.
4. §J validation regenerated against locked formula.
5. Then Phase 2 code execution.
