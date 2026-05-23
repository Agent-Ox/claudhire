# AUDIT — 5-bucket alignment against locked spec §A.9

Consolidated read-only audit. Performs the system-wide alignment audit
the locked spec calls for in `SESSION_2026-05-19_DECISIONS.md` UPDATE
2026-05-22 §"GOVERNS the system-wide alignment audit":

> "every surface, flow, table, feature, and capability is evaluated
> against this model. Five buckets: CORE / WEAK / LEGACY-KILL /
> MISSING / AMBIGUOUS."

Prepared at HEAD `7b88014` on 2026-05-23. No code mutation. No DDL. No
new recommendations beyond what's already locked in spec.

---

## Bucket definitions (per A.9)

- **CORE** — directly serves the locked spec; works correctly; load-bearing.
- **WEAK** — serves the locked spec but has gaps, partial implementation, or known issues.
- **LEGACY-KILL** — V1 plumbing that contradicts the locked spec; should be removed.
- **MISSING** — locked spec calls for this; not yet built.
- **AMBIGUOUS** — present but unclear how it relates to the locked spec; needs operator decision.

Spec references used throughout:
- **A.1** D1 positioning (Doc A)
- **A.2** D10 LinkedIn-style linking
- **A.3** Composable modes (UPDATE 2026-05-19 c)
- **A.4** Customer/Entity/Mode/Role (UPDATE 2026-05-22)
- **A.5** 4-card signup router
- **A.6** Value proposition
- **A.7** Standing copy rule (Employer → Hirer/Buyer)
- **A.8** Money-aware prioritization
- **INV1-INV8** AGENTS.md invariants

---

## §1 — Routes (`src/app/**/page.tsx`)

41 route directories total. Each bucketed below.

