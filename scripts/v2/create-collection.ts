/**
 * Create a consented collection.
 *
 * The ONLY way a collection comes into existence on production: insert
 * a row in public.collections. No collection ever exists in code.
 *
 * Usage:
 *   node --env-file=.env.local --experimental-strip-types \
 *     scripts/v2/create-collection.ts \
 *     --slug <slug> --title "<title>" [--description "<desc>"] [--inactive] [--deactivate]
 *
 * Flags:
 *   --slug         required. lowercase, hyphen-separated, 1-64 chars.
 *   --title        required (unless --deactivate).
 *   --description  optional. shown italic under the dashboard card.
 *   --inactive     creates with active=false (default: active=true).
 *   --deactivate   flips an existing collection's active flag to false
 *                  (preserves consent history; the public read policy
 *                  hides inactive collections so /collections/<slug>
 *                  immediately 404s). Use this to retire a collection
 *                  without deleting it.
 *
 * Spec: docs/v2/TIER_3_FOUNDING_BETA_GATEWAY_SPEC.md
 * Discovery: docs/audit/GATEWAY_DISCOVERY.md §H (revised) — H8.
 */

import { createClient } from '@supabase/supabase-js'
import { isValidSlug } from '../../src/lib/collections/collections.ts'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      out[key] = true
    } else {
      out[key] = next
      i++
    }
  }
  return out
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const slug = args.slug as string | undefined
  const title = args.title as string | undefined
  const description = args.description as string | undefined
  const inactive = args.inactive === true
  const deactivate = args.deactivate === true

  if (!slug) {
    console.error('ERROR: --slug is required')
    console.error('Usage: create-collection.ts --slug <slug> --title "<title>" [--description "<desc>"] [--inactive] [--deactivate]')
    process.exit(2)
  }
  if (!isValidSlug(slug)) {
    console.error(`ERROR: invalid slug "${slug}" — must be lowercase, hyphen-separated, 1-64 chars, no leading/trailing or consecutive hyphens`)
    process.exit(2)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  if (deactivate) {
    const { data, error } = await admin
      .from('collections')
      .update({ active: false })
      .eq('slug', slug)
      .select('slug, title, active')
      .maybeSingle()
    if (error) { console.error('deactivate failed:', error.message); process.exit(1) }
    if (!data) { console.error(`no collection with slug "${slug}"`); process.exit(1) }
    console.log(`deactivated: ${data.slug} ("${data.title}") active=${data.active}`)
    console.log(`/collections/${slug} now 404s (public read RLS is gated on active=true)`)
    return
  }

  if (!title) {
    console.error('ERROR: --title is required when creating a new collection')
    process.exit(2)
  }

  const { data: existing } = await admin
    .from('collections')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) {
    console.error(`ERROR: collection "${slug}" already exists`)
    process.exit(1)
  }

  const { data, error } = await admin
    .from('collections')
    .insert({
      slug,
      title,
      description: description ?? null,
      active: !inactive,
    })
    .select('slug, title, description, active, created_at')
    .single()
  if (error || !data) {
    console.error('insert failed:', error?.message ?? 'unknown')
    process.exit(1)
  }

  console.log('created:')
  console.log(`  slug:        ${data.slug}`)
  console.log(`  title:       ${data.title}`)
  console.log(`  description: ${data.description ?? '(none)'}`)
  console.log(`  active:      ${data.active}`)
  console.log(`  created_at:  ${data.created_at}`)
  console.log('')
  console.log('Public URLs:')
  console.log(`  HTML:    https://shipstacked.com/collections/${data.slug}`)
  console.log(`  JSON-LD: https://shipstacked.com/collections/${data.slug}.json`)
  console.log(`  CSV:     https://shipstacked.com/collections/${data.slug}.csv`)
  console.log('')
  console.log(`Dashboard card will appear for every published builder. 0 builders are auto-enrolled.`)
}

main().catch(e => {
  console.error('FATAL:', e?.message ?? e)
  process.exit(1)
})
