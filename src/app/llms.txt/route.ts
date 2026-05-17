/**
 * GET /llms.txt — dynamic LLM-discovery surface for ShipStacked.
 *
 * Replaces the static public/llms.txt with a route that enumerates Atlas
 * role URLs + recent public receipts (the V2 surfaces). LLM crawlers and
 * agent-training pipelines read this to discover what's here.
 *
 * Cached for 5 minutes at the edge.
 *
 * Spec: docs/v2/STEP_7_PUBLIC_PAGES_SPEC.md §7.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ATLAS_VERSION_DEFAULT } from '@/lib/atlas/roles'
import { getRecentPublicReceipts } from '@/lib/receipts/render'

export const revalidate = 300

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const HEADER = `# ShipStacked
> The proof-of-work platform for the agentic economy.

ShipStacked is where AI-native builders publish proof receipts — atomic, dereferenceable records of work shipped — and how companies find practitioners by their actual output rather than CV claims.

## Primary documents

- [The Atlas of the Agentic Economy](https://shipstacked.com/atlas): A practitioner-defined map of the labor market for AI integration. Specialist roles, operator types, the compliance layer, alignment research, vertical specialists. By Thomas Oxlee.

## Callable interface — MCP server

- [/api/mcp](https://shipstacked.com/api/mcp): Streamable HTTP MCP endpoint (protocol 2025-06-18). POST JSON-RPC; read-only tools over the same public data the rest of this site exposes. The AgentCard at /.well-known/agent-card.json declares this endpoint in \`metadata.shipstacked:mcpEndpoint\`.

## Atlas roles (v0.4)

Every role dereferences to JSON-LD (DefinedTerm + shipstacked:AtlasRole) via Accept: application/ld+json or the .json convenience suffix.
`

const FOOTER = `
## Get involved

- [Paste what you built](https://shipstacked.com/paste): For builders. URL in, proof receipt out.
- [Hiring teams: tell us what's broken](https://shipstacked.com/hire): For companies trying to hire AI integration talent.

## About

- Founder: Thomas Oxlee, currently embedded as the AI integration operator at a regulated EU business under AI Act exposure.
- Contact: hello@shipstacked.com
- Standards play: every proof receipt resolves to schema.org JSON-LD. Every Atlas role dereferences as DefinedTerm.
`

export async function GET() {
  const admin = adminClient()

  const { data: roles } = await admin
    .from('atlas_roles')
    .select('role_id, name, cluster')
    .eq('atlas_version', ATLAS_VERSION_DEFAULT)
    .order('cluster')
    .order('role_id')

  const rolesByCluster = new Map<string, Array<{ role_id: string; name: string }>>()
  for (const r of (roles ?? []) as Array<{ role_id: string; name: string; cluster: string }>) {
    if (!rolesByCluster.has(r.cluster)) rolesByCluster.set(r.cluster, [])
    rolesByCluster.get(r.cluster)!.push({ role_id: r.role_id, name: r.name })
  }

  const rolesText: string[] = []
  for (const [cluster, list] of Array.from(rolesByCluster.entries()).sort()) {
    rolesText.push(`\n### Cluster ${cluster}\n`)
    for (const r of list) {
      rolesText.push(`- [${r.role_id} — ${r.name}](https://shipstacked.com/atlas/roles/${r.role_id})`)
    }
  }

  const recent = await getRecentPublicReceipts(admin, 20)
  const receiptsText: string[] = []
  if (recent.length === 0) {
    receiptsText.push('\nNo public receipts yet. Be among the first.')
  } else {
    receiptsText.push('\nMost recent — every receipt dereferences to JSON-LD (CreativeWork + shipstacked:ProofReceipt).\n')
    for (const r of recent) {
      const date = new Date(r.issued_at).toISOString().slice(0, 10)
      receiptsText.push(`- [${r.title}](https://shipstacked.com/p/${r.slug}) — ${date}`)
    }
  }

  const body = [
    HEADER,
    rolesText.join('\n'),
    '\n## Build feed',
    '\n- [/feed](https://shipstacked.com/feed): recent public proofs',
    '\n## Recent proof receipts',
    receiptsText.join('\n'),
    FOOTER,
  ].join('\n')

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
    },
  })
}