| Route | Bucket | Rationale | Spec ref |
|---|---|---|---|
| `/` (homepage) | CORE | Marketing entry; emits WebSite JSON-LD (INV5); features verified builders | A.1, A.6 |
| `/atlas` | CORE | Atlas long-form essay; engine taxonomy surface | D7 |
| `/atlas/roles/[id]` | **WEAK** | Recent-receipts filter on `atlas_confirmed` only; renders empty for every role since enrichment writes only `atlas_inferred`. Latent bug recorded 2026-05-23 in SESSION doc "Known issues — deferred" | D7, INV5 |
| `/talent` | **WEAK** | Sort uses `velocity_score` which has no writer post-Batch-1; engine-derived ranking signals unused; latent exposures (atlas role / verification level / stack / capability filters) not yet shipped | A.1 ranking, AUDIT_ranking_machinery |
| `/u/[username]` | **WEAK** | Atlas role chip filter on `atlas_confirmed` only (same bug as `/atlas/roles/[id]`); receipts surface CORE otherwise | A.1, INV2, INV5 |
| `/p/[slug]` | CORE | Proof receipt page with content negotiation (HTML/JSON/LD); the V2 atomic primitive | A.1, INV5, INV7 |
| `/collections/[slug]` | CORE | Consented Collections HTML; 4-gate published filter (INV2); content negotiation (INV7) | Gateway spec |
| `/collections/[slug]/optin` | CORE | Builder consent flow for collection membership | Gateway spec |
| `/feed` | CORE | Build Feed with `profiles!inner` published-gate (INV2) | Doc A, INV2 |
| `/feed/[id]` | CORE | Individual post + Article JSON-LD | INV5 |
| `/paste` | CORE | Receipt ingestion entrypoint (Step 1 of `/paste/review` flow) | A.1 engine |
| `/paste/review` | CORE | User-confirmation step (the only path that writes `atlas_confirmed`) | A.1 engine, D7 |
| `/join` | CORE | 4-card signup router shipped per A.5 (Batch 4, commit `3fd69a0`) | A.5 |
| `/login` | CORE | Auth entry | universal |
| `/signup` | CORE | 308 stub → `/join`; preserves bookmarks (INV6 additive) | A.5 transition |
| `/dashboard` | CORE | Builder self-management surface | A.1 |
| `/dashboard/edit` | CORE | Profile editor; client-side direct supabase write (per Batch 5 §D.6) | A.1 |
| `/jobs` | CORE | Job board; published-gate enforced | Doc A |
| `/jobs/[id]` | CORE | Individual job page | Doc A |
| `/post-job` | CORE | Hirer post-job UX (paid surface via subscriptions gate) | A.3 Hirer mode |
| `/messages` | CORE | Message inbox (generic) | Doc A |
| `/hirer` | CORE | Hirer dashboard landing (Batch 3 terminology pass) | A.7 |
| `/hirer/messages` | CORE | Hirer-side message inbox | A.3, A.7 |
| `/hirers` | CORE | Paid hirer landing page (Batch 3 rename from `/employers`) | A.7 |
| `/employer` | CORE | 308 stub → `/hirer` (Batch 3 redirect; INV6 preservation) | A.7 transition |
| `/employer/messages` | CORE | 308 stub → `/hirer/messages` | A.7 transition |
| `/employers` | CORE | 308 stub → `/hirers` | A.7 transition |
| `/company/[slug]` | CORE | Hirer company public profile (reads `employer_profiles`) | Doc A |
| `/admin` | CORE | Admin operational console (operator-only) | operational |
| `/admin/candidates` | **AMBIGUOUS** | Outreach queue UI; unclear if locked-spec-aligned post-2026-05-22 (the "outreach engine" predates the Customer/Entity/Mode/Role model) | — |
| `/admin/candidates/import` | **AMBIGUOUS** | Same — admin candidate import path | — |
| `/api-docs` | **WEAK** | References "Velocity Score" + "Builder API" framing; D12 flags Velocity Score as "vanity"; copy drift not yet swept | D12, A.7 |
| `/auth/callback` | CORE | OAuth callback | universal |
| `/client/inbox` | **AMBIGUOUS** | "Client" inbox path; predates the A.4 terminology fix (should be "Buyer" per A.7); unclear if functionally distinct from `/hirer/messages` or duplication | A.4, A.7 |
| `/get-found/[id]` | **AMBIGUOUS** | Reads `jobs` table; purpose unclear from name; possibly job-to-builder reverse-discovery surface (not in locked spec) | — |
| `/hire-confirm` | CORE | Post-hire confirmation flow | Doc A revenue |
| `/privacy` | CORE | Legal page | universal |
| `/terms` | CORE | Legal page | universal |
| `/reset-password` | CORE | Auth flow | universal |
| `/set-password` | CORE | Auth flow | universal |
| `/update-password` | CORE | Auth flow | universal |
| `/success` | CORE | Stripe checkout success | A.3 paid toggle |

**Counts:** CORE 32, WEAK 4, LEGACY-KILL 0, MISSING 0 (see §4 for missing capabilities), AMBIGUOUS 4.

---

## §2 — API endpoints (`src/app/api/**/route.ts`)

53 endpoints total. Bucketed by purpose.

