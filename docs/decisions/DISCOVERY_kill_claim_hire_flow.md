# DISCOVERY — Kill the /claim + /hire Doc-B intake flow (structural deletion)

Date: 2026-05-19. Full pre-flight gate (deletes routes + APIs + dead enum).

## WHAT & WHY
The /claim + /hire flow is a Doc-B-era dead-end intake. Verified this session:
- Forms POST to /api/intakes/* which only `.insert` into claim_submissions /
  hire_intakes. ZERO readers anywhere (never referenced in src/lib or
  src/services). Write-only dead-end tables.
- No profile/account/entity ever created. User lands on a thanks page.
- Enrichment engine NOT connected (verified): claim/hire APIs touch none of
  findOrCreateHumanEntity / publishProofReceipt / classifyAtlasRoles /
  profiles. "atlas_roles" is a stored string in the dead table, NOT the
  classifier. Engine inlet remains /paste, untouched.
- It is the "second front door" contradicting locked Doc A + 4-flow model
  (D1/D9). Real front door is /join (4-card router).

## EXACT FOOTPRINT (total)
Delete: src/app/claim/, src/app/hire/, src/app/api/intakes/claim/,
src/app/api/intakes/hire/, src/app/atlas/StickyAtlasCTA.tsx.
Edit src/app/atlas/page.tsx: remove the two /hire+/claim CTA pairs (~645/646,
~737/738) and the StickyAtlasCTA import+render; replace each removed pair with
ONE `<Link href="/join">Join ShipStacked →</Link>` (type-agnostic; /join
4-card router sorts all 4 profile types).
Edit src/schemas/proof-receipt-v0.1.ts: remove the 'claim_flow' enum member
(~L92) and rewrite the ~L99 JSDoc to drop the /claim reference.

## INVARIANT #6 NOTE
Removing 'claim_flow' is NOT a #6 violation. #6 = "additive, never subtractive
on user-facing surfaces." 'claim_flow' is an internal zod enum value with ZERO
writers — never written by any code, never stored, no consumer depends on it.
It described a receipt-source that /claim never actually was. Keeping it to
appear additive would preserve a false reference in the schema. Removal is in
scope and correct.

## DO NOT TOUCH
- /hire-confirm (different flow — real hire-confirmation, not this intake).
- /paste subtree / enrichment engine (verified unrelated).
- claim_submissions / hire_intakes DB TABLES (leave; additive-only; dropping
  tables is a separate DDL decision). Only code paths removed.

## SUPERSESSIONS (record in main decisions doc)
- Supersedes approved copy-fixes for claim/page.tsx:7 & :211 (surface deleted).
- Supersedes atlas/page.tsx CTA drift lines (646/738) — replaced by /join CTA.
- hire/page.tsx:209 drift fix moot (surface deleted).
- Consciously dropped: /claim was the only UI capturing human self-declared
  Atlas-role intent. Data was worthless (no readers). If future enrichment
  wants that signal, rebuild inside /join (correct front door). Deliberate.

## REMAINING COPY-FIX SET (separate lighter-gate batch, after this ships)
page.tsx:261 (delete Doc-B line); employers/page.tsx:181 ("No agencies" → "No
recruiters. No placement fees."); employers/page.tsx:210 (drop "solo");
atlas/page.tsx:15,17,734 + atlas-article.ts JSON-LD (Doc-A reword, drop
"agentic economy / discovery & classification layer / 28 roles"); llms.txt:
28,34,53 (Doc-A descriptor); get-found:165 ("23 roles"→"open roles");
client/inbox:213 (drop "500+").

## SHIP LOOP (full pre-flight — structural)
1. Apply deletions + atlas/page.tsx + schema edits locally.
2. npx tsc --noEmit (must pass).
3. npm run build (route changes — green; /claim,/hire,/api/intakes/* gone from
   manifest; build completes).
4. grep -rnE "/claim|/hire[\"']|StickyAtlasCTA|/api/intakes|claim_flow" src/
   (excl /hire-confirm) → MUST be true zero. Any hit = STOP.
5. HALT — report tsc + build + grep. Operator approves push.
6. Push → prod-verify: /claim,/hire 404; /atlas single "Join ShipStacked →" →
   /join; homepage + /join unaffected.
