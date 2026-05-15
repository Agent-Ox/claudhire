/**
 * Atlas v0.4 role catalog, parsed at module init from the same prompt file
 * the classifier uses (`prompts/v0.1.0.md`). Keeping a single source of truth
 * avoids drift between what the classifier emits and what /paste/review's
 * role-selector dropdown displays.
 *
 * Step 5 sources roles here rather than from an `atlas_roles` table, because
 * the schema doesn't yet have a roles table — Phase 1B is when that lands.
 * Flagged as a deviation from STEP_5_PASTE_UI_SPEC §2.2.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROMPT_FILE = 'v0.1.0.md';
const ATLAS_VERSION = 'v0.4';

export interface AtlasRole {
  id: string;
  name: string;
  cluster: string;
}

function loadRoles(): AtlasRole[] {
  const promptPath = join(
    process.cwd(),
    'src/services/atlas-classifier/prompts',
    PROMPT_FILE,
  );
  const text = readFileSync(promptPath, 'utf-8');
  const out: AtlasRole[] = [];
  const seen = new Set<string>();
  // Match lines like: - **A1** — Role Name. Description...
  // The em-dash is U+2014; allow plain hyphen as fallback.
  const re = /^- \*\*([A-G]\d+)\*\*\s+[—\-]\s+([^.]+)\./gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: m[2].trim(), cluster: id[0] });
  }
  if (out.length === 0) {
    throw new Error(`No roles parsed from ${promptPath} — prompt file shape changed?`);
  }
  return out;
}

let cached: AtlasRole[] | null = null;
export function getAtlasRoles(): AtlasRole[] {
  if (!cached) cached = loadRoles();
  return cached;
}

export function getAtlasVersion(): string {
  return ATLAS_VERSION;
}
