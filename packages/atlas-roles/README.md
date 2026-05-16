# @shipstacked/atlas-roles

The **ShipStacked Atlas** as an installable, typed, version-bound dependency.

A practitioner-defined role taxonomy of the agentic economy — the same taxonomy the live `https://shipstacked.com/atlas` pages render — packaged as a typed ESM module so projects and agents can take a dependency on it instead of scraping it.

## Install

```bash
npm install @shipstacked/atlas-roles
```

## Usage

```ts
import {
  roles,                   // all roles for the default version (v0.4)
  rolesByVersion,          // { 'v0.3': [...], 'v0.4': [...] }
  rolesV03, rolesV04,      // direct arrays
  getAtlasRoleById,        // lookup helper
  ATLAS_VERSION_DEFAULT,   // 'v0.4'
  ATLAS_VERSIONS,          // ['v0.3', 'v0.4'] as const
  type AtlasRoleData,
  type AtlasVersion,
} from '@shipstacked/atlas-roles';

// Look up a role
const a1 = getAtlasRoleById('A1');                  // default version
const c5 = getAtlasRoleById('C5', 'v0.4');

// Iterate
for (const role of roles) {
  console.log(role.role_id, role.name, role.automation_trajectory);
}
```

### Subpath imports

For consumers that want only a single version's data without loading the rest:

```ts
import { rolesV04 } from '@shipstacked/atlas-roles/data/v0.4';
import { rolesV03 } from '@shipstacked/atlas-roles/data/v0.3';
```

### JSON-LD helper

Produces the same Schema.org `DefinedTerm + shipstacked:AtlasRole` shape the live `/atlas/roles/<id>.json` endpoints return:

```ts
import { atlasRoleJsonLd } from '@shipstacked/atlas-roles/jsonld';
import { getAtlasRoleById } from '@shipstacked/atlas-roles';

const role = getAtlasRoleById('A1')!;
const jsonld = atlasRoleJsonLd(role);
// Identical structure to: curl https://shipstacked.com/atlas/roles/A1.json
// (minus shipstacked:recentReceipts which is runtime data, not taxonomy)
```

## What's in the data

Each role exposes:

| Field | Type | Notes |
|---|---|---|
| `role_id` | `string` | Stable identifier (`A1`, `B3`, `C5`, ...) |
| `atlas_version` | `'v0.3' \| 'v0.4'` | Which Atlas version this declaration belongs to |
| `cluster` | `string` | Single-letter cluster (A–G) |
| `name` | `string` | Human-readable role name |
| `short_description` | `string` | One-sentence "what they do" |
| `automation_trajectory` | `'resistant' \| 'partial' \| 'collapsible' \| null` | Derived from markdown emoji marker |
| `isco_08_code` | `string \| null` | ISCO-08 crosswalk (v0.4+) |
| `soc_2018_code` | `string \| null` | US BLS SOC 2018 crosswalk (v0.4+) |
| `onet_code` | `string \| null` | O*NET crosswalk (v0.4+) |
| `crosswalk_status` | `'confident' \| 'partial' \| 'gap' \| 'combined' \| null` | Crosswalk completeness (v0.4+) |
| `eu_ai_act_articles` | `string[] \| null` | EU AI Act article references (v0.4+) |
| `iso_42001_sections` | `string[] \| null` | ISO/IEC 42001 clause/control references (v0.4+) |

## Versioning

The package version is **bound to the Atlas content version** — they cannot drift.

| Atlas version | Package version |
|---|---|
| `v0.4` (current default) | `0.4.0` |

The mapping is mechanical (strip the leading `v`, add `.0` patch if missing). The package's build script asserts `package.json.version` matches the source repo's `ATLAS_VERSION_DEFAULT` constant before emitting any artifacts; a mismatch is a hard build failure.

## Provenance

The role data is **generated at build time** from the canonical markdown source (`src/content/atlas-v04.md` and `atlas-v03.md` in the source repo) via the same parser the live site's seed script uses. Two equivalence proofs run at the package build/gate:

1. **Build-time** — regenerated JSON snapshots are byte-compared against the committed snapshots in this package. Any difference = stale snapshot, build fails.
2. **Gate-time** — every role in the package is independently `curl`ed against `https://shipstacked.com/atlas/roles/<id>.json?v=<version>` and structurally compared. Any mismatch = hard fail.

This means the package's data and the live site's data **provably cannot disagree** at release time.

## License

MIT — see [`LICENSE`](./LICENSE).
