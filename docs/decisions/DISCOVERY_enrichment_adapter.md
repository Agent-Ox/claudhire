# DISCOVERY — Profile→Engine Enrichment Adapter (the 18 cohort)

Date: 2026-05-19. Full pre-flight gate (net-new functional code + writes real
proof_receipts/entities to prod for the first time ever).

## GOAL

Wire the populated `profiles` graph into the existing entity/receipt engine for
the locked D5 cohort (18 verified individual builders), so they get enriched
through the engine that currently only `/paste` can reach. Engine internals
UNCHANGED — this is a new adapter feeding the existing contract.

## GROUNDED IN REAL DATA (verified: aniketaslaliya801, sunnyzheng606, yuki448)

Real profiles are heterogeneous and partially dirty. The spec below is derived
from what is actually in the DB, not assumptions:
- One profile has many artifacts of DIFFERENT kinds (Aniket: repos + Vercel
  apps + portfolio). event_type is PER-ARTIFACT, never per-profile.
- Posts carry the real ship narrative/outcomes in prose; projects are coarse
  (Yuki's 3 projects = 1 URL). Posts are the PRIMARY signal source.
- Sunny has 0 projects but his posts' GitHub URLs ARE his projects → posts and
  projects treated symmetrically as artifact sources.
- Dirty data exists but is BOUNDED and one-time: Yuki's project_url has
  trailing whitespace + "projects are available here" appended (fails
  new URL()); x_url is a bare handle. New signups go through 4-flow validated
  signup — this does NOT recur. Adapter is robust to it; adapter does NOT fix
  it (out of scope — see Non-Goals).

## ADAPTER SPEC (artifact-first, profile-conditioned)

For each of the 18 profiles:
1. Gather candidate artifact URLs from: github_url, every projects.project_url,
   every posts.url.
2. Normalize each via new URL(). If it does not parse → SKIP with reason
   `malformed_url`, record in report. (Catches Yuki's bad strings.)
3. Dedupe on (profile_id, normalized_url) — one receipt per unique artifact
   even if many posts/projects reference it. (Catches Aniket's reused repo,
   Yuki's umbrella URL.)
4. Classify event_type PER ARTIFACT by host + associated post-outcome prose:
   - `github.com/<user>/<repo>` → `published_repo`
   - `*.vercel.app` / `*.netlify.app` / `*.repl.co` / `*.replit.app` /
     non-github project_url → `shipped_site`, UPGRADED to `shipped_app` or
     `shipped_agent` when the linked post outcome prose indicates a running
     production/autonomous system (e.g. Sunny's TradeAgent: repo URL but
     outcome says "production system running 24/7 autonomously").
   - `github.com/<user>` (profile root, no repo) → `published_repo`,
     artifact = profile root (acceptable fallback).
   - posts.url = null → SKIP with reason `no_artifact_url`, record in report.
     Do NOT fabricate an artifact.
5. Build the engine input (existing contract — unchanged):
   AnalyzeInput → AnalyzeResponse → PasteDraft → publishProofReceipt →
   classifyAtlasRoles. Title/description/capabilities sourced from post
   title/outcome prose where present, else project/profile fields.
6. Entity: findOrCreateHumanEntity for the profile's owner (kind:'human' —
   unchanged; the 18 are all human individuals per D5).
7. Emit a DATA-QUALITY REPORT: every skipped artifact (url, profile, reason),
   every dedupe collapse, every malformed input. Operator-readable. This is
   the (ii) decision — skip-and-log PLUS report.

## NON-GOALS (explicit — prevent scope creep)

- NOT fixing dirty source data (Yuki's URLs). That's a separate one-time
  cleanup + the new-signup validation (already roadmap). Adapter only skips
  and reports.
- NOT changing engine internals, the classifier, the contract, or entities.kind.
- NOT touching the D2/D3 entity-graph / company / agent work (separate gated
  build; open question re: entity-as-both-supply-and-demand still unresolved).
- NOT enriching anyone outside the locked 18.

## OPEN DECISION FOR OPERATOR (before code)

event_type rule is RESOLVED (per-artifact classify above). No open semantic
default remains — the data made the decision.

One remaining gate: this is the FIRST code that writes real proof_receipts +
entities to prod (currently 0 receipts ever, 17 backfill-only entities). It is
ADDITIVE (creates rows; touches no existing data) but it is NOT reversible the
way copy is — receipts/entities are real graph data. Therefore:
  - First run = DRY RUN: adapter runs against all 18, produces the would-write
    receipts + the data-quality report, writes NOTHING. Operator reviews.
  - Real run only after operator approves the dry-run output.

## DRY-RUN FIDELITY (resolved)

Dry-run uses the FULL chain: classifyUrl + analyzePastedUrl + classifyAtlasRoles
— identical to the real run except the final publishProofReceipt /
findOrCreateHumanEntity writes are NOT called. The cheap "synthesize classifier
input from post-prose" path is REJECTED: a dry-run on a different code path
does not validate what the real run will write, which defeats the purpose of
the gate. Cost (~92 HTTP fetches + ~92 Anthropic calls, fewer after dedupe) is
accepted as correct for first-ever prod graph writes on the 18 beta builders.

## SHIP LOOP (full pre-flight — net-new code + first prod graph writes)

1. Build adapter (new module; no edits to engine/contract).
2. tsc --noEmit + build.
3. DRY RUN against the 18 → output: per-builder would-be receipts + event_type
   per artifact + full data-quality/skip/dedupe report. WRITE NOTHING.
4. HALT. Operator reviews dry-run: do the event_types look right, is the skip
   list acceptable, are dedupes correct.
5. Operator approves → REAL RUN (writes receipts + entities for the 18).
6. Verify prod: receipt count, entity count, spot-check 3 builders
   (aniket/sunny/yuki) end-to-end, data-quality report archived.
