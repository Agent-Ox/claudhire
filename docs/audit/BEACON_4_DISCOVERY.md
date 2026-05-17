# Tier 3 — Beacon 4: Atlas as an Installable Package — DISCOVERY (Phase 1)

**Author:** Claude (Opus 4.7, 1M context) — read-only discovery
**Date:** 2026-05-16
**Spec:** `docs/v2/TIER_3_BEACON_4_ATLAS_PACKAGE_SPEC.md` §4
**Status:** Phase 1 complete. STOP. Awaiting Thomas's explicit Section H approval before any Phase 2 mutation.
**Governing principles (Spec §3):** one source of truth provably; package version bound to Atlas content version (hard-fail on mismatch); **publish-ready, NOT published** (no `npm publish` ever in this spec — irreversible name claim is a separate Thomas-only future act); brand-free; zero secrets; additive code-only.
**Method:** read-only. Mapped the full Atlas data flow from markdown → parser → DB → site → JSON-LD. Inventoried `src/lib/atlas/`, `src/content/atlas-v*.md`, `scripts/seed-atlas-roles.ts`, `/atlas/page.tsx`, `/atlas/roles/[id]/page.tsx`, `/api/atlas/roles/[id]/jsonld/route.ts`. Researched current typed-data packaging conventions via npm + Node docs. Probed prod live (`/atlas/roles/A1.json` → 200 application/ld+json) to confirm consumer-facing shape. No DB queries, no repo files modified except this report.

---

## ⚠️ Pre-flight finding: the Atlas "source" is two layers, not one

The Atlas is not stored as a code constant. The actual data flow:

```
src/content/atlas-v04.md       (markdown narrative — THE textual source of truth)
        │
        ▼
scripts/seed-atlas-roles.ts    (parseAtlas function at line 152 — markdown → role rows)
        │
        ▼
Postgres `atlas_roles` table   (DB cache, populated by the seed script)
        │
        ▼
src/lib/atlas/roles.ts         (getAtlasRole — DB fetcher)
        │
        ▼
/atlas/roles/[id]/page.tsx     (HTML)
/api/atlas/roles/[id]/jsonld   (JSON-LD via src/lib/atlas/jsonld.ts)
```

The package's "single source" therefore must be `(markdown, parser)`, not the DB. The DB is downstream of both, and could in theory drift from the markdown if (a) the markdown is edited without re-running the seed, or (b) someone edits `atlas_roles` rows directly. **This shapes the entire C/D design below — the equivalence proof must include a live-prod check that catches both drift modes, not just a build-time markdown→data check.**

---

## SECTION A — The Atlas single source, fully mapped

### A.1 Where the data lives

| Layer | Path | Role | Notes |
|---|---|---|---|
| **Markdown (canonical)** | `src/content/atlas-v04.md` (1,191 lines) | Authored prose; **the textual source of truth** | v0.4 narrative. 44 roles (38 H3-style `### A1. Name 🟡` + 6 inline-bold `**C5. Name.**`). |
| **Markdown (prior version)** | `src/content/atlas-v03.md` (827 lines) | Prior version; still referenced by `ATLAS_VERSIONS` | v0.3 narrative. |
| **Parser** | `scripts/seed-atlas-roles.ts` (333 lines) | Converts markdown → role rows | `parseAtlas` at line 152, helpers at lines 53–151 (`detectTrajectory`, `cleanName`, `firstSentence`, `extractShortDescription`, `extractCrosswalk`, `extractEuAiAct`). Currently NOT exported. |
| **DB cache** | Postgres `atlas_roles` table | Idempotent upsert target of seed | Schema in `supabase/migrations/` (the proof_receipts migration includes it as part of V2). |
| **DB fetcher** | `src/lib/atlas/roles.ts` (138 lines) | `getAtlasRole(supabase, roleId, version)` | The site's only path to role data. Constants: `ATLAS_VERSION_DEFAULT = 'v0.4'`, `ATLAS_VERSIONS = ['v0.3', 'v0.4'] as const`. |
| **JSON-LD builder** | `src/lib/atlas/jsonld.ts` (2.1 KB) | `atlasRoleJsonLd(role, recentReceipts)` → `AtlasRoleJsonLd` | Beacon 1 / V2 markup. `@type: ['DefinedTerm', 'shipstacked:AtlasRole']`. |
| **HTML page** | `src/app/atlas/roles/[id]/page.tsx` | Renders role HTML + inline JSON-LD | Calls `getAtlasRole(adminClient, id.toUpperCase(), version)`. |
| **JSON-LD API route** | `src/app/api/atlas/roles/[id]/jsonld/route.ts` | Returns pure `application/ld+json` | Same `getAtlasRole` path; serialized through `atlasRoleJsonLd`. |
| **Long-form overview page** | `src/app/atlas/page.tsx` | Renders the full v0.4 markdown narrative | Reads `src/content/atlas-v04.md` directly via `fs.readFile` AND queries `atlas_roles` for the role list. |