| Endpoint | Bucket | Rationale | Spec ref |
|---|---|---|---|
| `/api/enrich` | CORE | Batch 5 auto-enrichment orchestrator; the closure of the CRITICAL OPEN from 2026-05-19 | CRITICAL OPEN, A.1 |
| `/api/paste/classify` | CORE | V2 ingestion pipeline step 1 | A.1 engine |
| `/api/paste/analyze` | CORE | V2 ingestion pipeline step 2 | A.1 engine |
| `/api/paste/publish` | CORE | V2 ingestion pipeline step 3; sole `proof_receipts` writer | A.1 engine |
| `/api/mcp` | CORE | Streamable HTTP MCP endpoint (Beacon 5) | Beacon 5 spec |
| `/api/collections/[slug]/csv` | CORE | CSV projection of Consented Collection | Gateway, INV7 |
| `/api/collections/[slug]/jsonld` | CORE | JSON-LD projection of Consented Collection | Gateway, INV5, INV7 |
| `/api/collections/[slug]/optin` | CORE | Opt-in endpoint for builders | Gateway |
| `/api/collections/[slug]/optin/redeem` | CORE | Consent token redemption | Gateway |
| `/api/collections/[slug]/optout` | CORE | Opt-out endpoint | Gateway |
| `/api/p/[slug]/jsonld` | CORE | Receipt JSON-LD projection (content negotiation) | INV5, INV7 |
| `/api/atlas/roles/[id]/jsonld` | CORE | Atlas role JSON-LD projection | INV5, INV7, D7 |
| `/api/feed` | CORE | Feed reader (powers homepage feed widget) | Doc A |
| `/api/feed/jobs` | CORE | Jobs feed projection | Doc A |
| `/api/jobs` | CORE | Jobs CRUD | Doc A |
| `/api/jobs/xpost` | **AMBIGUOUS** | Auto-cross-post jobs to X; not in locked spec | — |
| `/api/v1/builds` | CORE | V1 builder API — agent-as-supply posts builds (Card 3 path per D11 Phase 1) | A.5 Card 3, D11 |
| `/api/v1/profile` | **WEAK** | V1 builder API profile read; output includes `velocity_score` (D12 drift) | A.5 Card 3, D12 |
| `/api/v1/me` | **WEAK** | Same — includes `velocity_score` in serialization | D12 |
| `/api/v1/avatar` | CORE | V1 avatar handling | A.5 Card 3 |
| `/api/keys` | CORE | API key generation for Card 3 agent signup | A.5 Card 3 |
| `/api/messages` | CORE | Messaging CRUD | Doc A |
| `/api/messages/[id]` | CORE | Individual message | Doc A |
| `/api/messages/unread` | CORE | Unread count | Doc A |
| `/api/comments` | CORE | Feed comments CRUD | Doc A |
| `/api/comments/likes` | CORE | Comment reactions | Doc A |
| `/api/inquiry` | CORE | Hirer inquiry capture | Doc A |
| `/api/apply` | CORE | Job application | Doc A |
| `/api/saved-profiles` | CORE | Paid-hirer shortlist | A.3 Buyer mode |
| `/api/welcome` | CORE | Signup welcome email | A.5 |
| `/api/checkout` | CORE | Stripe checkout entrypoint ($199 trigger) | A.3 paid toggle |
| `/api/webhooks/stripe` | CORE | Stripe webhook handler | A.3 |
| `/api/hirer/cancel` | CORE | Subscription cancellation | A.3 |
| `/api/hirer-logo` | CORE | Hirer logo upload | Doc A |
| `/api/builders/geo` | CORE | Geo aggregation (homepage map widget) | INV2 |
| `/api/avatar` | CORE | Avatar upload | universal |
| `/api/profile/verify-check` | CORE | `autoVerify.ts` trigger endpoint | Doc A |
| `/api/auth/confirm` | CORE | Email confirmation flow | universal |
| `/api/client-magic-link` | **AMBIGUOUS** | "Client" magic link (terminology drift per A.7) | A.7 |
| `/api/magic-link` | CORE | Magic-link auth | universal |
| `/api/verify-request` | CORE | Email verification request | universal |
| `/api/logout` | CORE | Logout | universal |
| `/api/github/callback` | CORE | GitHub OAuth callback | Doc A |
| `/api/github/connect` | CORE | GitHub OAuth initiation | Doc A |
| `/api/github/sync` | CORE | GitHub data sync | Doc A |
| `/api/join/team` | CORE | Card 2 signup endpoint per A.5 | A.5 Card 2 |
| `/api/join/buyer` | CORE | Card 4 buyer-only signup endpoint per A.5 | A.5 Card 4 |
| `/api/hire-confirm` | CORE | Hire confirmation creation | Doc A |
| `/api/hire-confirm/count` | CORE | Hire count (homepage badge) — note: badge was killed per Batch 1; endpoint may be dead reader | Batch 1 |
| `/api/hire-confirm/nudge` | CORE | Hire confirmation reminder (cron-secret gated) | operational |
| `/api/admin/verify` | CORE | Admin manual verify-flag toggle | operational |
| `/api/admin/candidates/draft` | **AMBIGUOUS** | Admin draft generation for outreach candidate | — |
| `/api/admin/candidates/import` | **AMBIGUOUS** | Admin candidate import | — |
| `/api/admin/candidates/log` | **AMBIGUOUS** | Admin outreach log | — |
| `/api/admin/candidates/next` | **AMBIGUOUS** | Admin next-candidate (sort by tier + priority + velocity) | — |

