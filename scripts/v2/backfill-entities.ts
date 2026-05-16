/**
 * Tier 1 merge — proactive entity backfill for the 17 approved profiles.
 *
 * Spec: docs/v2/TIER_1_MERGE_SPEC.md §4.5
 * Discovery: docs/audit/MERGE_DISCOVERY.md §H5 + Thomas's locked cohort.
 *
 * For each cohort row this script:
 *   1. Looks up profiles WHERE user_id = $1 (the approved user).
 *   2. If profiles.entity_id is already set → log "already linked, skip".
 *   3. Else if an entity exists for owner_user_id → link profile and skip insert.
 *   4. Else INSERT entities with kind='human', owner_user_id, slug=profile.username
 *      VERBATIM, display_name=profile.full_name, profile_id; then UPDATE
 *      profiles.entity_id.
 *
 * Run:
 *   node --env-file=.env.local --experimental-strip-types scripts/v2/backfill-entities.ts [--apply]
 * Without --apply: prints what WOULD happen. Default behaviour is dry-run.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { entityExternalId } from '../../src/lib/ulid.ts'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Locked cohort — 17 usernames, in the order Thomas approved in his last message.
// Edit ONLY with explicit Thomas sign-off.
const COHORT_USERNAMES = [
  'aniketaslaliya801',
  'sunnyzheng606',
  'eluwaemekamichael740',
  'khairulanwar932',
  'joedias995',
  'sumitdongardive9',
  'ryangrant144',
  'yuki448',
  'celestinokariuki456',
  'vinodkrishnabanda657',
  'olalekanridwanullah197',
  'ifioksundayuboh72',
  'janwinum9',
  'avikbhanja723',
  'anantdhavale962',
  'emanuelcovelli123',
  'nnekaewalu847',
]

const APPLY = process.argv.includes('--apply')

interface ProfileRow {
  id: string
  user_id: string | null
  username: string
  full_name: string | null
  verified: boolean
  published: boolean
  entity_id: number | null
}

async function getProfile(admin: SupabaseClient, username: string): Promise<ProfileRow | null> {
  const { data, error } = await admin
    .from('profiles')
    .select('id, user_id, username, full_name, verified, published, entity_id')
    .eq('username', username)
    .maybeSingle()
  if (error) {
    console.error(`  ERR loading profile ${username}: ${error.message}`)
    return null
  }
  return data as ProfileRow | null
}

interface EntityRow {
  id: number
  external_id: string
  slug: string
  display_name: string
  owner_user_id: string
  profile_id: string | null
}

async function getEntityByOwner(admin: SupabaseClient, userId: string): Promise<EntityRow | null> {
  const { data, error } = await admin
    .from('entities')
    .select('id, external_id, slug, display_name, owner_user_id, profile_id')
    .eq('owner_user_id', userId)
    .eq('kind', 'human')
    .maybeSingle()
  if (error && error.code !== 'PGRST116') {
    console.error(`  ERR loading entity for owner ${userId}: ${error.message}`)
    return null
  }
  return (data as EntityRow | null) ?? null
}

async function main(): Promise<void> {
  console.log('======================================================================')
  console.log('Tier 1 merge — backfill-entities.ts')
  console.log(`mode:   ${APPLY ? 'APPLY (writes will execute)' : 'DRY-RUN (no writes)'}`)
  console.log(`cohort: ${COHORT_USERNAMES.length} profiles`)
  console.log('source: docs/audit/MERGE_DISCOVERY.md §H5 (locked cohort, Thomas confirmed)')
  console.log('======================================================================\n')

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  let toCreate = 0
  let alreadyLinked = 0
  let linkedExisting = 0
  let errors = 0
  const allRows: Array<{ idx: number; username: string; full_name: string; status: string; slug: string; verbatim: boolean }> = []

  for (let i = 0; i < COHORT_USERNAMES.length; i++) {
    const username = COHORT_USERNAMES[i]
    const idx = i + 1
    console.log(`[${String(idx).padStart(2, '0')}/${COHORT_USERNAMES.length}] ${username}`)

    const profile = await getProfile(admin, username)
    if (!profile) {
      console.log(`  ✗ profile not found in DB`)
      errors++
      allRows.push({ idx, username, full_name: '(not found)', status: 'ERROR_NOT_FOUND', slug: '', verbatim: false })
      continue
    }
    console.log(`  profile.id     : ${profile.id}`)
    console.log(`  profile.user_id: ${profile.user_id || '(NULL — would be ERROR)'}`)
    console.log(`  full_name      : ${profile.full_name?.trim() || '(empty)'}`)
    console.log(`  verified       : ${profile.verified}`)
    console.log(`  published      : ${profile.published}`)
    console.log(`  entity_id      : ${profile.entity_id ?? 'NULL'}`)

    if (!profile.user_id) {
      console.log(`  ✗ user_id is NULL — cannot key entity creation, skipping`)
      errors++
      allRows.push({ idx, username, full_name: profile.full_name ?? '', status: 'ERROR_NULL_USER_ID', slug: profile.username, verbatim: false })
      continue
    }

    // Slug invariant — verbatim username (Spec §0).
    const slug = profile.username
    const slugVerbatim = slug === profile.username
    console.log(`  proposed slug  : ${slug}`)
    console.log(`  slug == username verbatim: ${slugVerbatim ? '✓' : '✗ INVARIANT BROKEN'}`)

    // Path A: profile already linked to an entity → skip (idempotency).
    if (profile.entity_id) {
      console.log(`  → already linked (profile.entity_id=${profile.entity_id}); SKIPPING`)
      alreadyLinked++
      allRows.push({ idx, username, full_name: profile.full_name ?? '', status: 'ALREADY_LINKED', slug, verbatim: slugVerbatim })
      continue
    }

    // Path B: entity exists for this owner but profile not yet linked → link only.
    const existingEntity = await getEntityByOwner(admin, profile.user_id)
    if (existingEntity) {
      console.log(`  entity exists  : id=${existingEntity.id} slug=${existingEntity.slug}`)
      console.log(`  → ${APPLY ? 'LINKING' : 'WOULD LINK'} profile.entity_id = ${existingEntity.id}`)
      if (APPLY) {
        const { error } = await admin.from('profiles').update({ entity_id: existingEntity.id }).eq('id', profile.id)
        if (error) {
          console.log(`  ✗ link failed: ${error.message}`)
          errors++
          continue
        }
      }
      linkedExisting++
      allRows.push({ idx, username, full_name: profile.full_name ?? '', status: APPLY ? 'LINKED_EXISTING' : 'WOULD_LINK_EXISTING', slug: existingEntity.slug, verbatim: existingEntity.slug === profile.username })
      continue
    }

    // Path C: no entity → CREATE.
    const displayName = profile.full_name?.trim() || profile.username
    const externalId = entityExternalId()
    console.log(`  → ${APPLY ? 'INSERTING' : 'WOULD INSERT'} entities row:`)
    console.log(`      external_id   : ${externalId}`)
    console.log(`      kind          : 'human'`)
    console.log(`      slug          : '${slug}'  (verbatim from profiles.username)`)
    console.log(`      display_name  : '${displayName}'  (from profiles.full_name)`)
    console.log(`      owner_user_id : ${profile.user_id}`)
    console.log(`      profile_id    : ${profile.id}`)
    console.log(`  → ${APPLY ? 'UPDATING' : 'WOULD UPDATE'} profiles SET entity_id = <new bigserial> WHERE id = '${profile.id}'`)

    if (APPLY) {
      const { data: inserted, error: insertErr } = await admin
        .from('entities')
        .insert({
          external_id: externalId,
          kind: 'human',
          display_name: displayName,
          slug,
          owner_user_id: profile.user_id,
          profile_id: profile.id,
        })
        .select('id, slug')
        .single()
      if (insertErr || !inserted) {
        console.log(`  ✗ insert failed: ${insertErr?.message}`)
        errors++
        allRows.push({ idx, username, full_name: profile.full_name ?? '', status: 'ERROR_INSERT', slug, verbatim: slugVerbatim })
        continue
      }
      const { error: linkErr } = await admin.from('profiles').update({ entity_id: inserted.id }).eq('id', profile.id)
      if (linkErr) {
        console.log(`  ✗ link failed (entity created but profiles.entity_id not set): ${linkErr.message}`)
        errors++
        allRows.push({ idx, username, full_name: profile.full_name ?? '', status: 'ERROR_LINK_AFTER_INSERT', slug, verbatim: slugVerbatim })
        continue
      }
      console.log(`  ✓ created entity id=${inserted.id} slug='${inserted.slug}' and linked profile`)
    }
    toCreate++
    allRows.push({ idx, username, full_name: profile.full_name ?? '', status: APPLY ? 'CREATED' : 'WOULD_CREATE', slug, verbatim: slugVerbatim })
  }

  console.log('\n======================================================================')
  console.log('SUMMARY')
  console.log('======================================================================')
  console.log(`mode             : ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`cohort size      : ${COHORT_USERNAMES.length}`)
  console.log(`would-create / created     : ${toCreate}`)
  console.log(`would-link-existing / linked-existing : ${linkedExisting}`)
  console.log(`already linked   : ${alreadyLinked}`)
  console.log(`errors           : ${errors}`)
  console.log(`slug == username verbatim everywhere : ${allRows.every(r => r.verbatim) ? '✓' : '✗ INVARIANT BROKEN'}`)
  console.log('\nper-row table (idx | username | slug | verbatim | status):')
  for (const r of allRows) {
    console.log(`  ${String(r.idx).padStart(2)} | ${r.username.padEnd(28)} | ${r.slug.padEnd(28)} | ${r.verbatim ? '✓' : '✗'} | ${r.status}`)
  }
  if (!APPLY) {
    console.log('\nDRY-RUN ONLY. Re-run with --apply to execute.')
  }
  if (errors > 0) {
    process.exitCode = 1
  }
}

main().catch(e => {
  console.error('FATAL:', e?.message ?? e)
  process.exitCode = 1
})
