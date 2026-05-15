# ShipStacked V2 — Step 7: Public Receipt Pages + JSON-LD + Atlas Role Dereferencing

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** Steps 1–6 (full data pipeline + publish API shipped)
**Output:** Public canonical URLs become real. Receipts render as HTML for humans and JSON-LD for agents. Atlas role IDs become dereferenceable.
**Status:** Ready to execute. Final step of the V2 spine.

---

## 0. Where Step 7 sits

```
/paste ✓ → /paste/review ✓ → publish ✓ → /p/[slug] (Step 7) → escape velocity
                                              ↑
                                          You are here
```

After Step 6, receipts exist in Postgres with canonical URLs that 404. Step 7 makes those URLs work. It's also where the **standards play** lands — every receipt becomes a dereferenceable, schema.org-marked, JSON-LD-served resource that other systems can consume.

This is the step the entire Atlas-as-infrastructure thesis hinges on. Receipts that exist only as Postgres rows are not infrastructure. Receipts that resolve to canonical URLs with JSON-LD content negotiation are.

---

## 1. Scope of this step

Two URL spaces, both with HTML + JSON-LD content negotiation:

**Receipts:**
- `/p/[slug]` — public receipt page (HTML for humans)
- `/p/[slug].json` — convenience URL returning JSON-LD
- Same `/p/[slug]` URL with `Accept: application/ld+json` returns JSON-LD via content negotiation

**Atlas roles:**
- `/atlas/roles/[id]` — Atlas role page (HTML for humans)
- `/atlas/roles/[id].json` — convenience URL returning JSON-LD
- Same `/atlas/roles/[id]` with `Accept: application/ld+json` returns JSON-LD via content negotiation

Both surfaces follow the same pattern: one route file, one server-side data fetcher, two content types, identical canonical URLs across formats.

---

## 2. What ships

### 2.1 New routes

- `src/app/p/[slug]/page.tsx` — receipt HTML page
- `src/app/p/[slug]/route.ts` — JSON-LD content negotiation handler (note: in Next 16 App Router, the same path can have both a page and a route — verify the convention, may need a different file structure)
- `src/app/p/[slug].json/route.ts` — JSON-LD convenience endpoint
- `src/app/atlas/roles/[id]/page.tsx` — Atlas role HTML page
- `src/app/atlas/roles/[id].json/route.ts` — Atlas role JSON-LD convenience endpoint

If Next 16 doesn't support page + route handler at the same path, use middleware or proxy to do the content-negotiation routing. Flag this as a deviation if it requires structural change.

### 2.2 Supporting lib

- `src/lib/receipts/render.ts` — server-side fetcher that loads a receipt by slug with all related data (subject entity, attestations, verification_events)
- `src/lib/receipts/jsonld.ts` — converts a receipt row into the JSON-LD shape per the schema in `proof-receipt-v0.1.ts` (the `ProofReceiptJsonLd` interface)
- `src/lib/atlas/roles.ts` — fetcher for atlas_roles by ID + version
- `src/lib/atlas/jsonld.ts` — converts an atlas_roles row into JSON-LD (DefinedTerm shape per the build spec)

### 2.3 Modified files

