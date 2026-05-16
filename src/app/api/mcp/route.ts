/**
 * POST /api/mcp — the MCP Streamable HTTP endpoint.
 *
 * Single-endpoint MCP server per the 2025-06-18 protocol. POST accepts
 * JSON-RPC requests; GET returns 405 (we don't use server-pushed SSE
 * since all our tools are synchronous read-only).
 *
 * Middleware: `/api/*` is excluded from middleware (verified at
 * src/middleware.ts matcher: `'/((?!_next/static|...|api).*)'`), so this
 * route is reached unmodified — no content-negotiation rewrite, no
 * auth-cookie overhead, no SSR-cookie reads.
 *
 * Security posture (per BEACON_5_DISCOVERY.md §E.4 + §E.5):
 *   - Posture α: NO rate-limit middleware (data is already public via
 *     cheaper HTTP paths; rate-limiting the convenience layer while the
 *     open web is unlimited defends nothing). `@upstash/redis` is in
 *     deps for a Tier-4 addition if real abuse is observed.
 *   - Origin: NOT strictly validated (read-only public data only;
 *     strict validation would break remote agents which is the intended
 *     use case).
 *   - Input hardening: zod `.strict()` + regex/length bounds on every
 *     tool input (Posture-α is "no RATE limit", NOT "no protection").
 *   - Error-shaping: every failure path returns a safe message via
 *     `toSafeError` — zero stack traces, zero DB error strings.
 *
 * Spec:      docs/v2/TIER_3_BEACON_5_MCP_SERVER_SPEC.md
 * Discovery: docs/audit/BEACON_5_DISCOVERY.md §B + §E
 */

import { NextResponse, type NextRequest } from 'next/server'
import { dispatch, MCP_PROTOCOL_VERSION } from '@/lib/mcp/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    // Malformed JSON → JSON-RPC parse error response, HTTP 200 per spec
    // (the protocol error rides in the JSON-RPC body, not the HTTP status).
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
        },
      },
    )
  }

  const result = await dispatch(body)

  // Notifications (no id) → 202 Accepted, no body.
  if (result === null) {
    return new NextResponse(null, {
      status: 202,
      headers: { 'MCP-Protocol-Version': MCP_PROTOCOL_VERSION },
    })
  }

  return NextResponse.json(result, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
      // No caching — these are dispatched RPC calls, not idempotent GETs.
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET() {
  // We don't implement server-pushed SSE in v1 (all tools are synchronous
  // read-only). Per MCP spec, returning 405 is the correct response.
  return new NextResponse(null, {
    status: 405,
    headers: {
      Allow: 'POST',
      'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
    },
  })
}