### A.2 The shape the package must expose

From `src/lib/atlas/roles.ts:19-35`:

```ts
export interface AtlasRoleRow {
  role_id: string
  atlas_version: string
  cluster: string
  name: string
  short_description: string
  long_description_md: string | null
  automation_trajectory: 'resistant' | 'partial' | 'collapsible' | null
  isco_08_code: string | null
  soc_2018_code: string | null
  onet_code: string | null
  crosswalk_status: 'confident' | 'partial' | 'gap' | 'combined' | null
  eu_ai_act_articles: string[] | null
  iso_42001_sections: string[] | null
  created_at: string
}
```

The package will expose this shape (minus `created_at` — a DB artifact unrelated to the taxonomy). It will also expose:
- `ATLAS_VERSION_DEFAULT: 'v0.4'` (the current version)
- `ATLAS_VERSIONS: readonly ['v0.3', 'v0.4']`
- `AtlasVersion` type
- A roles map / array per version
- Helper: `getAtlasRoleById(id: string, version?: AtlasVersion): AtlasRoleData | null`
- Optionally: the JSON-LD builder `atlasRoleJsonLd(role)` so consumers can produce the same `application/ld+json` the site serves.

### A.3 Live-prod sanity (verified during this discovery)

`curl https://shipstacked.com/atlas/roles/A1.json` → `200 application/ld+json` with the full Beacon-1 `AtlasRoleJsonLd` shape. The package's JSON-LD output must match this byte-for-byte for any given role.

---

## SECTION B — Current packaging standard + proposed brand-free name

### B.1 Conventions verified from real sources (npm + Node.js v26+ docs)

| Field | Status | Notes |
|---|---|---|
| `name` | **required** | ≤214 chars, lowercase, URL-safe |
| `version` | **required** | semver-parseable (e.g. `0.4.0`, NOT `v0.4`) |
| `exports` | **strongly recommended** for new packages | "modern alternative to 'main'"; supersedes `main`/`types` |
| Conditional `exports.types` | **must be listed FIRST** | Per Node docs: *"This condition should always be included first."* |
| `type: "module"` | **recommended** for new packages | ESM-first default |
| `files` allowlist | **strongly recommended** | Controls published tarball contents; preferred over `.npmignore` |
| `license` | **strongly recommended** | Required for publish-readiness; **no LICENSE file currently exists in this repo** (see G) |
| `repository` | **recommended** | npm links back |
| `keywords`, `description` | **recommended** | discoverability |
| `engines.node` | **recommended** | declare Node version expectations |
| `private` | **must NOT be true** | Host `package.json` has `"private": true` — that's the SITE manifest; the package gets its own manifest without it |

### B.2 Proposed brand-free package name: **`@shipstacked/atlas-roles`**

- Scoped under `@shipstacked` (matches the existing shipstacked.com canonical-host and the `shipstacked:` JSON-LD namespace prefix Beacon 1 uses; not a partner/brand name — it's the project's own identity).
- Descriptor `atlas-roles` describes what the package contains.
- Alternative considered: `@shipstacked/atlas` (shorter; rejected because the long-form `/atlas` page emits an Article markup that this package does NOT include — naming it `/atlas` would imply the package contains the article too).
- Alternative considered: unscoped `shipstacked-atlas-roles` (rejected — scoped names match modern convention and reserve the org namespace for future packages like `@shipstacked/agent-card-schema` or `@shipstacked/proof-receipt-schema`).

**Per §3, this discovery PROPOSES the name; Thomas approves before any future publish; registry availability is NOT probed in Phase 1 or Phase 2 (probing implies intent — the availability check + claim belongs to the separate future publish act). The name string also gets enforced by Beacon-2's `BRAND_ALLOWLIST_FORBIDDEN` invariant — verified: `@shipstacked/atlas-roles` contains zero forbidden tokens.**

### B.3 Package shape (recommended)

```
packages/atlas-roles/
├── package.json          (manifest — name, version, exports, types, files, license, ...)
├── README.md             (brand-free; documents data shape, import pattern, provenance)
├── LICENSE               (MIT proposed — see G)
├── tsconfig.json         (build config; emits .js + .d.ts to dist/)
├── scripts/
│   └── build.ts          (the one-source build: imports shared parser, reads ../../src/content/atlas-v04.md, emits dist/ + asserts version binding)
│   └── verify.ts         (the equivalence proof: compares dist/ output to live prod /atlas/roles/<id>.json for every role)
├── src/
│   ├── index.ts          (re-exports types + roles + helpers)
│   ├── types.ts          (AtlasRoleData, AtlasVersion, etc.)
│   ├── jsonld.ts         (re-exports / re-implements atlasRoleJsonLd for consumer parity)
│   └── data/
│       ├── roles-v0.3.json   (generated by build.ts; committed for diff-detection)
│       └── roles-v0.4.json   (generated by build.ts; committed for diff-detection)
└── dist/                 (build output — NOT committed; .gitignored)
    ├── index.js
    ├── index.d.ts
    └── ...
```

