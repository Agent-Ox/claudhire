/**
 * GET /api/collections/[slug]/csv
 *
 * CSV projection of the same consented builder set as the JSON-LD
 * endpoint. RFC 4180. Reached via direct hit or middleware rewrite
 * from /collections/<slug>.csv.
 *
 * Returns:
 *   - 200 text/csv — when collection exists AND is active (header
 *     row only when 0 members; honest empty state)
 *   - 404 — when slug unknown OR collection inactive
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireActiveCollection } from '@/lib/collections/collections'
import { CollectionGateError } from '@/lib/collections/context'
import { getConsentedCollection } from '@/lib/collections/assemble'
import { buildCollectionCsv } from '@/lib/collections/csv'

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

  try {
    await requireActiveCollection(admin, slug)
  } catch (e) {
    if (e instanceof CollectionGateError) {
      return new NextResponse(`error: ${e.code}\n`, {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
    throw e
  }

  const data = await getConsentedCollection(admin, slug)
  const body = buildCollectionCsv(data)
  const etag = `"c-${slug}-csv-${data.builders.length}-${data.most_recent_change ?? '0'}"`

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="shipstacked-${slug}.csv"`,
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      ETag: etag,
    },
  })
}
