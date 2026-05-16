# `src/lib/mcp/` — MCP server for ShipStacked (Beacon 5)

Read-only MCP endpoint at `POST /api/mcp` (Streamable HTTP, protocol version `2025-06-18`).

## What's exposed

Four read-only tools, each backed by an existing public site surface via the EXACT shared source that surface uses:

| Tool | Reused source (file:function) | Gate |
|---|---|---|
| `get-atlas-role` | `src/lib/atlas/roles.ts` `getAtlasRole` + `src/lib/atlas/jsonld.ts` `atlasRoleJsonLd` | none (Atlas is public) |
| `list-atlas-roles` | `packages/atlas-roles` `rolesByVersion` (Beacon-4 package; Layer-2-verified equivalent to live) | none |
| `get-collection` | `src/lib/collections/collections.ts` `requireActiveCollection` (gate 1) + `src/lib/collections/assemble.ts` `getConsentedCollection` (gates 2-4) | collections.active + profiles.published + opted_out_at IS NULL |
| `get-builder` | `src/lib/profiles.ts` `getPublishedProfile` | profiles.published = true |

## The gate-inheritance contract

**Every tool's gate lives in its reused source — not in any tool-local code path.** The MCP handlers contain ZERO published/active/consent logic of their own; they call the source and return what it returns. To change a gate, modify the source — which means the change is reviewed once and applied everywhere.

The no-oracle property is structural:
- `get-builder` for a fake `published=false` profile AND for a nonexistent username both converge on `getPublishedProfile` returning `null` → same `BUILDER_NOT_FOUND` constant → byte-identical response.
- `get-collection` for a missing slug AND for an inactive slug both throw `CollectionNotFoundError` from `requireActiveCollection` → same `toSafeError` mapping → byte-identical response.

The Phase-2 verify-mcp.ts adversarial proof asserts these byte-equalities live (scripts/v2/verify-mcp.ts, the D.2 series).

## Hardening (Posture α — no rate limit; everything else ships)

- **Input schemas** are zod `.strict()` (rejects unknown keys), regex- and length-bounded. Defense-in-depth: Supabase parameterizes anyway.
- **Error-shaping** via `toSafeError` (src/lib/mcp/schemas.ts): zod failures → "Invalid params: <safe message>"; CollectionNotFoundError → "Collection not found"; null profile → "Builder not found"; anything else → generic "Internal error" with NO detail. The full error is `console.error`'d server-side for ops.
- **No `list-builders` or `list-collections` tools** — these would enable cheap bulk-extraction beyond what HTML scraping already costs. Forbidden by design.
- **No rate limit in v1** — the exposed data is already public via cheaper HTTP paths; rate-limiting the convenience layer while the open web is unlimited defends nothing. `@upstash/redis` is in deps for a future Tier-4 addition if observed usage demands it.
- **Origin header NOT strictly validated** — the spec recommends validation for DNS-rebinding prevention, but our server exposes only read-only public data so there's nothing for an attacker to steal via rebinding. Strict validation would also break remote agents (the intended use case).

## Transport: Streamable HTTP `2025-06-18`

Single endpoint at `/api/mcp`. POST = JSON-RPC; GET = 405 (no server-pushed SSE in v1). No sessions, no Mcp-Session-Id needed for stateless read-only tools. The `MCP-Protocol-Version: 2025-06-18` header is set on every response.

The protocol-compliance proof is `scripts/v2/verify-mcp.ts`: it uses the official `@modelcontextprotocol/sdk` Client + StreamableHTTPClientTransport to handshake against this server. If the official client connects successfully, we're protocol-compliant by construction.

## Architecture

```
POST /api/mcp                                              src/app/api/mcp/route.ts
  ├─ parse JSON body
  ├─ dispatch(msg)                                         src/lib/mcp/server.ts
  │   ├─ initialize           → InitializeResult
  │   ├─ notifications/initialized → 202 Accepted
  │   ├─ tools/list           → TOOL_DEFS                  src/lib/mcp/tools.ts
  │   └─ tools/call           → callTool(name, args)       src/lib/mcp/tools.ts
  │       ├─ get-atlas-role        → getAtlasRole + atlasRoleJsonLd
  │       ├─ list-atlas-roles      → rolesByVersion (Beacon-4)
  │       ├─ get-collection        → requireActiveCollection → getConsentedCollection
  │       └─ get-builder           → getPublishedProfile
  └─ return JSON-RPC response
```

## What this server does NOT do (non-goals; would violate Spec §3)

- ❌ No write tools. Read-only, absolutely. Forever.
- ❌ No tools over non-public data (receipts, applications, messages, dashboards — all auth-gated, never reachable).
- ❌ No `list-builders` (enumeration), no `list-collections` (brand-free symmetry).
- ❌ No re-implementation of any gated query (Spec §3 — reuse the source).
- ❌ No partner / program / brand / specific-collection-slug names in any tool description or output.
- ❌ Not announced in the AgentCard / AGENTS.md / `/llms.txt` in this beacon (fast-follow after live + verified, per Spec §2).