**Counts:** CORE 47, WEAK 2, LEGACY-KILL 0, MISSING 0 (see §4), AMBIGUOUS 6.

---

## §3 — Database tables

Tables in `supabase/migrations/` (10 V2 tables explicitly created) plus V1 tables inferred from prior audits (`SITE_AUDIT_2026-05-16.md`, `SHIPSTACKED_ARCHITECTURE_MAP.md`).

### V2 tables (explicit migrations)

| Table | Bucket | Rationale | Spec ref |
|---|---|---|---|
| `entities` | CORE | The entity record per A.4 ("one record per customer") | A.4 |
| `atlas_roles` | CORE | Canonical role taxonomy; dereferenceable, versioned | D7 |
| `proof_receipts` | CORE | The atomic primitive; sole writer is `paste/publish.ts` (plus enrichment adapter via same path) | A.1 engine |
| `verification_events` | **WEAK** | Append-only ladder log; only L0/L1 writers exist today (L2 background-check infrastructure not built) | D7 ladder |
| `attestations` | **WEAK** | Schema-supported; no L3+ writer exists (`/paste/review` user-confirmation does not produce attestations) | D7 ladder |
| `capabilities_vocab` | CORE | Harvested controlled vocabulary; populated per receipt publish | A.1 engine |
| `ingestion_log` | CORE | Provenance + debugging trail | A.1 engine |
| `collections` | CORE | Consented Collections root | Gateway |
| `collection_memberships` | CORE | Per-builder collection consent | Gateway |
| `consent_tokens` | CORE | Time-bounded consent token issuance | Gateway |

### V1 tables (pre-existing, validated against locked spec)

| Table | Bucket | Rationale | Spec ref |
|---|---|---|---|
| `profiles` | CORE | The supply identity record; published-gate (INV2) is the universal exclusion | A.4, INV2 |
| `posts` | CORE | Build Feed posts | Doc A |
| `projects` | CORE | Project narratives on profiles | Doc A |
| `skills` | CORE | Skill chips (V1 self-reported) | Doc A |
| `github_data` | CORE | GitHub linkage; feeds Velocity Score (now stale per Batch 1) and Person JSON-LD | Doc A |
| `subscriptions` | CORE | Stripe $199 subscription state; gates Hirer mode | A.3 paid toggle |
| `jobs` | CORE | Job board | Doc A |
| `applications` | CORE | Job applications | Doc A |
| `employer_profiles` | CORE | Hirer-side identity record (paid Buyer Mode entity per A.3, before A.4 unified everything under `entities`) | A.3 Buyer mode |
| `saved_profiles` | CORE | Paid-hirer shortlist | A.3 Buyer mode |
| `messages` | CORE | Messaging | Doc A |
| `comments` | CORE | Feed comments | Doc A |
| `comment_likes` | CORE | Comment reactions | Doc A |
| `hire_confirmations` | **LEGACY-KILL** | 0 rows (per SITE_AUDIT); badge that referenced it was killed in Batch 1; readers may still exist | Batch 1 |
| `claim_submissions` | **LEGACY-KILL** | LIVE writer at `/api/intakes/claim` but `/claim` route was killed in Batch 1; no in-code reader survives (per SHIPSTACKED_ARCHITECTURE_MAP.md §4.2) | Batch 1, Doc B SUPERSEDED |
| `outreach_log` | **AMBIGUOUS** | Operational outreach tracking; not in locked spec | — |
| `candidates` | **AMBIGUOUS** | Operational outreach candidate queue; `velocity_score` column here is separate from `profiles.velocity_score` | — |

**Counts:** CORE 19, WEAK 2, LEGACY-KILL 2, MISSING (see §4), AMBIGUOUS 2.

---

## §4 — Modes / Profile Types / Transaction Roles per A.3 + A.4

