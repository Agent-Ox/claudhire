import { NextResponse } from 'next/server'
import { getRankedBuilders } from '@/lib/ranking/get-ranked-builders'

// Quality-ranked builders for client surfaces (homepage + /hirers featured grid).
// Server-computed Formula E; returns public-safe fields only. Ranked first, then
// below-threshold ("not yet ranked") fills any remaining slots up to `limit`.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const raw = parseInt(url.searchParams.get('limit') ?? '6', 10)
  const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 50) : 6

  const { ranked, belowThreshold } = await getRankedBuilders(limit)
  return NextResponse.json({ builders: [...ranked, ...belowThreshold] })
}
