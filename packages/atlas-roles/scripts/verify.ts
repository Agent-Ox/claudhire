/**
 * @shipstacked/atlas-roles — verify (Layer-2 live-prod equivalence proof).
 *
 * For every role in the package's data, fetches
 * https://shipstacked.com/atlas/roles/<role_id>.json?v=<version>
 * (or the --base override) and structurally compares the live JSON-LD
 * response to what the package would produce for that role via the
 * atlasRoleJsonLd helper.
 *
 * Any mismatch = HARD FAIL. This is the load-bearing "provably cannot
 * disagree" gate per BEACON_4_DISCOVERY.md §C.3 Layer 2 — a drift here
 * means the published package and the live site are serving different
 * taxonomies, which would be a distributed machine-readable lie.
 *
 * The shipstacked:recentReceipts field is stripped from the compare
 * (it is runtime per-role activity data, not taxonomy — see jsonld.ts).
 *
 * Usage:
 *   cd packages/atlas-roles
 *   node --experimental-strip-types scripts/verify.ts                          # defaults to prod
 *   node --experimental-strip-types scripts/verify.ts --base http://localhost:3000
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_DIR = resolve(__dirname, '..');

const argv = process.argv.slice(2);
let base = 'https://shipstacked.com';
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--base' && argv[i + 1]) { base = argv[i + 1]; i++; }
}
base = base.replace(/\/$/, '');

// Import from dist/ — what actually ships to consumers. Keeps the proof
// honest: verifies the BUILT package matches live prod, not just source.
// Requires `node --experimental-strip-types scripts/build.ts` to have run
// first (the build emits dist/ via tsc).
const indexModule = await import(resolve(PKG_DIR, 'dist', 'index.js'));
const jsonldModule = await import(resolve(PKG_DIR, 'dist', 'jsonld.js'));
const { ATLAS_VERSIONS, rolesByVersion } = indexModule as {
  ATLAS_VERSIONS: readonly ('v0.3' | 'v0.4')[];
  rolesByVersion: Record<'v0.3' | 'v0.4', readonly any[]>;
};
const { atlasRoleJsonLd } = jsonldModule as {
  atlasRoleJsonLd: (role: any, recentReceipts?: string[]) => any;
};

let failures = 0;
function pass(msg: string) { console.log(`  PASS  ${msg}`); }
function fail(msg: string) { console.log(`  FAIL  ${msg}`); failures++; }
function info(msg: string) { console.log(`        ${msg}`); }

console.log('============================================================');
console.log(`  @shipstacked/atlas-roles — VERIFY (Layer-2 live-prod proof)`);
console.log(`  target base: ${base}`);
console.log('============================================================\n');

// Fields stripped from the compare (non-taxonomy runtime data).
const STRIP_FIELDS = new Set(['shipstacked:recentReceipts']);

function stripped(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripped);
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (STRIP_FIELDS.has(k)) continue;
    out[k] = stripped(v);
  }
  return out;
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) if (aKeys[i] !== bKeys[i]) return false;
  for (const k of aKeys) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

function firstDiff(a: any, b: any, path = ''): string | null {
  if (deepEqual(a, b)) return null;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return `${path}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path}.length: ${a.length} !== ${b.length}`;
    for (let i = 0; i < a.length; i++) {
      const d = firstDiff(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const d = firstDiff(a[k], b[k], path ? `${path}.${k}` : k);
    if (d) return d;
  }
  return `${path}: structural diff (unreachable?)`;
}

let totalChecked = 0;
for (const version of ATLAS_VERSIONS) {
  const roles = rolesByVersion[version];
  console.log(`\n— Version ${version}: ${roles.length} roles —`);
  for (const role of roles) {
    const url = `${base}/atlas/roles/${role.role_id}.json?v=${version}`;
    let live: any;
    try {
      const res = await fetch(url);
      if (res.status !== 200) {
        fail(`${role.role_id} (${version}): HTTP ${res.status} from ${url}`);
        continue;
      }
      live = await res.json();
    } catch (e) {
      fail(`${role.role_id} (${version}): fetch error: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    totalChecked++;

    const pkgJsonLd = atlasRoleJsonLd(role);
    const liveStripped = stripped(live);
    const pkgStripped = stripped(pkgJsonLd);

    if (deepEqual(liveStripped, pkgStripped)) {
      pass(`${role.role_id.padEnd(4)} (${version})`);
    } else {
      const d = firstDiff(pkgStripped, liveStripped);
      fail(`${role.role_id} (${version}): structural mismatch — ${d}`);
    }
  }
}

console.log('\n============================================================');
console.log(`Roles compared: ${totalChecked}`);
if (failures === 0) {
  console.log('VERIFY ✓ — package data byte/structurally equivalent to live site');
} else {
  console.log(`VERIFY ✗ — ${failures} failure(s)`);
  process.exit(1);
}
