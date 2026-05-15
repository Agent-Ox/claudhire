/**
 * Generate the Atlas classifier prompt from the live `atlas_roles` table.
 *
 * Run: node --env-file=.env.local scripts/generate-classifier-prompt.ts
 *
 * Idempotent — regenerates `src/services/atlas-classifier/prompts/<VERSION>.md`
 * from current DB state and the template. When Atlas bumps (e.g. v0.5),
 * bump the VERSION constant below and run again; the old file stays in git
 * as the locked snapshot of its prompt version.
 */

import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ATLAS_VERSION = 'v0.4';
const VERSION = 'v0.1.0';

interface AtlasRoleRow {
  role_id: string;
  cluster: string;
  name: string;
  short_description: string;
}

function clusterSortKey(role_id: string): [string, number] {
  const m = role_id.match(/^([A-G])(\d+)$/);
  if (!m) return ['Z', 999];
  return [m[1], parseInt(m[2], 10)];
}

function renderRoleTable(rows: AtlasRoleRow[]): string {
  const sorted = [...rows].sort((a, b) => {
    const [ac, ai] = clusterSortKey(a.role_id);
    const [bc, bi] = clusterSortKey(b.role_id);
    if (ac !== bc) return ac.localeCompare(bc);
    return ai - bi;
  });
  return sorted
    .map((r) => `- **${r.role_id}** — ${r.name}. ${r.short_description}`)
    .join('\n');
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  const supa = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Querying atlas_roles where atlas_version = '${ATLAS_VERSION}'…`);
  const { data, error } = await supa
    .from('atlas_roles')
    .select('role_id, cluster, name, short_description')
    .eq('atlas_version', ATLAS_VERSION);
  if (error) {
    console.error('Query failed:', error);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.error(`No rows for atlas_version='${ATLAS_VERSION}'. Reseed first.`);
    process.exit(1);
  }
  console.log(`Fetched ${data.length} roles.`);

  const repoRoot = process.cwd();
  const templatePath = join(repoRoot, 'src/services/atlas-classifier/prompts/_template.md');
  const template = await readFile(templatePath, 'utf-8');

  if (!template.includes('[ROLE_TABLE]')) {
    throw new Error('Template is missing the [ROLE_TABLE] placeholder.');
  }

  const rendered = template.replace('[ROLE_TABLE]', renderRoleTable(data));
  const outPath = join(repoRoot, `src/services/atlas-classifier/prompts/${VERSION}.md`);
  await writeFile(outPath, rendered, 'utf-8');

  console.log(`Wrote ${outPath} (${rendered.length} chars).`);
  console.log(`Update CLASSIFIER_VERSION in src/services/atlas-classifier/index.ts if bumping.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
