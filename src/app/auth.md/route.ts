import { NextResponse } from 'next/server'

const AUTH_MD = `# ShipStacked Agent Registration

ShipStacked supports the [auth.md](https://workos.com/auth-md) open protocol for agent registration. Any AI agent — Claude, Cursor, ChatGPT, or custom — can register on behalf of a user without a browser-based signup form.

## Two surfaces

1. **Public data surface** — anonymous, no auth. AgentCard at \`/.well-known/agent-card.json\` and MCP at \`/api/mcp\`. Use this to discover ShipStacked's data without registering anything.

2. **Action surface** — authenticated via scoped API key. Use this to act on behalf of a user (search talent, message builders, post jobs, post builds, manage profile).

## Flow: User Claimed (OTP)

The agent POSTs to \`/api/agent/auth/claim\` with the user's email and desired scope. ShipStacked emails the user a 6-digit code. The agent prompts the user for the code, then POSTs it back via \`/api/agent/auth/claim/complete\`. The agent receives a scoped API key.

### Endpoints

- \`POST /api/agent/auth/claim\` — trigger OTP email, return claim_token
- \`POST /api/agent/auth/claim/complete\` — submit OTP + claim_token, return api_key

### Scopes

- \`builder:rw\` — manage own builder profile, post builds, read/write own messages
- \`buyer:rw\` — search talent, message builders, post jobs, manage shortlist

## Action endpoints

Once registered with a scoped key, the agent calls REST endpoints at \`/api/v1/*\`:

**builder:rw**
- \`GET /api/v1/me\` — own profile
- \`PATCH /api/v1/profile\` — update own profile
- \`POST /api/v1/builds\` — post a build
- \`GET /api/v1/builds\` — own recent builds

**buyer:rw**
- \`GET /api/v1/talent/search\` — ranked builder directory
- \`GET /api/v1/builders/<username>\` — deep-fetch a candidate
- \`GET /api/v1/messages\` / \`POST /api/v1/messages\` — own conversations
- \`POST /api/v1/jobs\` — post a job
- \`GET /api/v1/saved-profiles\` / \`POST /api/v1/saved-profiles\` — shortlist

**any scope**
- \`GET /api/v1/me/scope\` — introspect current key's permissions

Full machine-readable catalog at \`/api-docs\`.

## Trust model

API keys are scoped, revocable. The user can revoke at any time from their dashboard. Keys are presented as \`Authorization: Bearer sk_ss_*\` headers.

## On the roadmap

- OAuth Dynamic Client Registration (replaces bearer keys for agent-registered flows)
- Agent-verified ID-JAG flow (trusted-provider attestation)
- A2A peer-to-peer agent delegation
- AP2 (Universal Commerce Protocol) for hire-confirmation transactions

---

Contact: ox@agentagous.com
`

export async function GET() {
  return new NextResponse(AUTH_MD, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
