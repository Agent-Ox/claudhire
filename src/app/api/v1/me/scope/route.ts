import { rateLimit } from '@/lib/rateLimit'
import { authenticateApiKey, apiError, apiOk } from '@/lib/apiAuth'

// Machine-readable capability map per scope. Lets an agent self-introspect what
// its key can and cannot do without trial-and-error 403s.
const CAPABILITIES_BY_SCOPE: Record<string, { can: string[]; cannot: string[] }> = {
  'builder:rw': {
    can: ['fetch-own-profile', 'update-own-profile', 'post-build', 'fetch-own-builds', 'fetch-builder', 'fetch-atlas-role'],
    cannot: ['search-talent', 'post-message', 'post-job', 'save-profile'],
  },
  'buyer:rw': {
    can: ['search-talent', 'fetch-builder', 'fetch-atlas-role', 'post-message', 'fetch-messages', 'post-job', 'save-profile', 'fetch-saved-profiles'],
    cannot: ['post-build', 'update-arbitrary-profile'],
  },
  'agent:rw': {
    can: ['fetch-own-profile', 'update-own-profile', 'post-build', 'fetch-own-builds', 'fetch-builder', 'fetch-atlas-role', 'fetch-principal-profile'],
    cannot: ['search-talent', 'post-message', 'post-job', 'save-profile'],
  },
}

// GET /api/v1/me/scope — any authenticated scope. No DB query beyond auth.
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)

  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')

  const caps = CAPABILITIES_BY_SCOPE[auth.auth.scope] ?? { can: [], cannot: [] }
  return apiOk({
    scope: auth.auth.scope,
    profile_username: auth.auth.profile.username,
    key_id: auth.auth.keyId,
    can: caps.can,
    cannot: caps.cannot,
  })
}
