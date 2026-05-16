/**
 * MCP JSON-RPC dispatch — Beacon 5.
 *
 * Hand-implemented JSON-RPC 2.0 dispatch for the MCP `2025-06-18`
 * protocol over Streamable HTTP. The protocol surface we use is small
 * (initialize + initialized + tools/list + tools/call) so a hand
 * implementation with explicit error-shaping is cleaner than wiring
 * the SDK's StreamableHTTPServerTransport into Next.js App Router's
 * Web-standards Request/Response.
 *
 * Protocol-compliance proof: scripts/v2/verify-mcp.ts uses the
 * official `@modelcontextprotocol/sdk` Client + StreamableHTTPClientTransport
 * to handshake against this server. If the official client succeeds,
 * we are protocol-compliant by construction.
 *
 * Spec:      docs/v2/TIER_3_BEACON_5_MCP_SERVER_SPEC.md
 * Discovery: docs/audit/BEACON_5_DISCOVERY.md §A + §B
 */

import { callTool, TOOL_DEFS } from './tools'
import {
  JSONRPC_PARSE_ERROR,
  JSONRPC_INVALID_REQUEST,
  JSONRPC_METHOD_NOT_FOUND,
  type SafeError,
} from './schemas'

export const MCP_SERVER_NAME = 'shipstacked-mcp'
export const MCP_SERVER_VERSION = '0.1.0'
export const MCP_PROTOCOL_VERSION = '2025-06-18'

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: unknown
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: SafeError
}

/**
 * Dispatch a single JSON-RPC message. Returns either:
 *   - JsonRpcResponse — for requests (id present)
 *   - null            — for notifications (no id) — caller returns 202 Accepted
 */
export async function dispatch(msg: unknown): Promise<JsonRpcResponse | null> {
  // ── Structural validation ──────────────────────────────────────────────
  if (typeof msg !== 'object' || msg === null) {
    return jsonRpcError(null, JSONRPC_PARSE_ERROR, 'Parse error')
  }
  const req = msg as Partial<JsonRpcRequest>
  if (req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
    return jsonRpcError(req.id ?? null, JSONRPC_INVALID_REQUEST, 'Invalid Request')
  }

  const isNotification = req.id === undefined || req.id === null

  // ── Method dispatch ────────────────────────────────────────────────────
  try {
    switch (req.method) {
      case 'initialize':
        return jsonRpcResult(req.id ?? null, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
        })

      case 'notifications/initialized':
        // No response for notifications — caller returns 202 Accepted.
        return null

      case 'tools/list':
        return jsonRpcResult(req.id ?? null, { tools: TOOL_DEFS })

      case 'tools/call': {
        const params = (req.params ?? {}) as { name?: string; arguments?: unknown }
        if (typeof params.name !== 'string') {
          return jsonRpcError(req.id ?? null, JSONRPC_INVALID_REQUEST, 'Missing tool name')
        }
        const result = await callTool(params.name, params.arguments)
        if (result.ok) {
          // MCP tools/call returns content[] of text or structured blocks.
          // Wrap the data as a JSON text block — the most universally consumable
          // shape; clients deserialize the text as JSON.
          return jsonRpcResult(req.id ?? null, {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
          })
        } else {
          // Tool failures use isError=true content per MCP convention, NOT
          // a JSON-RPC top-level error (top-level error is for protocol-level
          // failures like method-not-found; tool errors are application-level).
          return jsonRpcResult(req.id ?? null, {
            isError: true,
            content: [{ type: 'text', text: JSON.stringify(result.error) }],
          })
        }
      }

      case 'ping':
        return jsonRpcResult(req.id ?? null, {})

      default:
        if (isNotification) return null
        return jsonRpcError(req.id ?? null, JSONRPC_METHOD_NOT_FOUND, `Unknown method: ${req.method}`)
    }
  } catch (err) {
    // Truly unexpected dispatch-level error — log + generic message.
    console.error('[mcp:dispatch]', err)
    return jsonRpcError(req.id ?? null, -32603, 'Internal error')
  }
}

function jsonRpcResult(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result }
}

function jsonRpcError(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } }
}