| Concept (per spec) | Implementation today | Bucket |
|---|---|---|
| Entity (one record per customer) | `entities` table + bidirectional `profiles.entity_id` link | CORE |
| Profile Type: Solo AI Builder | Card 1 → `profiles` row → `findOrCreateHumanEntity` → `entities` row | CORE |
| Profile Type: Team / Agency / Studio | Card 2 → `/api/join/team` creates `entities` row with `kind='team'`; **no member-linking, no team profile page** | **WEAK** (signup-only) |
| Profile Type: Autonomous Agent | Card 3 → minimal profile + API key; agent posts via `/api/v1/builds`; Phase 1 only (D11) | CORE (Phase 1 only) |
| Buyer-only entity | Card 4 → `/api/join/buyer` creates `entities` with `kind='human'` no profile | CORE |
| Builder/Supply mode (earned via proof) | Receipts exist; **"≥1 verified receipt → badge" UX not implemented; "thresholds → ranking" not implemented** (Batch 7 quality scoring is the discovery) | **MISSING** |
| Team/Agency mode (declarative overlay) | Card 2 creates the entity but **no entity-relationships table** to link members | **MISSING** |
| Hirer/Buyer mode (paid toggle) | `subscriptions.product='full_access'` gates `/talent` paywall + `/post-job` + outbound; **the "enable Buyer Mode on existing supply entity → $199/mo immediately" UX is not built** | **WEAK** |
| Relationships: Works-At/Affiliated-With | No table | **MISSING** |
| Relationships: Owns/Sponsors (entity→agent) | No table | **MISSING** |
| Relationships: Hired (past engagement) | `hire_confirmations` table exists with 0 rows; relationship semantics not active | **MISSING** |
| Transaction Role: Seller/Supply | Default state; all surfaces operate on this assumption | CORE |
| Transaction Role: Buyer/Hirer | `subscriptions` row + `/post-job` + paywall — operates as a permanent mode toggle, not "fluid per transaction" as A.4 spec calls for | **WEAK** |

**Counts:** CORE 5, WEAK 3, LEGACY-KILL 0, MISSING 5, AMBIGUOUS 0.

---

## §5 — Features and capabilities

| Feature | Bucket | Rationale | Spec ref |
|---|---|---|---|
| Auto-enrichment on signup (Card 1) | CORE | Batch 5 ship; CRITICAL OPEN closed for solo builders | CRITICAL OPEN |
| Auto-enrichment on signup (Card 2/3/4) | **MISSING** | Per Batch 5 §D4: skipped/deferred by design; needs team-graph and agent-build-post paths first | A.5 |
| Verification level ladder L1 → L2 → L3 → L4 | **WEAK** | Schema supports all 5 levels (L0 + L1-L4); only L0/L1 have code paths; L2 background-check + L3 attestation UI not built | D7 ladder, Beacon 5 |
| `atlas_confirmed` writer (user-confirmation path) | CORE | Only `/paste/review` writes it; enrichment writes only `atlas_inferred` (this is the latent bug surface on `/atlas/roles/[id]` + `/u/[username]` chips) | D7, Known issues 2026-05-23 |
| `verified` flag (V1 autoVerify) | **WEAK** | Criteria are V1 (post with outcome+url, projects/skills) — does NOT reflect engine activity. AUDIT_ranking_machinery §G.2 pattern 2 names this | A.1 ranking |
| `velocity_score` (V1 ranking signal) | **LEGACY-KILL** | Batch 1 deleted the writer; 14+ readers remain incl. /talent/page/hirers sort. Replacement is Batch 7 quality scoring (discovery committed, not executed) | D12, Batch 7 discovery |
| Quality scoring engine (Batch 7) | **MISSING** | Discovery doc committed; §F formula tournament SQL issued; §H not locked; no code shipped | A.1 ranking, A.3 EARNED |
| `/talent` filter facets (atlas role/verification/stack/capability) | **MISSING** | Batch 6 discovery doc committed; §F SQL run pending; §H not locked; no code shipped | A.3 ranking, D1 engine surfacing |
| Periodic re-verification of receipts | **MISSING** | Today's link-health audit shows 88% live, 12% dead; L2 background-check infrastructure not built; cron infrastructure also not built (Batch 5 §D6) | Implied by Doc A engine, AUDIT link-health 2026-05-23 |
| Yuki-class URL validation guard | CORE | Batch 7a ship (commit `7b88014`); three-layer defense | data-quality discipline |
| Brand-free invariant | CORE | INV3 + mechanized via `verify-agent-card.ts` `BRAND_ALLOWLIST_FORBIDDEN` | INV3 |
| Published-gate fake exclusion | CORE | INV2 enforced at every list/aggregate surface | INV2 |
| Slug == username invariant | CORE | INV1 enforced at backfill + `personId()` | INV1 |
| One-source markup builders | CORE | INV5 — Person/Organization/WebSite/AgentCard/Collections JSON-LD all single-source | INV5 |
| Additive-never-subtractive on existing surfaces | CORE | INV6 — 308 stubs preserve URLs (e.g., `/employer` → `/hirer`) | INV6 |
| Content negotiation (.json/.csv/Accept header) | CORE | INV7 — middleware rewrites + alternate-link tags | INV7 |
| AgentCard accuracy guarantee | CORE | INV8 — `verify-agent-card.ts` curls every declared URL | INV8 |
| MCP `get-builder` no-oracle property | CORE | `getPublishedProfile` shared between `/u/[username]` and MCP; fake-vs-nonexistent indistinguishable | Beacon 5 |
| `/atlas/roles/[id]` recent-receipts display | **WEAK** | Filters on `atlas_confirmed` only → empty for every role (0 receipts have confirmed roles). Documented in SESSION doc "Known issues — deferred" 2026-05-23 | Known issues |
| Standing copy rule retroactive rename | **WEAK** | A.7 says "applies retroactively (next copy/refactor pass), not as urgent rename." Route stubs shipped; corpus-wide audit of "Employer" / "Client" terminology still pending (see /client/inbox, /api/client-magic-link, /api-docs Velocity Score refs) | A.7 |

