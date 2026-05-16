/**
 * Seed the atlas_roles table from src/content/atlas-v04.md and atlas-v03.md.
 *
 * Run: node --env-file=.env.local scripts/seed-atlas-roles.ts
 *
 * Idempotent — ON CONFLICT (role_id, atlas_version) DO UPDATE via upsert.
 * Roles are parsed from:
 *   - H3 headings of form `### {RoleId}. {Name} {emoji}?`
 *   - Inline-bolded declarations of form `**{RoleId}. {Name} {emoji}.**`
 *     (Part III C-cluster sub-cluster roles use this pattern.)
 *
 * For v0.4 only: parses **Crosswalks.** and **EU AI Act mapping.** paragraphs
 * within each role's content block.
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseAtlas, type Role, type ParseWarning } from '../src/lib/atlas/parse.ts';

async function main() {
  const repoRoot = process.cwd();
  const v04 = await readFile(join(repoRoot, 'src/content/atlas-v04.md'), 'utf-8');
  const v03 = await readFile(join(repoRoot, 'src/content/atlas-v03.md'), 'utf-8');

  const warnings: ParseWarning[] = [];
  const v04Roles = parseAtlas(v04, 'v0.4', warnings);
  const v03Roles = parseAtlas(v03, 'v0.3', warnings);
  const all = [...v04Roles, ...v03Roles];

  console.log(`Parsed v0.4: ${v04Roles.length} roles`);
  console.log(`Parsed v0.3: ${v03Roles.length} roles`);
  console.log(`Total upsert: ${all.length}`);

  if (warnings.length > 0) {
    console.log(`\nParse warnings (${warnings.length}):`);
    for (const w of warnings) {
      console.log(`  [${w.version}] ${w.role_id ?? '<unknown>'}: ${w.reason}`);
    }
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !supaKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.'
    );
  }
  const supa = createClient(supaUrl, supaKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('\nUpserting to atlas_roles…');
  const { error, count } = await supa
    .from('atlas_roles')
    .upsert(all, { onConflict: 'role_id,atlas_version', count: 'exact' });
  if (error) {
    console.error('Upsert failed:', error);
    process.exit(1);
  }
  console.log(`Upsert OK. Rows affected: ${count ?? '(unknown)'}.`);

  // Verify counts post-upsert.
  const checks: Array<[string, string]> = [
    ["v0.4 total", "atlas_version.eq.v0.4"],
    ["v0.4 cluster G", "and=(atlas_version.eq.v0.4,cluster.eq.G)"],
    ["v0.4 eu_ai_act NOT NULL", "and=(atlas_version.eq.v0.4,eu_ai_act_articles.not.is.null)"],
    ["v0.3 total", "atlas_version.eq.v0.3"],
  ];
  console.log('\nPost-upsert counts:');
  for (const [label, filter] of checks) {
    let query = supa.from('atlas_roles').select('role_id', { count: 'exact', head: true });
    // Apply filters manually based on label since query-string composition
    // varies by client method.
    if (label === 'v0.4 total') query = query.eq('atlas_version', 'v0.4');
    else if (label === 'v0.4 cluster G')
      query = query.eq('atlas_version', 'v0.4').eq('cluster', 'G');
    else if (label === 'v0.4 eu_ai_act NOT NULL')
      query = query.eq('atlas_version', 'v0.4').not('eu_ai_act_articles', 'is', null);
    else if (label === 'v0.3 total') query = query.eq('atlas_version', 'v0.3');

    const { count, error } = await query;
    if (error) {
      console.log(`  ${label}: ERROR ${error.message}`);
    } else {
      console.log(`  ${label}: ${count ?? 0}`);
    }
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
