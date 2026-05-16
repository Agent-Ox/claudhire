/**
 * MCP tool input schemas + error-shape helpers.
 *
 * Every input is validated by a strict zod schema BEFORE any DB call.
 * Every error is shaped through `toSafeError` so the response NEVER
 * leaks stack traces, DB error strings, file paths, or schema details.
 *
 * Spec:      docs/v2/TIER_3_BEACON_5_MCP_SERVER_SPEC.md §3 + §4.5
 * Discovery: docs/audit/BEACON_5_DISCOVERY.md §E (Decision C: posture α —
 *            input hardening ships regardless of rate-limit posture).
 */

import { z } from 'zod'

// ─── Input schemas (.strict() rejects unknown keys; bounded length + regex) ──

export const GetAtlasRoleInput = z.object({
  roleId: z.string()
    .regex(/^[A-G]\d+$/i, 'Invalid role id (expected pattern /^[A-G]\\d+$/)')
    .transform(s => s.toUpperCase()),
  version: z.enum(['v0.3', 'v0.4']).optional().default('v0.4'),
}).strict()

export const ListAtlasRolesInput = z.object({
  version: z.enum(['v0.3', 'v0.4']).optional().default('v0.4'),
}).strict()

export const GetCollectionInput = z.object({
  slug: z.string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Invalid slug (expected /^[a-z0-9-]+$/)'),
}).strict()

export const GetBuilderInput = z.object({
  username: z.string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/i, 'Invalid username (expected /^[a-z0-9_-]+$/)'),
}).strict()

// ─── JSON-RPC error codes (MCP / JSON-RPC 2.0 standard) ────────────────────

export const JSONRPC_PARSE_ERROR = -32700
export const JSONRPC_INVALID_REQUEST = -32600
export const JSONRPC_METHOD_NOT_FOUND = -32601
export const JSONRPC_INVALID_PARAMS = -32602
export const JSONRPC_INTERNAL_ERROR = -32603

export interface SafeError {
  code: number
  message: string
}

/**
 * Map any thrown value to a user-safe JSON-RPC error response.
 *
 * The handler does NOT use err.message directly (which could be a
 * Postgres or Supabase error string). It pattern-matches against
 * known error classes (zod, CollectionNotFoundError, null-result) and
 * emits the corresponding pre-defined safe message. Unknown error
 * classes collapse to "Internal error" with NO detail.
 *
 * Side-effect: the full error is logged via console.error server-side
 * for operational debugging. The user-facing payload is sanitized.
 */
export function toSafeError(err: unknown, context: string): SafeError {
  console.error(`[mcp:${context}]`, err)

  // 1. Zod validation failure → invalid params (use the schema-provided message,
  //    NOT the full zod ZodError JSON, which can leak schema details).
  if (err instanceof z.ZodError) {
    const first = err.issues[0]
    const msg = first?.message ?? 'Invalid params'
    return { code: JSONRPC_INVALID_PARAMS, message: `Invalid params: ${msg}` }
  }

  // 2. Collections module throws CollectionGateError for ALL gate failures
  //    (unknown_slug | inactive | unpublished_profile | fake_profile). Every
  //    code maps to the SAME safe "Collection not found" message — no oracle
  //    distinguishes the failure modes. Check by class name to avoid an
  //    import cycle.
  if (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'CollectionGateError') {
    return { code: JSONRPC_INVALID_PARAMS, message: 'Collection not found' }
  }

  // 3. Any other thrown value → generic Internal error. NO stack, NO message
  //    detail. Server-side console.error above retains the full info for ops.
  return { code: JSONRPC_INTERNAL_ERROR, message: 'Internal error' }
}

/**
 * The two specific "not found" responses for entities. These are CONSTANT
 * strings so the no-oracle property is unambiguous: a fake username
 * (published=false) and a nonexistent username produce the EXACT same
 * bytes via this helper.
 */
export const BUILDER_NOT_FOUND: SafeError = {
  code: JSONRPC_INVALID_PARAMS,
  message: 'Builder not found',
}

export const ATLAS_ROLE_NOT_FOUND: SafeError = {
  code: JSONRPC_INVALID_PARAMS,
  message: 'Atlas role not found',
}

export const COLLECTION_NOT_FOUND: SafeError = {
  code: JSONRPC_INVALID_PARAMS,
  message: 'Collection not found',
}