**Counts:** CORE 13, WEAK 5, LEGACY-KILL 1, MISSING 4, AMBIGUOUS 0.

---

## §6 — Batches executed since locked spec

Per `git log --since='2026-05-19'`. Each batch noted with its bucket-impact.

| Commit | Batch | Bucket-impact |
|---|---|---|
| `c08f13e` | H1 reframe revert (D6) | Moved positioning copy from WEAK → CORE |
| `ee425ac` | Lock 2026-05-19 decisions in doc | Doc-only |
| `b6e66bd` | 4-type model + LinkedIn linking | Spec-only |
| `a65860e` | D4 final 4-flow voices | Spec-only |
| `83538a6` | Kill `/claim` + `/hire` dead flow | Removed LEGACY-KILL items (Doc B residue) |
| `6045f96` | Doc B copy drift removal across atlas/llms/employers/homepage | Removed LEGACY-KILL copy |
| `9ecc723` | Profile→engine adapter + 55 receipts cohort backfill | Moved engine from MISSING → CORE (manual only) |
| `73d5589` | UPDATE (c) composable modes spec | Spec-only |
| `c29e489` | CRITICAL OPEN recorded | Doc-only |
| `9de11e1` | Standing principle + 5a discovery | Spec-only |
| `55964dd` | UPDATE 2026-05-22 Customer/Entity/Mode/Role | Spec-only — locks yardstick (A.4) |
| `20cbd43` | Batch 1 KILL pass discovery | Doc-only |
| `c5d46af` | Batch 1 KILL pass commit A — deletions | Moved velocity_score writer + /leaderboard from CORE → LEGACY-KILL (executed kill) |
| `9c40fd7` | Batch 1 errata — dead NavBar/sitemap links | Cleanup |
| `f219f1d` | Batch 1 Commit B execution record | Doc-only |
| `926dab4` | Batch 2 modes discovery | Doc-only |
| `94cf847` | Batch 2 single-role → composable modes refactor | Moved Solo/Team/Buyer modes from MISSING → WEAK (foundation only) |
| `ce3731b` | Batch 3 terminology discovery | Doc-only |
| `d1e9eae` | Batch 3 terminology pass: Employer → Hirer/Buyer | Moved A.7 standing copy rule from MISSING → WEAK (route stubs; corpus rename pending) |
| `f340afb` | Batch 4 join router discovery | Doc-only |
| `3fd69a0` | Batch 4 `/join` 4-card router | Moved A.5 router from MISSING → CORE |
| `3c5e986` | Batch 5 auto-enrichment discovery | Doc-only |
| `702fdb0` | Batch 5 auto-enrichment ship | Moved auto-enrichment from MISSING → CORE (Card 1 only) |
| `d36f954` | Batch 5 dedupe_key regex fix | Bug-fix |
| `4787a7b` | Note atlas_confirmed-only latent bug | Doc-only |
| `19a233e` | Reusable enrich-by-usernames script | Tooling |
| `7b88014` | Batch 7a Yuki-class URL validation guard | Closed data-quality class; added smoke test |

