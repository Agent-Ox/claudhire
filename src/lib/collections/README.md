# `src/lib/collections/` — Consented Collections (generic platform feature)

A permanent platform feature: ShipStacked supports arbitrarily many named
collections of builders. Each builder opts in per collection. Approved
partners can ingest any collection's machine-readable form.

## Standing rules (load-bearing)

- **Collections are DATA.** A row in `public.collections` defines what
  exists. There is NO hardcoded slug anywhere in this module or the
  routes/dashboard that consume it.
- **`slug: string` is always a parameter.** No `COLLECTION_SLUG_*`
  constants. Creating a new collection = inserting a row (via
  `scripts/v2/create-collection.ts`).
- **No partner / program / brand names in code or copy.** The dashboard
  card substitutes `{collection.title}` and `{collection.description}`
  from the row at render time. Human-readable specifics live in DB rows,
  not in source.
- **Beacon 1's `src/lib/jsonld/person.ts` is REUSED byte-unchanged.**
  This module wraps its output; it does not modify it.
- **Four gates enforce inclusion** at every read of any projection:
  1. `collections.active = true` (collection live)
  2. `profiles.published = true` (post-Tier-1 universal gate; covers fakes)
  3. `collection_memberships.opted_out_at IS NULL` (consent still active)
  4. fake-exclusion is automatic via #2 (the 3 fakes are `published=false`)

## Files

| File | Purpose |
|---|---|
| `context.ts` | Shared types (`CollectionRow`, `MembershipRow`, `ConsentSource`, `CollectionGateError`). URL helpers. Re-exports `CANONICAL_HOST` from `src/lib/jsonld/context.ts`. NO slug constants. |
| `collections.ts` | `getCollection(slug)`, `listActiveCollections()`, `requireActiveCollection(slug)`, `isValidSlug(slug)`. The slugs-as-data layer. |
| `consent.ts` | `optIn(profile_id, slug, source, metadata)`, `optOut(profile_id, slug)`, `isConsented(profile_id, slug)`, `getActiveMembership(profile_id, slug)`, `listMembershipsForProfile(profile_id)`. Both gates re-checked on every write. |
| `tokens.ts` | `mintToken(profile_id, slug, ttl)`, `inspectToken(token)`, `redeemAndConsume(token)`, `revokeToken(token)`. Single-purpose by construction. |
| `assemble.ts` | `getConsentedCollection(slug)` — the **single source** that loads the consented + published builder set with profile/entity/skills/projects/github bulk-loaded. The one-source invariant lives here. |
| `jsonld.ts` | `buildCollectionJsonLd(collection, data)` — wraps Beacon 1 Person markup in `ItemList` + `shipstacked:BuilderCollection`. |
| `csv.ts` | `buildCollectionCsv(data)` — RFC 4180 projection from the same `ConsentedCollection`. |

## One-source invariant (the test that proves it works)

JSON-LD, CSV, and HTML projections must all reflect the same builder set
at any point in time. They do, because each calls
`getConsentedCollection(slug)` once and renders from that result. Opt-out
propagates simultaneously because there is exactly one query.

H9 verification proves this per-collection: opt-in test builder into
`test-alpha` → fetch JSON-LD + CSV + HTML → builder present in all three.
Opt-out → refetch → builder absent from all three. Independently for
`test-beta`. Cleanup before commit so the production `collections` table
is empty.

## What this module does NOT do

- Does NOT know what any collection is for. Code never branches on slug
  value.
- Does NOT auto-enroll any builder. Default: not in any collection.
- Does NOT send emails. The token-mint script outputs URLs; the
  out-of-band send is operator-controlled.
- Does NOT modify Beacon 1's `person.ts` or any V2 emitter
  (`src/lib/receipts/jsonld.ts`, `src/lib/atlas/jsonld.ts`).
- Does NOT name any partner, program, or brand in any string or comment.
