/**
 * GET /api/atlas/roles/<id>/jsonld — pure JSON-LD endpoint for an Atlas role.
 *
 * Reached via:
 *   - direct: /api/atlas/roles/<id>/jsonld
 *   - rewrite from middleware:
 *       * /atlas/roles/<id>.json
 *       * /atlas/roles/<id> with Accept: application/ld+json
 *
 * Honors ?v=<atlas_version> query param (defaults to v0.4).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  ATLAS_VERSION_DEFAULT,
  getAtlasRole,
  getRecentReceiptsAtRole,
  isValidAtlasVersion,
} from '@/lib/atlas/roles'
import { atlasRoleJsonLd } from '@/lib/atlas/jsonld'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const url = new URL(req.url)
  const v = url.searchParams.get('v')
  const version = v && isValidAtlasVersion(v) ? v : ATLAS_VERSION_DEFAULT

  const admin = adminClient()
  const role = await getAtlasRole(admin, id.toUpperCase(), version)
  if (!role) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  const recent = await getRecentReceiptsAtRole(admin, role.role_id, role.atlas_version)
  const body = atlasRoleJsonLd(role, recent)
  const etag = `"ar-${role.role_id}-${role.atlas_version}-${new Date(role.created_at).getTime()}"`
  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      ETag: etag,
    },
  })
}