**Plus today's read-only audits:** Batch 6 facets discovery + Batch 7 quality scoring discovery (both `docs/decisions/DISCOVERY_*.md` — discovery committed; execution pending §F SQL + §H lock).

---

## §7 — Top 5 MISSING items by load-bearing priority

Ordered by spec-distance and downstream impact.

1. **Quality scoring engine** (Batch 7 discovery, not executed). The closest to A.3 "Builder/Supply EARNED, not toggled. Auto-activates/strengthens via verified proof (≥1 verified receipt → badge; thresholds → ranking)." Without it, the locked spec's central claim about how the platform ranks supply is unimplemented. `/talent` slot 1-6 (anonymous-visible) is ordered by frozen V1 plumbing per AUDIT_ranking_machinery. Spec ref: A.1, A.3.

2. **Entity relationships table** (Works-At / Affiliated-With / Owns / Sponsors / Hired). A.3 names these explicitly; A.2 specifies the LinkedIn-style linking model. None of them are stored. Card 2 (Team/Agency) creates the entity but has no way to link members. Card 3 (Agent) creates the entity but has no way to link to principal. Spec ref: A.2, A.3, A.4.

3. **`/talent` filter facets** (Batch 6 discovery, not executed). Engine output (`atlas_inferred`, `verification_level`, `event_type`, stack, capabilities) is unused by any discovery filter; the locked "machine-verified, not self-reported" positioning isn't visible in the discovery surface. Spec ref: A.1 engine, A.3 ranking.

4. **Builder mode auto-badge on first verified receipt**. A.3 specifies "Auto-activates/strengthens via verified proof (≥1 verified receipt → badge)." Today receipts accumulate but no visible "builder mode active" indicator transitions in or out. Spec ref: A.3.

5. **Periodic re-verification of receipts (L2 infrastructure)**. Today's link-health audit shows 11.7% of receipts point at dead artifacts. The schema supports L2 (`L2_technically_checked`); no writer exists. Without periodic re-checks, the engine's "machine-verified" claim degrades over time. Spec ref: D7 ladder, A.1.

---

## §8 — Top 5 LEGACY-KILL items

Ordered by spec-violation severity. Note: most are blocked by other work (named in "What blocks removal").

1. **`velocity_score` column readers (3 ranking sort sites + 11 display sites).** Batch 1 deleted the writer; readers remain. Contradicts D12 ("Velocity Score is flagged-vanity… do not extend a weak metric"). **Blocks removal:** Batch 7 quality scoring must ship first so the ranking sort has a replacement.

2. **`claim_submissions` table (V1 Doc B residue).** Writer at `/api/intakes/claim` still exists; `/claim` route killed in Batch 1; no in-code reader survives per SHIPSTACKED_ARCHITECTURE_MAP.md §4.2 ("LIVE writer, NO in-code reader"). Contradicts D1 (Doc B SUPERSEDED). **Blocks removal:** decide whether to retain rows as data archaeology or delete; the writer endpoint itself can be killed independently.

3. **`hire_confirmations` table.** 0 rows per pre-audit; badge was killed in Batch 1; the count endpoint `/api/hire-confirm/count` may still serve dead data. Contradicts INV6 in the abstract sense ("additive never subtractive on existing user-facing surfaces" — but this surface is dead). **Blocks removal:** verify no other reader; check `/api/hire-confirm/nudge` still has operational purpose.

4. **`api-docs/page.tsx` Velocity Score references** + **`/api/v1/profile` + `/api/v1/me` velocity_score field in output.** D12 drift. Contradicts A.7 (Velocity Score → flagged-vanity terminology). **Blocks removal:** Batch 7 quality scoring lands; replace `velocity_score` with `quality_score` in API output; update api-docs copy.

