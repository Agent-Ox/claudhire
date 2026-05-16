/**
 * MCP tool handlers — Beacon 5.
 *
 * Each tool: zod-validate input → call THE EXISTING SHARED SOURCE → wrap
 * result in MCP shape. ZERO re-implementation. Every gate (published /
 * active / consent) lives in the reused source module, inherited
 * structurally not enforced here.
 *
 * The 4 tools and their single-source reuse:
 *
 *   get-atlas-role        → src/lib/atlas/roles.ts getAtlasRole +
 *                           src/lib/atlas/jsonld.ts atlasRoleJsonLd
 *   list-atlas-roles      → packages/atlas-roles (the Beacon-4 package data;
 *                           Layer-2-equivalent-to-live by mechanized proof)
 *   get-collection        → src/lib/collections/collections.ts
 *                           requireActiveCollection (gate 1: collections.active)
 *                           THEN src/lib/collections/assemble.ts
 *                           getConsentedCollection (gates 2-3-4: profiles.published
 *                           + opted_out_at IS NULL + implicit-fake-via-published)
 *   get-builder           → src/lib/profiles.ts getPublishedProfile
 *                           (extracted from /u/[username]/page.tsx with
 *                           byte-identical proof; gate: profiles.published)
 *
 * Spec:      docs/v2/TIER_3_BEACON_5_MCP_SERVER_SPEC.md §3-§4
 * Discovery: docs/audit/BEACON_5_DISCOVERY.md §C + §D
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getAtlasRole, ATLAS_VERSION_DEFAULT } from '@/lib/atlas/roles'
import { atlasRoleJsonLd } from '@/lib/atlas/jsonld'
import { parseAtlas, type Role } from '@/lib/atlas/parse'
import { requireActiveCollection } from '@/lib/collections/collections'
import { getConsentedCollection } from '@/lib/collections/assemble'
import { getPublishedProfile } from '@/lib/profiles'
import {
  GetAtlasRoleInput,
  ListAtlasRolesInput,
  GetCollectionInput,
  GetBuilderInput,
  toSafeError,
  ATLAS_ROLE_NOT_FOUND,
  COLLECTION_NOT_FOUND,
  BUILDER_NOT_FOUND,
  type SafeError,
} from './schemas'

// Service-role Supabase client for read-only queries (matches the V2 +
// Collections + Atlas API-route pattern — same env-var pair the rest of
// /api/* uses; never exposed in any error message).
function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// In-memory cache for parsed Atlas roles. The canonical source is the
// markdown + parseAtlas — same path Beacon 4's package derives from, so
// Beacon 4's Layer-2 live-prod equivalence proof transitively guarantees
// this cache matches what consumers see at /atlas/roles/<id>.json.
// One-time parse per server process; sub-millisecond subsequent hits.
const atlasRolesCache = new Map<'v0.3' | 'v0.4', Role[]>()
async function getAllAtlasRoles(version: 'v0.3' | 'v0.4'): Promise<Role[]> {
  const cached = atlasRolesCache.get(version)
  if (cached) return cached
  const filename = `atlas-${version.replace(/\./g, '')}.md` // v0.4 → atlas-v04.md
  const md = await readFile(join(process.cwd(), 'src', 'content', filename), 'utf-8')
  const warnings: unknown[] = []
  const roles = parseAtlas(md, version, warnings as never)
  atlasRolesCache.set(version, roles)
  return roles
}

export interface ToolSuccess {
  ok: true
  data: unknown
}
export interface ToolError {
  ok: false
  error: SafeError
}
export type ToolResult = ToolSuccess | ToolError

// ─── Tool definitions (the tools/list response shape) ──────────────────────

export interface ToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'get-atlas-role',
    description:
      'Fetch a single Atlas role by its id (e.g. "A1", "G3"). Returns the same Schema.org DefinedTerm + shipstacked:AtlasRole JSON-LD shape served at https://shipstacked.com/atlas/roles/<id>.json. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        roleId: { type: 'string', pattern: '^[A-Ga-g]\\d+$', description: 'Role id like A1, B3, G5.' },
        version: { type: 'string', enum: ['v0.3', 'v0.4'], description: 'Atlas content version. Defaults to v0.4.' },
      },
      required: ['roleId'],
      additionalProperties: false,
    },
  },
  {
    name: 'list-atlas-roles',
    description:
      'List all Atlas roles for a given version. Returns the role data shipped in @shipstacked/atlas-roles (Beacon-4-verified equivalent to the live site). Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        version: { type: 'string', enum: ['v0.3', 'v0.4'], description: 'Atlas content version. Defaults to v0.4.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get-collection',
    description:
      'Fetch a consented collection by slug. Only active collections containing only consented + published builders are returned; unknown or inactive slugs return a clean not-found indistinguishable from each other. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[a-z0-9-]+$', description: 'Collection slug.' },
      },
      required: ['slug'],
      additionalProperties: false,
    },
  },
  {
    name: 'get-builder',
    description:
      'Fetch a public builder profile by username. Only published profiles are returned; unpublished and nonexistent usernames return the exact same not-found response (no oracle). Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9_-]+$', description: 'Builder username.' },
      },
      required: ['username'],
      additionalProperties: false,
    },
  },
]

// ─── Tool handlers ─────────────────────────────────────────────────────────

export async function callTool(name: string, rawArgs: unknown): Promise<ToolResult> {
  try {
    switch (name) {
      case 'get-atlas-role': {
        const args = GetAtlasRoleInput.parse(rawArgs ?? {})
        const db = adminClient()
        const role = await getAtlasRole(db, args.roleId, args.version)
        if (!role) return { ok: false, error: ATLAS_ROLE_NOT_FOUND }
        const jsonld = atlasRoleJsonLd(role, [])
        return { ok: true, data: jsonld }
      }

      case 'list-atlas-roles': {
        const args = ListAtlasRolesInput.parse(rawArgs ?? {})
        const roles = await getAllAtlasRoles(args.version)
        return { ok: true, data: { version: args.version, count: roles.length, roles } }
      }

      case 'get-collection': {
        const args = GetCollectionInput.parse(rawArgs ?? {})
        const db = adminClient()
        // requireActiveCollection throws CollectionNotFoundError for BOTH
        // missing AND inactive — same class → toSafeError emits the same
        // "Collection not found" message → no oracle between missing/inactive.
        await requireActiveCollection(db, args.slug)
        const data = await getConsentedCollection(db, args.slug)
        return { ok: true, data }
      }

      case 'get-builder': {
        const args = GetBuilderInput.parse(rawArgs ?? {})
        const db = adminClient()
        const profile = await getPublishedProfile(db, args.username)
        // Null result for unpublished OR nonexistent — both converge here.
        // Same BUILDER_NOT_FOUND constant → byte-identical response → no oracle.
        if (!profile) return { ok: false, error: BUILDER_NOT_FOUND }
        return { ok: true, data: profile }
      }

      default:
        return { ok: false, error: { code: -32601, message: `Unknown tool: ${name}` } }
    }
  } catch (err) {
    return { ok: false, error: toSafeError(err, `callTool:${name}`) }
  }
}

// Suppress ATLAS_VERSION_DEFAULT unused-import warning in builds that
// tree-shake — it's documented in the comment header but not referenced
// at runtime (the zod schema's default('v0.4') is the operational value).
void ATLAS_VERSION_DEFAULT
