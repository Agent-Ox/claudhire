/**
 * GET /.well-known/agent-card.json
 *
 * Serves the ShipStacked AgentCard per A2A v1.0 at the RFC 8615
 * well-known path. Thin shell over src/lib/agent-card/builder.ts —
 * the builder is the single source of truth; this handler sets
 * headers and serializes.
 *
 * Spec:      docs/v2/TIER_3_BEACON_2_AGENTCARD_SPEC.md
 * Discovery: docs/audit/BEACON_2_DISCOVERY.md (Section H approved 2026-05-16)
 *
 * Note: the directory name `agent-card.json` is a literal route segment
 * (Next.js App Router accepts dots in segment names — same pattern the
 * existing `/llms.txt/route.ts` uses).
 */

import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { buildAgentCard } from '@/lib/agent-card/builder'

export const dynamic = 'force-static'

export async function GET() {
  const card = buildAgentCard()
  const body = JSON.stringify(card, null, 2)
  // Content-hash ETag — lets clients use If-None-Match for cheap polling.
  // The hash includes the full body, so any field change rotates the ETag.
  const etag = `"agent-card-${createHash('sha256').update(body).digest('hex').slice(0, 16)}"`

  return new NextResponse(body, {
    status: 200,
    headers: {
      // A2A v1.0 specifies application/a2a+json (IANA registration in
      // progress). Tooling that doesn't recognize the media type falls
      // back to JSON parsing — same body, no behavioural risk.
      'Content-Type': 'application/a2a+json; charset=utf-8',
      // Card changes only on deploy; 5min fresh + 1hr SWR is conservative.
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      ETag: etag,
    },
  })
}
