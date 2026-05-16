/**
 * @shipstacked/atlas-roles — build.
 *
 * Phases:
 *   1. Version-binding assert: pkg.version === map(ATLAS_VERSION_DEFAULT).
 *      Hard-fail on mismatch (no silent version drift).
 *   2. Codegen: run the SHARED parser (src/lib/atlas/parse.ts in the
 *      source repo) over the canonical markdown sources, emit typed
 *      role-data modules at packages/atlas-roles/src/data/roles-v0.X.ts.
 *   3. Layer-1 equivalence: if a previous data file exists, diff the
 *      freshly-generated content against the committed file. Any
 *      difference = stale committed snapshot; gate fails until the
 *      regenerated content is committed.
 *   4. TypeScript compile: tsc → dist/ (ESM + .d.ts).
 *
 * Run from repo root or from packages/atlas-roles/:
 *   cd packages/atlas-roles && node --experimental-strip-types scripts/build.ts
 *
 * Flags:
 *   --skip-tsc    Skip the tsc step (used by the equivalence-only check).
 *   --write       Write the freshly-generated data even if it differs from
 *                 the committed snapshot. WITHOUT this flag, drift fails.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Resolve repo root from this script's location.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_DIR = resolve(__dirname, '..');
const REPO_ROOT = resolve(PKG_DIR, '..', '..');

// Import the shared parser + the source-of-truth version constant.
const parseModule = await import(resolve(REPO_ROOT, 'src/lib/atlas/parse.ts'));
const { parseAtlas } = parseModule as {
  parseAtlas: (md: string, version: 'v0.3' | 'v0.4', warnings: unknown[]) => unknown[];
};
const rolesModule = await import(resolve(REPO_ROOT, 'src/lib/atlas/roles.ts'));
const { ATLAS_VERSION_DEFAULT, ATLAS_VERSIONS } = rolesModule as {
  ATLAS_VERSION_DEFAULT: 'v0.3' | 'v0.4';
  ATLAS_VERSIONS: readonly ('v0.3' | 'v0.4')[];
};

const argv = process.argv.slice(2);
const SKIP_TSC = argv.includes('--skip-tsc');
const WRITE_MODE = argv.includes('--write');

let failures = 0;
function pass(msg: string) { console.log(`  PASS  ${msg}`); }
function fail(msg: string) { console.log(`  FAIL  ${msg}`); failures++; }
function info(msg: string) { console.log(`        ${msg}`); }

console.log('============================================================');
console.log('  @shipstacked/atlas-roles — BUILD');
console.log('============================================================\n');

// ─── Phase 1: version-binding assert ────────────────────────────────────
console.log('1. Version-binding assert');
const pkgJsonPath = join(PKG_DIR, 'package.json');
const pkgRaw = await readFile(pkgJsonPath, 'utf-8');
const pkg = JSON.parse(pkgRaw) as { version: string; name: string };

function atlasVersionToSemver(v: string): string {
  const stripped = v.replace(/^v/, '');
  return /^\d+\.\d+\.\d+$/.test(stripped) ? stripped : `${stripped}.0`;
}
const expected = atlasVersionToSemver(ATLAS_VERSION_DEFAULT);

if (pkg.version === expected) {
  pass(`package.json version "${pkg.version}" matches ATLAS_VERSION_DEFAULT="${ATLAS_VERSION_DEFAULT}" (mapped → "${expected}")`);
} else {
  fail(`package.json version "${pkg.version}" != mapped ATLAS_VERSION_DEFAULT "${expected}" (source ATLAS_VERSION_DEFAULT="${ATLAS_VERSION_DEFAULT}")`);
  console.log(`        FIX: update packages/atlas-roles/package.json "version" to "${expected}" OR bump ATLAS_VERSION_DEFAULT — they must agree.`);
  process.exit(1);
}

// ─── Phase 2: codegen ────────────────────────────────────────────────────
console.log('\n2. Codegen (shared parser over canonical markdown)');
const DATA_DIR = join(PKG_DIR, 'src', 'data');
await mkdir(DATA_DIR, { recursive: true });

interface Diff {
  version: string;
  filename: string;
  fresh: string;
  committed: string | null;
  matches: boolean;
}
const diffs: Diff[] = [];

for (const version of ATLAS_VERSIONS) {
  const mdFilename = `atlas-${version.replace(/\./g, '')}.md`;
  // Map 'v0.4' → 'atlas-v04.md'; the file naming convention strips the dot.
  const mdPath = join(REPO_ROOT, 'src', 'content', mdFilename);
  if (!existsSync(mdPath)) {
    fail(`Source markdown missing: ${mdPath}`);
    continue;
  }
  const md = await readFile(mdPath, 'utf-8');
  const warnings: unknown[] = [];
  const roles = parseAtlas(md, version, warnings);
  info(`v${version.replace(/^v/, '')}: parsed ${roles.length} roles${warnings.length > 0 ? ` (${warnings.length} warnings)` : ''}`);
  if (warnings.length > 0) {
    for (const w of warnings) info(`        warn: ${JSON.stringify(w)}`);
  }

  // Generate the per-version data module. Pretty-printed JSON wrapped in
  // an ESM export so consumers can import the array directly.
  const dataFilename = `roles-${version}.ts`;
  const dataPath = join(DATA_DIR, dataFilename);
  const header = `// AUTO-GENERATED — do not edit. Regenerate via packages/atlas-roles/scripts/build.ts.\n// Source: src/content/${mdFilename}\n// Parser: src/lib/atlas/parse.ts\n// Atlas version: ${version}\n\nimport type { AtlasRoleData } from '../types.js';\n\nexport const roles${version.replace(/\./g, '').toUpperCase()}: readonly AtlasRoleData[] = Object.freeze(\n${JSON.stringify(roles, null, 2)}\n);\n`;

  const committed = existsSync(dataPath) ? await readFile(dataPath, 'utf-8') : null;
  const matches = committed !== null && committed === header;
  diffs.push({ version, filename: dataFilename, fresh: header, committed, matches });
}

// ─── Phase 3: Layer-1 equivalence (committed snapshot diff) ─────────────
console.log('\n3. Layer-1 equivalence (committed snapshot diff)');

const anyDrift = diffs.some(d => d.committed !== null && !d.matches);
const anyMissing = diffs.some(d => d.committed === null);

for (const d of diffs) {
  if (d.committed === null) {
    if (WRITE_MODE) {
      await writeFile(join(DATA_DIR, d.filename), d.fresh, 'utf-8');
      pass(`${d.filename}: WROTE (no prior committed snapshot)`);
    } else {
      fail(`${d.filename}: no committed snapshot exists yet. Re-run with --write to create it.`);
    }
  } else if (d.matches) {
    pass(`${d.filename}: byte-identical to committed snapshot (${d.fresh.length} bytes)`);
  } else {
    fail(`${d.filename}: DRIFT — freshly-generated content differs from committed snapshot`);
    if (WRITE_MODE) {
      await writeFile(join(DATA_DIR, d.filename), d.fresh, 'utf-8');
      info(`        --write specified: wrote fresh content; re-commit before push`);
    } else {
      info(`        re-run with --write to overwrite, then re-commit`);
    }
  }
}

if (failures > 0 && !WRITE_MODE) {
  console.log(`\nBUILD FAILED — ${failures} failure(s). Drift in committed snapshot or version mismatch.`);
  process.exit(1);
}

// ─── Phase 4: tsc compile ────────────────────────────────────────────────
if (SKIP_TSC) {
  console.log('\n4. tsc compile — SKIPPED (--skip-tsc)');
} else {
  console.log('\n4. tsc compile → dist/');
  const tscResult = spawnSync('npx', ['tsc', '-p', '.'], {
    cwd: PKG_DIR,
    stdio: 'inherit',
  });
  if (tscResult.status === 0) {
    pass('tsc clean');
  } else {
    fail(`tsc failed with exit ${tscResult.status}`);
    process.exit(1);
  }
}

// ─── Summary ────────────────────────────────────────────────────────────
console.log('\n============================================================');
if (failures === 0) {
  console.log('BUILD ✓ — all gates passed');
} else {
  console.log(`BUILD ✗ — ${failures} failure(s)`);
  process.exit(1);
}
