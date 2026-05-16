/**
 * GET /api/collections/[slug]/jsonld
 *
 * Canonical JSON-LD endpoint for a collection. Reached via:
 *   - direct: /api/collections/<slug>/jsonld
 *   - middleware rewrite: /collections/<slug>.json
 *   - middleware rewrite: /collections/<slug> with Accept: application/ld+json
 *
 * Returns:
 *   - 200 application/ld+json — when collection exists AND is active
 *     (numberOfItems = 0 is valid; honest empty state)
 *   - 404 — when slug unknown OR collection inactive
 *
 * Slug is a route parameter. There is no default slug.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireActiveCollection } from '@/lib/collections/collections'
import { CollectionGateError } from '@/lib/collections/context'
import { getConsentedCollection } from '@/lib/collections/assemble'
import { buildCollectionJsonLd } from '@/lib/collections/jsonld'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const admin = adminClient()

  let collection
  try {
    collection = await requireActiveCollection(admin, slug)
  } catch (e) {
    if (e instanceof CollectionGateError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 404 })
    }
    throw e
  }

  const data = await getConsentedCollection(admin, slug)
  const body = buildCollectionJsonLd(collection, data)
  const etag = `"c-${slug}-${data.builders.length}-${data.most_recent_change ?? '0'}"`

  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      ETag: etag,
    },
  })
}