- `src/app/page.tsx` (or whatever the homepage is) — optional: add a "Recent proofs" section if it doesn't drag the homepage off-message. Flag if you take this on; otherwise skip.
- `src/app/llms.txt/route.ts` — update to enumerate the receipt and Atlas role URL spaces (if it doesn't already). The llms.txt is part of the standards play.

---

## 3. The receipt page — HTML

### 3.1 Layout

A focused single-column layout for desktop, full-bleed for mobile. Visual hierarchy:

```
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│   Event type badge (e.g. "Shipped Workflow")                  │
│                                                                │
│   <Title — large, prominent>                                  │
│                                                                │
│   by <Subject name>  ·  <Date — occurred_at>                  │
│                                                                │
│   ● L1 Artifact Confirmed                                     │
│                                                                │
│   ──────────────────────────────────────────────────────      │
│                                                                │
│   <Description rendered as markdown>                          │
│                                                                │
│   ── Atlas roles ───────────────────────────                  │
│   A4 — Agent Workflow Implementer  →                          │
│   B2 — Agent Reliability Engineer  →                          │
│                                                                │
│   ── Stack ─────────────────────────────────                  │
│   [langgraph] [claude-sonnet-4-6] [supabase]                  │
│                                                                │
│   ── Outcomes ──────────────────────────────                  │
│   • 87% tier-1 deflection                                     │
│   • 99.5% uptime, 6 months                                    │
│                                                                │
│   ── Artifacts ─────────────────────────────                  │
│   → repo: github.com/example/support-agent                    │
│   → deployment: example.com/agent-dashboard                   │
│                                                                │
│   ── Attestations ──────────────────────────                  │
│   (none yet — link to "Request attestation")                  │
│                                                                │
│   ── Share / Embed ─────────────────────────                  │
│   [Copy URL] [Share to X] [Share to LinkedIn] [JSON-LD]       │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Visual rules

- Atlas role pills link to `/atlas/roles/<id>` — that's the dereferencing in action
- Stack chips don't link anywhere (yet — Phase 1B may add capability search)
- Artifact rows link out to the original URL with `rel="noopener noreferrer"`
- Verification level shows the current level filled, future levels dimmed:
  `● L1  ○ L2  ○ L3  ○ L4` with a tooltip explaining each level on hover
- Subject name links to `/u/<entity_slug>` (the page may not exist yet — link will 404 in Phase 1A, that's OK, flag for Phase 1B profile page work)

### 3.3 Metadata in `<head>`

Critical for distribution. Include:

```html
<title>{title} — by {subject.display_name} · ShipStacked</title>
<meta name="description" content={first 160 chars of description}>
<link rel="canonical" href="https://shipstacked.com/p/{slug}">
<link rel="alternate" type="application/ld+json" href="https://shipstacked.com/p/{slug}.json">

<meta property="og:title" content={title}>
<meta property="og:description" content={first 200 chars of description}>
<meta property="og:image" content={OG card URL from ingestion_metadata.embed_card_url}>
<meta property="og:type" content="article">
<meta property="og:url" content={canonical_url}>

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content={title}>
<meta name="twitter:description" content={first 200 chars of description}>
<meta name="twitter:image" content={OG card URL}>
```

Also embed the JSON-LD inline as a `<script type="application/ld+json">` block. This is the SEO+agent-readable double-dip: humans see HTML, agents that don't do content negotiation still find the JSON-LD by parsing the page.

### 3.4 Rendering strategy

Use Next.js ISR (Incremental Static Regeneration) for receipt pages:
- `revalidate: 60` — regenerate at most once a minute when stale
- On-demand revalidation when a receipt is updated (call from publish endpoint OR from any future update flow; defer the on-demand hook to Phase 1B if it's complex)

Receipts are read-heavy. ISR is the right shape.

### 3.5 Visibility handling

- `visibility = 'public'` — fully accessible, indexed
- `visibility = 'unlisted'` — accessible at canonical URL, but `<meta name="robots" content="noindex">` AND excluded from `/feed`, `/llms.txt`, and any future search
- `visibility = 'private'` — 404 unless the requesting user is the subject (check Supabase auth)

Step 7 ships all three. Private is rare in Phase 1A (the UI defaults to public, doesn't surface private), but the schema supports it and the page should respect it.

---

## 4. The receipt page — JSON-LD

The JSON-LD shape is defined in `src/schemas/proof-receipt-v0.1.ts` as the `ProofReceiptJsonLd` interface. Implement it strictly.

### 4.1 Content negotiation

When a request hits `/p/[slug]`:
- `Accept: text/html` (or no Accept header) → return HTML
- `Accept: application/ld+json` → return JSON-LD with `Content-Type: application/ld+json`
- `Accept: application/vnd.shipstacked.receipt+json` → return the full canonical receipt shape (the internal schema, not JSON-LD). This is the "give me the raw thing" path for first-class clients.

Implementation:
- The page server component checks the Accept header
- If JSON-LD: render JSON-LD response directly, skip the HTML render
- If raw shipstacked format: render the internal schema
- Otherwise: render HTML

Convenience URLs:
- `/p/[slug].json` always returns JSON-LD regardless of Accept header

### 4.2 Atlas role refs are dereferenceable URLs

This is the standards play in microcosm. In the JSON-LD output:

```json
{
  "shipstacked:atlasRoles": [
    {
      "@id": "https://shipstacked.com/atlas/roles/A4?v=v0.4",
      "shipstacked:roleId": "A4",
      "shipstacked:source": "confirmed"
    },
    {
      "@id": "https://shipstacked.com/atlas/roles/B2?v=v0.4",
      "shipstacked:roleId": "B2",
      "shipstacked:source": "inferred"
    }
  ]
}
```

The `@id` is a real URL that other systems can fetch. Doing so returns the role definition as JSON-LD. That's how the Atlas becomes infrastructure: any system can cite a role ID, and any system can dereference the citation.

### 4.3 Caching

JSON-LD responses get:
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `ETag` based on receipt's `updated_at`

CDN-friendly. Same regeneration cadence as the HTML page.

---

## 5. The Atlas role page — HTML

### 5.1 Source of truth: the database

**This fixes the Step 5/6 carry-forward deviation.** `/atlas/roles/[id]` queries `atlas_roles` table directly with `atlas_version` parameter:

```sql
SELECT * FROM atlas_roles
WHERE role_id = $1 AND atlas_version = $2;
```

Default `atlas_version`: `v0.4` (the current Atlas).
Override via query param: `?v=v0.3` returns the v0.3 row if it exists, or 404 if not (some roles like G1-G6 only exist in v0.4).

If the role_id doesn't exist at all: 404.

### 5.2 Layout

Compact, reference-style. Not a marketing page — a dictionary entry.

```
┌────────────────────────────────────────────────────────────┐
│                                                              │
│   Cluster A · Atlas v0.4                                    │
│   A4 — Agent Workflow Implementer                           │
│                                                              │
│   🟡 Partial automation trajectory                          │
│                                                              │
│   ────────────────────────────────────────────────────      │
│                                                              │
│   <long_description_md rendered as markdown>                │
│                                                              │
│   ── Crosswalks ─────────────────────────────               │
│   ISCO-08: 2512 (Software developers) — partial             │
│   SOC 2018: 15-1252 (Software Developers) — partial         │
│   O*NET: 15-1252.00 — partial                                │
│   Status: partial (no AI-specific code in any taxonomy)     │
│                                                              │
│   ── Recent receipts at this role ──────────                │
│   [Up to 5 recent public receipts with atlas_confirmed      │
│    containing this role_id, sorted by issued_at desc]       │
│                                                              │
│   ── Adjacent roles ────────────────────────                │
│   B2 — Agent Reliability Engineer                           │
│   D2 — Agent System Architect                               │
│   (parsed from long_description_md "Adjacent roles" para,   │
│    OR just rendered inline if extraction is finicky)        │
│                                                              │
│   ── Reference ─────────────────────────────                │
│   atlas_version: v0.4                                        │
│   atlas_url: shipstacked.com/atlas#a4                        │
│   jsonld: <link to .json endpoint>                          │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### 5.3 EU AI Act mappings (where present)

For C-cluster roles and Part III roles that have `eu_ai_act_articles` populated:

```
── EU AI Act ────────────────────────────────
Articles: 9, 10, 11, 17, 43, Annex III
ISO 42001: Clause 6, Clause 8, Annex A.6.2.6, A.6.2.8
```

These render only when the columns are populated. Don't show empty sections.

### 5.4 Recent receipts at this role

Query:

```sql
SELECT pr.slug, pr.title, pr.issued_at, e.display_name, e.slug as entity_slug
FROM proof_receipts pr
JOIN entities e ON pr.subject_id = e.id
WHERE 'A4' = ANY(pr.atlas_confirmed)
  AND pr.atlas_version = 'v0.4'
  AND pr.visibility = 'public'
ORDER BY pr.issued_at DESC
LIMIT 5;
```

Show up to 5. If zero receipts: show empty state ("No public receipts at this role yet. Be the first."). Each row links to `/p/<slug>`.

This is the first place where the Atlas becomes alive — a role page shows actual people doing that work. As more receipts ship, role pages get richer.

### 5.5 Metadata

```html
<title>{role_id}: {name} — ShipStacked Atlas {atlas_version}</title>
<meta name="description" content={short_description}>
<link rel="canonical" href="https://shipstacked.com/atlas/roles/{role_id}?v={atlas_version}">
<link rel="alternate" type="application/ld+json" href="https://shipstacked.com/atlas/roles/{role_id}.json?v={atlas_version}">
```

JSON-LD embedded as `<script type="application/ld+json">` inline.

---

## 6. The Atlas role page — JSON-LD

Per the build spec's `DefinedTerm` shape:

```json
{
  "@context": [
    "https://schema.org",
    { "shipstacked": "https://shipstacked.com/schema/v0.1#" }
  ],
  "@type": ["DefinedTerm", "shipstacked:AtlasRole"],
  "@id": "https://shipstacked.com/atlas/roles/A4?v=v0.4",
  "identifier": "A4",
  "name": "Agent Workflow Implementer",
  "description": "...",
  "inDefinedTermSet": "https://shipstacked.com/atlas?v=v0.4",
  "shipstacked:cluster": "A",
  "shipstacked:automationTrajectory": "partial",
  "shipstacked:atlasVersion": "v0.4",
  "shipstacked:crosswalks": {
    "isco_08": "2512",
    "soc_2018": "15-1252",
    "onet": "15-1252.00",
    "status": "partial"
  },
  "shipstacked:euAiActArticles": null,
  "shipstacked:iso42001Sections": null,
  "shipstacked:recentReceipts": [
    "https://shipstacked.com/p/example-agent-deploy",
    "https://shipstacked.com/p/another-receipt"
  ]
}
```

Same content negotiation as receipts: `Accept: application/ld+json` returns JSON-LD; `/atlas/roles/[id].json` is the convenience URL.

---

## 7. Update llms.txt

The `/llms.txt` route should now enumerate:

```
# ShipStacked — Proof of work for the agentic economy

## Atlas

- /atlas — the practitioner-defined map (v0.4)
- /atlas/roles/A1 — AI Integration Operator
- /atlas/roles/A2 — Forward Deployed Engineer
- (... all 40 v0.4 role URLs, ordered by cluster)

## Build Feed

- /feed — recent proofs

## Receipts (sample)

- (up to 20 most recent public receipts as a starter signal)
```

Generated dynamically from `atlas_roles` and `proof_receipts` queries. Cached.

This is the file LLM crawlers and agent training pipelines read to discover ShipStacked. After Step 7, it actually describes a real surface.

---

## 8. Commit gate

Standard protocol:
- `npx tsc --noEmit` clean
- `npm run build` clean

Step 7-specific verification (terminal Claude with curl, no browser needed):

1. **Receipt HTML render:**
   - Use a receipt from Step 6's verification script (or create a fresh one via API)
   - `curl https://localhost:3000/p/<slug>` returns HTML 200
   - HTML contains: title, subject name, verification level, atlas role pills, stack chips
   - HTML head contains: canonical link, OG tags, JSON-LD `<script>` block

2. **Receipt JSON-LD content negotiation:**
   - `curl -H "Accept: application/ld+json" https://localhost:3000/p/<slug>` returns JSON-LD with correct shape
   - `curl https://localhost:3000/p/<slug>.json` returns same JSON-LD
   - `@id` matches canonical URL
   - `shipstacked:atlasRoles` array contains dereferenceable URLs to `/atlas/roles/<id>?v=v0.4`

3. **Atlas role HTML render:**
   - `curl https://localhost:3000/atlas/roles/A4` returns HTML 200
   - HTML contains: role name, cluster, automation trajectory, description, crosswalks, recent receipts section
   - HTML head contains: canonical link, JSON-LD `<script>` block

4. **Atlas role JSON-LD content negotiation:**
   - `curl -H "Accept: application/ld+json" https://localhost:3000/atlas/roles/A4` returns JSON-LD
   - `curl https://localhost:3000/atlas/roles/A4.json` returns JSON-LD
   - Shape matches Section 6
   - `@id` matches canonical URL with version

5. **Atlas v0.3 fallback:**
   - `curl https://localhost:3000/atlas/roles/A4?v=v0.3` returns v0.3 row if it exists
   - `curl https://localhost:3000/atlas/roles/G1?v=v0.3` returns 404 (G1 doesn't exist in v0.3)

6. **Visibility honoring:**
   - Create an unlisted receipt, confirm it returns 200 but with `<meta name="robots" content="noindex">`
   - (Private visibility test optional — UI doesn't surface private in Phase 1A)

7. **Receipts-at-role dereferencing loop:**
   - From a receipt's JSON-LD, follow one of the `shipstacked:atlasRoles` URLs
   - That URL returns the Atlas role JSON-LD with `shipstacked:recentReceipts`
   - One of those receipts links back to the original — closed loop, machine-traversable

8. **llms.txt update:**
   - `curl https://localhost:3000/llms.txt` returns current state with Atlas role URLs enumerated and recent receipts listed

---

## 9. Deliverables (uncommitted)

- `src/app/p/[slug]/page.tsx`
- `src/app/p/[slug]/route.ts` (if Next 16 supports same-path coexistence; flag if not)
- `src/app/p/[slug].json/route.ts`
- `src/app/atlas/roles/[id]/page.tsx`
- `src/app/atlas/roles/[id].json/route.ts`
- `src/lib/receipts/render.ts`
- `src/lib/receipts/jsonld.ts`
- `src/lib/atlas/roles.ts`
- `src/lib/atlas/jsonld.ts`
- Modified: `src/app/llms.txt/route.ts`
- `scripts/v2/verify-step-7.ts` (verification harness)

---

## 10. Deviations / notes to flag

- **Same-path page + route in Next 16:** if the App Router doesn't allow `page.tsx` + `route.ts` at the same path, propose alternatives (middleware-based content negotiation, separate `.json` path only, or rewrite to use proxy convention).
- **OG card URL retrieval:** Step 6 stored `embed_card_url` under `ingestion_metadata`. Step 7 reads it from there for `<meta property="og:image">`. If the URL points to `/og?type=receipt&slug=...` (the on-demand renderer), confirm that route is accessible from the receipt page's metadata block.
- **Atlas role page database query vs prompt-file parsing:** Step 7 MUST switch to the database for `/atlas/roles/[id]`. Confirm `atlas_roles` is being queried, not the classifier prompt file.
- **Adjacent roles parsing:** the "Adjacent roles" section in the role page (Section 5.2) requires parsing from `long_description_md`. Regex-find a paragraph starting with `**Adjacent roles.**` and extract role IDs from it. If parsing is fragile, render the section as raw markdown instead.
- **Public read on proof_receipts table:** ensure RLS policy from Step 1 allows public SELECT where `visibility = 'public'`. Same for `atlas_roles`.
- **/u/[slug] entity pages:** subject links go to `/u/<entity_slug>`. That route doesn't exist yet (it's Phase 1B). Flag the link as a known-404 until profile pages ship. Don't build them in Step 7.

---

## 11. Escalate if

- Next 16's App Router has no clean way to serve both HTML and JSON-LD from the same path even via middleware — propose a fallback design (e.g., HTML only at `/p/<slug>`, JSON-LD only at `/p/<slug>.json`, content negotiation deferred)
- `atlas_roles` table schema mismatches what the spec expects (e.g., `eu_ai_act_articles` column missing — should exist per Step 1's migration, confirm)
- ISR + Supabase service role authentication has a deployment quirk that needs resolution
- Recent receipts query is unexpectedly slow at scale (unlikely with low row count, but check the index from Step 1 supports the query plan)

---

## 12. Report when ready

- File structure
- Results of the 8 verification scenarios from §8
- Any deviations
- Note on which Next 16 routing approach you took for content negotiation
- Sample JSON-LD outputs from both a receipt and an Atlas role (paste 20-30 lines of each so we can spot-check the schema)
- tsc + build pass confirmation

DO NOT commit until Thomas reviews the JSON-LD outputs and verification results.

---

## 13. After Step 7 ships

V2 spine complete.

The full flow becomes:

```
User pastes URL → /paste (Step 5)
              → classify (Step 2) → analyze (Step 3) → atlas-classify (Step 4)
              → /paste/review (Step 5)
              → publish (Step 6) → receipt persisted in Postgres
              → /p/[slug] (Step 7) → public canonical URL, HTML + JSON-LD
              → /atlas/roles/[id] (Step 7) → dereferenceable taxonomy
```

After Step 7 closes:

1. **Manual end-to-end browser smoke test against production** — non-negotiable. Walk the full flow as a user. 20-30 min of attention.
2. **Address known follow-ups:** the `*(NEW in v0.X)*` TOC asterisk drift, the middleware→proxy deprecation, and any items the smoke test surfaces.
3. **Begin Phase 1B planning:** the GH-600 distribution moves we discussed earlier, profile-as-index migration, GitHub auto-sync extractor, MCP server.

The V2 spine is a complete product when Step 7 ships. Everything after is expansion, not foundation.

---

*End of Step 7 spec.*