5. **`/api/admin/candidates/*` outreach engine** (4 endpoints + `outreach_log` + `candidates` tables). Predates the A.4 Customer/Entity/Mode/Role lock; operational tooling that may or may not align with current direction. **Blocks removal:** operator confirmation — is the outreach engine current strategy or a pre-2026-05-22 artifact? Currently classified AMBIGUOUS pending that call.

---

## §9 — Open AMBIGUOUS items requiring operator decision

| Item | Question | Spec context |
|---|---|---|
| `/client/inbox` + `/api/client-magic-link` | Is "Client" the legacy term for what A.4 now calls "Buyer"? If so → standing copy rule (A.7) retroactive rename applies. Or is "Client" semantically distinct (a builder's hiring contact)? | A.4, A.7 |
| `/get-found/[id]` | Purpose of this route is unclear from name + brief inspection (reads `jobs`). Is it part of a reverse-discovery flow (builders found by hirers via job match)? In locked spec or legacy? | — |
| `/admin/candidates`, `/admin/candidates/import`, `/api/admin/candidates/*` (4 endpoints), `outreach_log`, `candidates` table | The outreach engine — keep, kill, or migrate? Currently operational tooling. Not in 2026-05-22 lock. | — |
| `/api/jobs/xpost` | Auto-cross-post jobs to X. Not in locked spec. Operator distribution mechanism or legacy? | A.8 prioritization principle context |
| `claim_submissions` table data retention | If LEGACY-KILL #2 proceeds, retain rows or DELETE? 2 known test rows from operator's own email per SITE_AUDIT. | Batch 1 |
| `hire_confirmations` table data retention | Same question — 0 rows so easy, but the table itself + `/api/hire-confirm` writer suggest hire-tracking is intentional, just not active. Is hire-tracking part of A.3 "Hired (past engagement)" relationship? | A.3 |

---

## §10 — Bucket counts summary

Aggregated across §1 (routes), §2 (APIs), §3 (tables), §4 (modes/roles), §5 (features). Items appear in only one section.

| Bucket | Routes | APIs | Tables | Modes/Roles | Features | **Total** |
|---|---:|---:|---:|---:|---:|---:|
| **CORE** | 32 | 47 | 19 | 5 | 13 | **116** |
| **WEAK** | 4 | 2 | 2 | 3 | 5 | **16** |
| **LEGACY-KILL** | 0 | 0 | 2 | 0 | 1 | **3** |
| **MISSING** | 0 | 0 | 0 | 5 | 4 | **9** |
| **AMBIGUOUS** | 4 | 6 | 2 | 0 | 0 | **12** |

**Total items audited: 156.**

CORE represents **74.4%** of inventory — the platform is mostly aligned. The 16 WEAK items and 9 MISSING items are concentrated in two clusters:
- Ranking + engine-surfacing (§5 features tied to A.3 EARNED mode + A.1 engine visibility)
- Relationships / entity graph (§4 modes/roles tied to A.2 + A.4)

LEGACY-KILL items (3) are bounded and mostly blocked by Batch 7 quality scoring landing.

AMBIGUOUS items (12) cluster around the outreach engine (5 of 12) — single operator decision unblocks most.

---

## §11 — Sources consolidated

- `docs/decisions/SESSION_2026-05-19_DECISIONS.md` — locked yardstick + all UPDATE notes through 2026-05-23
- `docs/decisions/DISCOVERY_batch1_kill_pass.md` through `DISCOVERY_batch7_quality_scoring.md` (7 discovery docs)
- `docs/decisions/AUDIT_ranking_machinery.md`
- `docs/audit/SITE_AUDIT_2026-05-16.md`
- `docs/audit/SHIPSTACKED_ARCHITECTURE_MAP.md`
- `docs/audit/MERGE_DISCOVERY.md`
- `docs/audit/STEP_3_DISCOVERY.md`
- `docs/audit/KILLERS_2026-05-16.md`
- `AGENTS.md` (8 invariants)
- Direct reads: `src/app/**/page.tsx`, `src/app/api/**/route.ts`, `supabase/migrations/*.sql`, `git log --since='2026-05-19'`

---

End of audit. No code mutation performed. Operator reviews the bucketing
and the §7-§9 prioritization before deciding next batch.
