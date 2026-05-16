# `src/lib/jsonld/` — Beacon 1 builders

Schema.org JSON-LD emitters for ShipStacked V1 pages. Mirrors the V2
pattern already established in:
- `src/lib/receipts/jsonld.ts` (proof receipts at `/p/[slug]`)
- `src/lib/atlas/jsonld.ts` (atlas roles at `/atlas/roles/[id]`)

**Do not modify the V2 emitters from this module — they're the
gold-standard reference.** This module reconciles V1 inline emitters
to the same dual-context shape so the whole site is one graph keyed by
URL `@id`.

## Spec / discovery

- Spec: `docs/v2/TIER_3_BEACON_1_SCHEMA_ORG_SPEC.md`
- Discovery: `docs/audit/BEACON_1_DISCOVERY.md`

## Namespace

All builders use:

```ts
'@context': [
  'https://schema.org',
  { shipstacked: 'https://shipstacked.com/schema/v0.1#' },
]
```

`shipstacked:` extensions namespace ShipStacked-specific fields without
breaking schema.org consumers.

## Builders

| Module | Builder | Used by |
|---|---|---|
| `context.ts` | shared `@context`, `@id` helpers | every other builder |
| `organization.ts` | `buildOrganizationJsonLd()` | `src/app/layout.tsx` (site-wide) |
| `website.ts` | `buildWebsiteJsonLd()` | `src/app/page.tsx` (homepage) |
| `person.ts` | `buildPersonJsonLd(profile, entity, skills, projects, github)` | `src/app/u/[username]/page.tsx` (Noah-gateway-critical) |
| `job-posting.ts` | `buildJobPostingJsonLd(job, employer)` | `src/app/jobs/[id]/page.tsx` (dormant — 0 active jobs) |
| `employer-org.ts` | `buildEmployerOrgJsonLd(company)` | `src/app/company/[slug]/page.tsx` |
| `article.ts` | `buildArticleJsonLd(post, author)` | `src/app/feed/[id]/page.tsx` |
| `item-list.ts` | `buildItemListJsonLd({listUrl, listName, items})` | `/leaderboard`, `/talent`, `/jobs`, `/employers` |
| `atlas-article.ts` | `buildAtlasArticleJsonLd(wordCount)`, `buildAtlasDefinedTermSetJsonLd(atlasVersion, roleIds)` | `src/app/atlas/page.tsx` |

## Honest-field hygiene

Every optional field and every `shipstacked:` extension is emitted **only
when the underlying value is present + non-empty**. No false-suppressed
boolean assertions (e.g. `shipstacked:verified` emitted only when `true`,
never as `false`). No fabricated metrics. Tier 0 truthfulness rule applies.

## Empty-suppression for `ItemList`

`buildItemListJsonLd()` returns `null` when items is empty. Callers
should check the return value and skip the `<script>` tag entirely on
null — no empty list noise.

## Fake-exclusion guarantee

The 3 fakes (`jennypeterson224`, `johnchambers73`, `oxleethomasagentox598`)
are `published=false` post-Tier-1. Their `/u/<username>` URLs 404 →
`buildPersonJsonLd` is never invoked for them. Every page that emits
an `ItemList` of Person references uses a query that filters
`published=true` (or `published=true AND velocity_score > 0`), so fakes
are excluded at the data source. Confirmed in BEACON_1_DISCOVERY.md §F.

## `@id` cross-references

One URL keys both V1 and V2 markup of the same resource:

- `Organization` (ShipStacked itself): `https://shipstacked.com/#org`
- `WebSite`: `https://shipstacked.com/#website` → references the Organization
- `Person`: `https://shipstacked.com/u/<username>` — **same `@id`** the V2
  receipt's `author['@id']` already uses (`src/lib/receipts/jsonld.ts:111`)
- `Organization` (employer): `https://shipstacked.com/company/<slug>`
- `JobPosting`: `https://shipstacked.com/jobs/<id>` → references employer `@id`
- `Article` (Build Feed post): `https://shipstacked.com/feed/<id>` → references author `@id`
- `Article` (Atlas): `https://shipstacked.com/atlas`
- `DefinedTerm` (Atlas role): `https://shipstacked.com/atlas/roles/<id>?v=<version>` — V2, untouched
- `CreativeWork` (Proof receipt): `https://shipstacked.com/p/<slug>` — V2, untouched

This is the load-bearing structural prerequisite the Noah founding-beta
gateway consumes.