---

## SECTION C — The one-source mechanism (the load-bearing design)

### C.1 The two options Spec §4.3 names

| Option | How drift becomes impossible | Verdict |
|---|---|---|
| **Shared module** | Package literally re-exports a host-repo module; no copy exists → no drift possible | **Not feasible here** — the site reads from a Postgres table, not from a code module. The package cannot share runtime data with a DB the site queries. |
| **Codegen** | Build step regenerates package data from upstream source; equivalence asserted at gate | **Recommended** — see C.2 |

### C.2 Recommended: **codegen from the markdown via the shared parser, with a two-layer equivalence proof**

The mechanism:

1. **Extract the parser** (`parseAtlas` + helpers at `scripts/seed-atlas-roles.ts:53-263`) into a new shared module **`src/lib/atlas/parse.ts`**.
2. **Modify `scripts/seed-atlas-roles.ts`** to `import { parseAtlas } from '../src/lib/atlas/parse.ts'` instead of defining it inline. **Behavior-preserving refactor** — the seed script still parses the same markdown the same way and produces the same DB rows. (Verified design-side; would be verified live in Phase 2 H7 by running the seed against a fresh DB and asserting row-identical output.)
3. **Package build script** `packages/atlas-roles/scripts/build.ts` imports `parseAtlas` from the same `src/lib/atlas/parse.ts`, reads `src/content/atlas-v04.md` + `atlas-v03.md`, emits `packages/atlas-roles/src/data/roles-v0.X.json` for each version, and runs the TypeScript compiler to produce `dist/`.
4. **The JSON snapshots in `packages/atlas-roles/src/data/` are committed**. A re-run of the build that produces different bytes = drift detected at the gate.

### C.3 The two-layer equivalence proof

Spec §3: *"the same invariant class as Consented Collections' one-source rule and Beacon 1's reuse rule"* and **"provable byte/structural equivalence"** — not "probably." Two layers, both must pass:

**Layer 1 — Build-time (markdown → JSON snapshot):**
- Re-run `packages/atlas-roles/scripts/build.ts`.
- Diff the freshly-generated `roles-v0.4.json` against the committed `roles-v0.4.json`.
- Byte match required. Any difference = the committed snapshot is stale; the gate fails until regenerated and committed.

**Layer 2 — Gate-time (package data ≡ live site data):**
- `packages/atlas-roles/scripts/verify.ts` iterates over every role in the package's roles-v0.4.json data.
- For each, `curl https://shipstacked.com/atlas/roles/<role_id>.json` and parse the response.
- Structurally compare the fields the package exposes (role_id, name, cluster, short_description, automation_trajectory, isco_08_code, soc_2018_code, onet_code, crosswalk_status, eu_ai_act_articles, iso_42001_sections) against what the package would produce for that role.
- **Any mismatch = HARD FAIL.** The gate refuses to ship.

This catches:
- Markdown edited without re-seeding the DB → site serves stale data → Layer 2 catches it.
- DB rows hand-edited away from the markdown → Layer 2 catches it.
- Package built from stale markdown → Layer 1 catches it.
- Parser changed in a way that produces different output → Layer 1 catches it.

**Net invariant:** the package and the live site provably cannot disagree without the gate failing.

### C.4 Tradeoffs honestly stated

