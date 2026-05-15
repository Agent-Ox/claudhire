/**
 * GET /api/p/<slug>/jsonld — pure JSON-LD endpoint for a receipt.
 *
 * Reached via two paths:
 *   - direct: /api/p/<slug>/jsonld (internal)
 *   - rewrite from middleware:
 *       * /p/<slug>.json
 *       * /p/<slug> with Accept: application/ld+json
 *       * /p/<slug> with Accept: application/vnd.shipstacked.receipt+json
 *         (returns the same JSON-LD shape — Phase 1B may split this into
 *         a raw internal projection)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getReceiptBundle } from '@/lib/receipts/render'
import { receiptJsonLd } from '@/lib/receipts/jsonld'

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
  const bundle = await getReceiptBundle(adminClient(), slug)
  if (!bundle) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  // Private receipts: serve nothing through JSON-LD without auth. The
  // HTML page handles owner-only render; the public-API endpoint stays
  // closed for private rows.
  if (bundle.receipt.visibility === 'private') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  const body = receiptJsonLd(bundle)
  const etag = `"r-${bundle.receipt.id}-${new Date(bundle.receipt.updated_at).getTime()}"`
  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      ETag: etag,
    },
  })
}