- **Network dependency at the gate.** Layer 2 requires reachability of `https://shipstacked.com`. If the site is down or unreachable from CI/local at gate time, the gate fails. **Acceptable** — gate cannot ship a drifted package even if the site is temporarily unavailable; the failure mode is "wait and retry," not "ship a lie."
- **Layer 2 traverses 44 + 35 = 79 HTTP calls** at gate time. Sequential = ~30-60s. **Acceptable** — Beacon 2's verify-agent-card.ts already follows this pattern with 11 curls; this just scales up.
- **Layer 2 fetches PROD, not local.** Verifies what consumers actually get. If a future Phase 2 ships a different version of the parser BUT the prod site hasn't been redeployed yet, Layer 2 fails until the site is also redeployed. **Correct ordering invariant** — package cannot ship before site reflects the same source.
- **Seed-script edit is the only existing-file modification.** Spec §3 says *"No existing site file's behavior changes."* The seed script is not a site file (it's a one-shot admin script), and the edit is behavior-preserving (extracts inline functions into a module + imports them back). Net DB rows produced = identical. See §F for the explicit confirmation plan.

---

## SECTION D — Version binding (hard-fail on mismatch)

### D.1 The mapping

- Source: `ATLAS_VERSION_DEFAULT = 'v0.4'` in `src/lib/atlas/roles.ts:13`.
- Source format: `v<major>.<minor>` — NOT semver (leading `v`, no patch).
- Mapping function: strip leading `v`, append `.0` patch if missing.
  - `'v0.4'` → `'0.4.0'`
  - `'v0.3'` → `'0.3.0'` (would only matter if Atlas content version became the default)
  - `'v1.0'` → `'1.0.0'`
- Package version stored in `packages/atlas-roles/package.json` `"version"`.

### D.2 The enforcement

In `packages/atlas-roles/scripts/build.ts`, BEFORE emitting any artifacts:

```ts
import { ATLAS_VERSION_DEFAULT } from '../../../src/lib/atlas/roles.ts'
import pkg from '../package.json' with { type: 'json' }

const expected = ATLAS_VERSION_DEFAULT.replace(/^v/, '') + (/^\d+\.\d+\.\d+$/.test(ATLAS_VERSION_DEFAULT.slice(1)) ? '' : '.0')

if (pkg.version !== expected) {
  throw new Error(
    `Atlas version binding broken: package.json version is "${pkg.version}" but ATLAS_VERSION_DEFAULT is "${ATLAS_VERSION_DEFAULT}" (expected package version "${expected}"). ` +
    `Update packages/atlas-roles/package.json "version" to "${expected}" OR bump ATLAS_VERSION_DEFAULT — they must agree.`
  )
}
```

**Mismatch = build failure.** No way to silently ship a package whose version disagrees with the Atlas content version.

### D.3 What this does NOT cover (honestly)

- This binds the *default* Atlas version to the package version. The package exposes BOTH v0.3 and v0.4 data (since `ATLAS_VERSIONS = ['v0.3', 'v0.4']`); the version field tracks the *default* version only. If someday `ATLAS_VERSION_DEFAULT` becomes `'v1.0'` while v0.4 is still exposed alongside, the package version becomes `1.0.0` and v0.4 data is still importable as `import { rolesV04 } from '@shipstacked/atlas-roles'`. The version reflects "the canonical default Atlas version this package release carries."
- Semver patch bumps (e.g. `0.4.0` → `0.4.1`) are NOT auto-bound (no constant tracks patch). If a typo is fixed in the markdown that doesn't change role IDs / structure, the package version stays `0.4.0` — same Atlas content version, just corrected text. This is correct behavior for a taxonomy where the *version* is a content version, not a release version.

---

## SECTION E — Publish-readiness checklist + pack-contents verification

### E.1 Publish-readiness checklist

- ✅ `name`: `@shipstacked/atlas-roles` (B.2)
- ✅ `version`: `0.4.0` (bound to `ATLAS_VERSION_DEFAULT` per D)
- ✅ `description`: brand-free; says "ShipStacked Atlas role taxonomy" + provenance
- ✅ `license`: MIT (proposed — see G)
- ✅ `type: "module"` (ESM-first)
- ✅ `exports` with `types`-first conditional ordering per Node convention
- ✅ `files` allowlist: `["dist/", "README.md", "LICENSE"]` only — no specs, no markdown, no src/, no scripts/
- ✅ `repository.url` + `repository.directory: "packages/atlas-roles"`
- ✅ `keywords`: e.g. `["taxonomy", "atlas", "schema.org", "defined-term", "labor", "agentic", "ai"]` (no brand/partner names)
- ✅ `engines.node`: `">=18"` (matches Next 16's runtime expectation)
- ✅ NO `private: true` (publish-ready)
- ✅ README.md documents: what's exposed, how to import, what the provenance is, what changes between versions, what the LICENSE permits.
- ✅ `npm pack --dry-run` lists ONLY allowlisted contents.

### E.2 Proposed `package.json` skeleton

```json
{
  "name": "@shipstacked/atlas-roles",
  "version": "0.4.0",
  "description": "The ShipStacked Atlas — a practitioner-defined role taxonomy of the agentic economy. Data + Schema.org/DefinedTerm helpers, generated from the canonical markdown source the live shipstacked.com/atlas pages also render.",
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./jsonld": {
      "types": "./dist/jsonld.d.ts",
      "import": "./dist/jsonld.js"
    },
    "./data/v0.4": {
      "types": "./dist/data/roles-v0.4.d.ts",
      "import": "./dist/data/roles-v0.4.js"
    },
    "./data/v0.3": {
      "types": "./dist/data/roles-v0.3.d.ts",
      "import": "./dist/data/roles-v0.3.js"
    }
  },
  "files": [
    "dist/",
    "README.md",
    "LICENSE"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Agent-Ox/shipstacked.git",
    "directory": "packages/atlas-roles"
  },
  "keywords": [
    "taxonomy",
    "atlas",
    "schema.org",
    "defined-term",
    "labor-market",
    "agentic",
    "ai-roles",
    "iso-42001",
    "eu-ai-act",
    "isco-08"
  ],
  "engines": {
    "node": ">=18"
  }
}
```

### E.3 Pack-contents verification (publish-adjacent, registry-untouched)

`cd packages/atlas-roles && npm pack --dry-run` lists exactly what `npm publish` WOULD ship. Expected output (allowlist):

```
@shipstacked/atlas-roles@0.4.0
=== Tarball Contents ===
LICENSE
README.md
dist/index.js
dist/index.d.ts
dist/jsonld.js
dist/jsonld.d.ts
dist/types.js
dist/types.d.ts
dist/data/roles-v0.3.js
dist/data/roles-v0.3.d.ts
dist/data/roles-v0.4.js
dist/data/roles-v0.4.d.ts
package.json   (always included by npm, even without files allowlist)
```

**Phase 2 gate REQUIRES**: zero entries from `docs/`, zero entries from `src/` (host site source), zero entries from `scripts/` (admin scripts), zero `.env*`, zero markdown `src/content/atlas-*.md`. The `files` allowlist + `.npmignore` belt-and-braces guarantees this.

### E.4 What this spec EXPLICITLY does NOT do (the load-bearing publish boundary)

- ❌ **Never runs `npm publish`.** The publish itself is an irreversible public claim on the package name, decoupled from this spec the same way creating the first real Consented Collection was decoupled from building the Collections capability. Thomas-only future act; name approved at that time; registry availability checked at that time.
- ❌ **Never runs `npm view @shipstacked/atlas-roles`** or any other registry-probing command. Probing implies intent and produces telemetry; that belongs to the future publish act.
- ❌ **Never runs `npm login`** or touches any auth state.
- ❌ **Never opens a registry connection.** `npm pack --dry-run` is local-only and the ONLY registry-adjacent thing this spec permits.

---

## SECTION F — Confirmation: no site behavior change; no Beacon 1-3 / Collections / V2 file affected; no secrets/brand/strategic content

### F.1 Files NOT modified (Phase 2 will assert byte-unchanged at the gate)

- `src/lib/jsonld/person.ts` — Beacon 1 sole-Person-writer (the standing byte-unchanged invariant since 0ceb69a).
- All of `src/lib/jsonld/` (`organization.ts`, `website.ts`, `article.ts`, `atlas-article.ts`, `person.ts`, `context.ts`, `item-list.ts`, `employer-org.ts`, `job-posting.ts`, `README.md`).
- All of `src/lib/agent-card/` (Beacon 2 builder + README).
- All of `src/lib/collections/` (Consented Collections: assemble, jsonld, csv, consent, tokens, context, collections).
- All of `src/lib/receipts/`, `src/lib/atlas/jsonld.ts`, `src/lib/atlas/roles.ts` (DB fetcher), `src/lib/entities.ts`.
- All site routes: `/atlas/`, `/atlas/roles/[id]/`, `/p/[slug]/`, `/u/[username]/`, `/feed/`, `/jobs/`, `/collections/[slug]/`, `/.well-known/agent-card.json/`, `/llms.txt/`, `/sitemap.xml/`, etc.
- `src/middleware.ts` (content negotiation rewrites — Beacon 1/V2/Collections).
- `src/content/atlas-v04.md`, `src/content/atlas-v03.md` (the markdown source — read-only consumer here).
- `AGENTS.md`, `CLAUDE.md` (Beacon 3).
- `scripts/v2/verify-agent-card.ts` (Beacon 2 accuracy gate).
- `package.json` (the host site manifest — the new package gets its OWN manifest under `packages/atlas-roles/`).
- `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs` (the new package gets its OWN `tsconfig.json` under `packages/atlas-roles/`).

### F.2 The ONE existing file proposed for behavior-preserving edit

**`scripts/seed-atlas-roles.ts`** — extracts the `parseAtlas` function + helpers into `src/lib/atlas/parse.ts` and imports them back. Net behavior:

- Same input markdown → same parsed role rows → same DB upsert.
- Functional output: byte-identical to pre-edit (verifiable by running both versions against the same markdown and diffing).
- Why it's not a §3 violation: the seed script is not a *site* file (it's a one-shot admin script, never imported by the site at runtime), and the edit is purely structural (move code, not change behavior).

If even this is considered too invasive: the alternative is to copy the parser code into the package (duplication = drift risk). **Recommend the extraction.** Phase 2 H7 includes an explicit before/after parser-output diff to PROVE behavior-preserving.

### F.3 Zero secrets / strategic context / brand-partner

- Proposed package `name`, `description`, `keywords`, `README.md`: zero credentials, zero `SUPABASE_/STRIPE_/OPENAI_/NEXTAUTH_/ANTHROPIC_` references. No partner/program/brand names. No commercial/strategic context — describes the taxonomy and the import shape only.
- Verified by mechanized grep in Phase 2 H7 (same `BRAND_ALLOWLIST_FORBIDDEN` Beacon 2's verify uses, applied to the proposed package files + the `npm pack --dry-run` output).
- The package tarball ships markdown? **No.** Per `files` allowlist (E.2), only `dist/`, `README.md`, `LICENSE`. The markdown stays in the host repo. Consumers get the parsed JSON + types + helpers; they don't need the raw markdown.

### F.4 Production data: zero mutation

- This is a code-only spec. No DB inserts/updates/deletes. No `atlas_roles` table change. No re-seed.
- The site's serving behavior is byte-identical pre/post. The site doesn't even import from `packages/atlas-roles/` — only the package's build script does, in the opposite direction.

---

## SECTION G — Findings & escalations (propose-don't-auto-expand items)

### G.1 ⚠️ No `LICENSE` file exists at the repo root

- Verified: `ls LICENSE*` returns nothing.
- The package MUST have a LICENSE file to be publish-ready (and to be ethically usable by third parties).
- **Recommendation:** ship a SCOPED `LICENSE` at `packages/atlas-roles/LICENSE` with MIT terms, `Copyright (c) 2026 Thomas Oxlee` — bounded to the package, doesn't claim the whole repo.
- **Thomas approves the license choice in Section H.** Alternatives: Apache-2.0 (adds patent grant; more formal — common for taxonomy work), CC-BY-4.0 (creative-commons attribution; appropriate for taxonomy *content* but unusual for npm packages whose audience expects code licenses).
- **Default recommendation: MIT** (broadest permissive, matches typical npm-package convention, doesn't bind Thomas to patent terms).

### G.2 Package name `@shipstacked/atlas-roles` — availability NOT probed

- Per Spec §4.2 / §3 / §6: registry probing is decoupled from this spec. The availability check + name claim happen at the future publish act, not in Phase 1 or Phase 2.
- **If `@shipstacked/atlas-roles` turns out to be taken at future-publish time,** Thomas chooses an alternative then. Names that satisfy the brand-free + scoped convention: `@shipstacked/agent-roles`, `@shipstacked/role-taxonomy`, `@shipstacked-org/atlas-roles`, etc.

### G.3 The seed-script parser extraction is the only existing-file edit

- See F.2. Flagging here per Spec §6 *"propose, don't auto-expand."*
- **Acceptable per Spec §3** because: it's not a site file, and the edit is behavior-preserving (parser logic byte-identical, just relocated). Phase 2 H7 includes a before/after parser-output diff against `src/content/atlas-v04.md` and `atlas-v03.md` to PROVE byte-identical output.
- **Alternative if rejected:** duplicate the parser code into `packages/atlas-roles/src/parse.ts`. Eliminates the edit but introduces drift risk (two parsers, two sources of truth, can disagree). Spec §3's "one source provably" pushes against this alternative.
- **Recommendation:** approve the extraction; reject the duplication.

### G.4 No existing monorepo tooling (no `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`)

- Verified. This is a single-package repo today.
- The proposed `packages/atlas-roles/` directory is a sub-package within the host repo, with its own `package.json` and `tsconfig.json`. It's installable from the registry (post-publish) by external consumers; internally it lives alongside the site code without monorepo tooling overhead.
- **No new tooling proposed.** No `pnpm`, no `turbo`, no Lerna, no workspace config additions. Phase 2 stays minimal: just `packages/atlas-roles/` as a self-contained sub-directory the site never imports from.
- If Thomas wants formal monorepo tooling later, that's a separate decision; this beacon doesn't force it.

### G.5 The Beacon 2 AgentCard will eventually reference this package — but NOT in this beacon

- AGENTS.md / Beacon 2 currently declare the live `/atlas/roles/<id>` and `/atlas` as fetch-skills. Once the package is published, a future addition could announce the package as a separately-importable surface in the AgentCard or in `llms.txt`.
- **NOT included in this beacon.** Per Spec §3 "no Beacon 1-3 / Collections / V2 changes." That announcement is a fast-follow after publish.

### G.6 The Beacon 1 atlas markup (`src/lib/jsonld/atlas-article.ts`) is unaffected

- The package exports role data + per-role JSON-LD. It does NOT package the long-form `/atlas` Article markup (that's a single document, not a taxonomy element). `atlas-article.ts` stays site-only — appropriate scoping.

---

## SECTION H — Proposed Phase 2 change list (FOR THOMAS APPROVAL)

Each item independently approvable. Each fully reversible (`git revert <sha>` reverts the whole commit; the new `packages/atlas-roles/` directory disappears and `scripts/seed-atlas-roles.ts` returns to inline-parser form). **Zero registry interaction. Zero DB mutation. Zero site behavior change.**

### H1 — Create `src/lib/atlas/parse.ts` (shared parser module)

Extract `parseAtlas` (currently `scripts/seed-atlas-roles.ts:152-263`) + helpers (`detectTrajectory:53`, `cleanName:60`, `firstSentence:67`, `extractShortDescription:74`, `extractCrosswalk:82`, `extractEuAiAct:121`) into a new `src/lib/atlas/parse.ts`. Export `parseAtlas(markdown: string, version: AtlasVersion, warnings: ParseWarning[]): Role[]` and the supporting type definitions. **Byte-for-byte same logic; just relocated to be importable.**

### H2 — Modify `scripts/seed-atlas-roles.ts` to import the shared parser

Replace the inline parser definitions with `import { parseAtlas, type Role, type ParseWarning } from '../src/lib/atlas/parse.ts'`. The seed script's `main()` remains identical in behavior: read markdown, call `parseAtlas`, upsert to DB.

### H3 — Create `packages/atlas-roles/` directory + manifest + tsconfig

- `packages/atlas-roles/package.json` per E.2 (with `version: "0.4.0"` bound to `ATLAS_VERSION_DEFAULT = 'v0.4'`).
- `packages/atlas-roles/tsconfig.json` — emits ESM + .d.ts to `dist/`, references the parent host repo's TypeScript via path-only (does NOT bundle host site code).
- `packages/atlas-roles/.gitignore` — ignores `dist/` + `node_modules/` + `*.tgz` (the pack artifact).

### H4 — Create `packages/atlas-roles/src/` (the package source)

- `src/types.ts` — re-exports the `AtlasRoleData`, `AtlasVersion`, `AtlasRoleJsonLd` types (minus DB-only fields like `created_at`).
- `src/index.ts` — re-exports types + roles maps + helper `getAtlasRoleById(id, version)`.
- `src/jsonld.ts` — exports `atlasRoleJsonLd(role)` matching the live site's JSON-LD shape exactly (copied / re-implemented from `src/lib/atlas/jsonld.ts`; gate proves byte-equivalence to live).
- `src/data/roles-v0.4.json` — committed snapshot generated by H6 build script.
- `src/data/roles-v0.3.json` — committed snapshot.

### H5 — Create `packages/atlas-roles/README.md`

Brand-free. Documents: what the package is, what's exposed, how to install + import, what the version number means (Atlas content version), provenance ("generated from src/content/atlas-v0X.md via shared parser; gate-verified equivalent to live shipstacked.com/atlas/roles/<id>.json").

### H6 — Create `packages/atlas-roles/scripts/build.ts`

The codegen build:
1. Assert version binding (D.2) — fail-fast on mismatch.
2. Read `src/content/atlas-v04.md` + `atlas-v03.md`.
3. Run shared `parseAtlas` from `src/lib/atlas/parse.ts`.
4. Emit `packages/atlas-roles/src/data/roles-v0.X.json` for each version.
5. **Diff freshly-generated JSON against committed JSON. Byte-match required, else exit 1.**
6. Compile TypeScript → `dist/`.

### H7 — Create `packages/atlas-roles/scripts/verify.ts` (the Layer-2 equivalence gate)

For each role in the package's roles-v0.4.json + roles-v0.3.json:
1. `curl https://shipstacked.com/atlas/roles/<role_id>.json?v=<version>` (or local equivalent if `--base http://localhost:3000` flag given).
2. Parse the JSON-LD response.
3. Structurally compare every field the package exposes against the site response.
4. Any mismatch → log offending role + field + values, exit 1.

**This is the load-bearing "provably cannot disagree" proof.** Runs in Phase 2 H10 verification and is the mechanized accuracy gate going forward (same pattern as Beacon 2's `verify-agent-card.ts`).

### H8 — Create `packages/atlas-roles/LICENSE`

Per G.1 recommendation: MIT, scoped to the package. **Thomas confirms the license choice in this Section H approval.**

### H9 — Add `packages/atlas-roles/scripts/build.ts` + `verify.ts` invocation to the commit gate

Beacon 4's commit gate runs:
- `cd packages/atlas-roles && node --experimental-strip-types scripts/build.ts` — confirms version binding + Layer-1 byte equivalence.
- `cd packages/atlas-roles && node --experimental-strip-types scripts/verify.ts --base https://shipstacked.com` — confirms Layer-2 equivalence against live prod.
- `cd packages/atlas-roles && npm pack --dry-run` — confirms allowlist holds (no internal leakage).

### H10 — Verification (before commit)

- All H6-H9 scripts pass clean.
- `npx tsc --noEmit` clean in the host repo.
- `npm run build` clean in the host repo (site build unaffected — the new package directory shouldn't be picked up by Next).
- `cd packages/atlas-roles && npx tsc --noEmit` clean for the package.
- `git status`: only NEW files under `packages/atlas-roles/`, NEW `src/lib/atlas/parse.ts`, MODIFIED `scripts/seed-atlas-roles.ts` (parser extracted). No unrelated tracked file changed.
- `src/lib/jsonld/person.ts` byte-unchanged (the standing Beacon 1 invariant).
- All Beacon 1-3 / Collections / V2 / Tier 0-1 prod regressions intact (the standard 4-curl spot-check).
- **Parser-extraction behavior-preserving proof:** run `parseAtlas` on both markdowns BEFORE and AFTER extraction (using `git stash`) — outputs must be byte-identical.
- **Pack-contents zero-internal-leak proof:** the dry-run tarball list contains only `dist/`, `README.md`, `LICENSE`, `package.json`. Zero `docs/`, zero `src/content/`, zero `.env*`, zero `scripts/` entries.
- **`npm publish` was NOT executed.** No `npm login`. No `npm view`. No registry interaction logged. (Explicit confirmation in the commit message.)

### H11 — Commit + push

Code-only commit. Message documents:
- The package + the one-source mechanism (codegen via shared parser from canonical markdown; Layer-1 byte snapshot diff + Layer-2 live-prod equivalence — the package provably cannot disagree with the live site).
- The version binding (`v0.4` → `0.4.0`; hard-fail on mismatch).
- **Publish-ready, NOT published.** Explicit statement: `npm publish` was not run; future publish is a separate, decoupled, Thomas-only act; the name `@shipstacked/atlas-roles` is PROPOSED and Thomas approves it at publish time.
- Brand-free, no-secrets, pack-contents zero-internal-leak confirmation.
- Code-only, `git revert` = full reversal, no DB.
- The one existing-file edit (`scripts/seed-atlas-roles.ts` — parser extraction; behavior-preserving; verified byte-identical output before/after).

### H12 — What this spec does NOT do (explicit non-goals)

- ❌ Does NOT run `npm publish`.
- ❌ Does NOT run `npm view`, `npm login`, or any registry-probing command.
- ❌ Does NOT modify the site's runtime behavior (`/atlas/*` byte-identical pre/post).
- ❌ Does NOT modify `src/lib/jsonld/person.ts` (Beacon 1 invariant).
- ❌ Does NOT modify any Beacon 1-3 / Collections / V2 file's behavior (the seed script's edit is behavior-preserving and is not a site file).
- ❌ Does NOT add monorepo tooling (no `pnpm-workspace.yaml`, `turbo.json`, etc.).
- ❌ Does NOT change the Atlas markdown content (`src/content/atlas-v0X.md` read-only here).
- ❌ Does NOT re-seed the DB.
- ❌ Does NOT change the AgentCard, AGENTS.md, or `llms.txt` to announce the package (fast-follow after publish, not this beacon).
- ❌ Does NOT package the `/atlas` Article markup (only per-role data + per-role JSON-LD).
- ❌ Does NOT name any partner, program, brand, or specific collection slug.

---

## Sources verified during this discovery

- `src/lib/atlas/roles.ts` (138 lines) — the DB fetcher + `ATLAS_VERSION_DEFAULT = 'v0.4'` + `ATLAS_VERSIONS` constants + `AtlasRoleRow` interface.
- `src/lib/atlas/jsonld.ts` (~80 lines) — the `atlasRoleJsonLd` builder + `AtlasRoleJsonLd` type.
- `scripts/seed-atlas-roles.ts` (333 lines) — `parseAtlas` at line 152, 6 helpers at lines 53-151, `main()` at lines 264+.
- `src/content/atlas-v04.md` (1,191 lines) — v0.4 canonical markdown; 44 roles (38 H3 + 6 inline-bold).
- `src/content/atlas-v03.md` (827 lines) — v0.3 canonical markdown; 35 role declarations.
- `src/app/atlas/roles/[id]/page.tsx` — HTML route, calls `getAtlasRole`.
- `src/app/api/atlas/roles/[id]/jsonld/route.ts` — JSON-LD route, returns `AtlasRoleJsonLd`.
- `src/app/atlas/page.tsx` — long-form Atlas page; reads markdown via `fs.readFile` + queries `atlas_roles`.
- `package.json` — host site manifest; `"private": true`; scripts: dev/build/start/lint.
- `https://shipstacked.com/atlas/roles/A1.json` — live prod sanity check: HTTP 200, `application/ld+json`, full `AtlasRoleJsonLd` shape.
- **agents.md / npm docs / Node.js v26+ docs:** `exports` field is the modern standard; `types` condition must be listed first; `files` allowlist controls tarball contents; ESM-first is the new-package default.
- No `LICENSE` file in the repo (verified `ls LICENSE*` returns nothing).
- No monorepo tooling (verified no `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`).

---

*End of Phase 1 discovery. STOP. Awaiting Thomas's review of:*
- *Section H change list (item-by-item or as-a-whole approval)*
- *The LICENSE choice for the package (G.1 — MIT recommended; alternatives: Apache-2.0, CC-BY-4.0)*
- *The proposed package name `@shipstacked/atlas-roles` (B.2 — registry availability NOT probed per spec; check happens at future publish)*

*Before Phase 2.*
