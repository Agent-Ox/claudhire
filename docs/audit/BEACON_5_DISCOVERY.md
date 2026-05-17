# Tier 3 — Beacon 5: MCP Server — DISCOVERY (Phase 1)

**Author:** Claude (Opus 4.7, 1M context) — read-only discovery
**Date:** 2026-05-16
**Spec:** `docs/v2/TIER_3_BEACON_5_MCP_SERVER_SPEC.md` §4
**Status:** Phase 1 complete. STOP. Awaiting Thomas's explicit Section H approval — INCLUDING THE TRANSPORT CHOICE, THE GET-BUILDER ESCALATION, AND THE ABUSE-POSTURE DECISION.
**Governing principles (Spec §3, stricter than 1-4):** read-only absolutely; public-data-only with gate-inheritance; reuse existing single sources never re-implement; bounded request surface; no oracle/enumeration leak; abuse posture stated; brand-free; zero secrets; additive code-only; `git revert` = endpoint gone.
**Method:** read-only. Verified the current MCP-over-HTTP standard directly from the MCP spec at modelcontextprotocol.io (2025-06-18 protocol version). Inventoried every existing fetcher path each proposed tool would reuse (`getAtlasRole`, `atlasRoleJsonLd`, `requireActiveCollection`, `getConsentedCollection`, `/u/[username]/page.tsx`). Audited middleware for collision/framing risk. Confirmed MCP SDK availability + zod availability + Upstash Redis (rate-limit candidate already in deps). No DB queries, no repo files modified except this report.

---

## ⚠️ Two load-bearing items requiring Thomas's explicit decision

**Item 1 — Transport choice (§4.1).** Two transports in the current MCP spec: **stdio** (subprocess; not us, we're HTTP) and **Streamable HTTP** (the current and only standard HTTP transport — explicitly REPLACES the now-deprecated HTTP+SSE from protocol version 2024-11-05). **Recommendation: Streamable HTTP, protocol version `2025-06-18`.** Single endpoint, supports POST + GET, optional SSE streaming for long responses. No real alternative exists in current spec.

**Item 2 — `get-builder` is a §6 escalation.** The spec §3 example cites *"the `person.ts` path"* as the get-builder source. **`src/lib/jsonld/person.ts` is the JSON-LD builder (transforms a profile row → JSON-LD); it does NOT fetch the profile.** The actual published-gated fetcher is INLINE in `src/app/u/[username]/page.tsx` (two queries, both with `.eq('username', username).eq('published', true).single()`). There is no shared fetcher module to reuse. Per §3 + §6, three honest options exist — see §C.4 — and Thomas chooses at Section H. Recommendation: **Option B** (extract fetcher to `src/lib/profiles.ts`; behavior-preserving Beacon-4-pattern with byte-identical proof; the one existing-file edit).

---

## SECTION A — The current MCP-over-HTTP standard

### A.1 Transports (verified from modelcontextprotocol.io 2025-06-18 spec)

| Transport | Status | Fit for ShipStacked |
|---|---|---|
| **stdio** | Standard | Subprocess only. Not us — we deploy to Vercel as an HTTP server, not a local subprocess. |
| **Streamable HTTP** | **Standard, replaces HTTP+SSE** since protocol 2024-11-05 → 2025-03-26 | **The choice.** Single endpoint URL supporting POST + GET. Optional SSE streaming for long responses. |
| ~~HTTP+SSE~~ (legacy) | **Deprecated** (replaced by Streamable HTTP) | Backwards-compat only. Don't ship new servers on it. |
| Custom transports | Permitted but discouraged | Not applicable. |

Quote from the spec: *"This [Streamable HTTP] replaces the HTTP+SSE transport from protocol version 2024-11-05."*

### A.2 Streamable HTTP — required server behavior

- **Single MCP endpoint URL** that handles BOTH `POST` and `GET` methods (e.g. `https://example.com/mcp`).
- POST request body = a single JSON-RPC 2.0 *request*, *notification*, or *response*. Response is either `Content-Type: application/json` (single response) or `Content-Type: text/event-stream` (SSE stream for streaming responses).
- GET = optional SSE stream the server can use to push messages to the client (read-only servers can return `405 Method Not Allowed`).
- Client `Accept` header MUST include both `application/json` and `text/event-stream`.
- Protocol version header `MCP-Protocol-Version: 2025-06-18` on every request post-initialization.
- Optional `Mcp-Session-Id` header for stateful sessions (we don't need sessions for a stateless read server — skip).
- **Security warning from the spec (required to address):** *"Servers MUST validate the Origin header on all incoming connections to prevent DNS rebinding attacks."* See §E.4 for the pragmatic posture (read-only public data + no auth means DNS-rebinding has nothing to steal — but we still flag this).

### A.3 Required initialize handshake

Client POSTs:
```json
{ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {},
    "clientInfo": { "name": "...", "version": "..." }
}}
```
Server responds:
```json
{ "jsonrpc": "2.0", "id": 1, "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "shipstacked-mcp", "version": "0.1.0" }
}}
```
Client then POSTs `notifications/initialized` (no response expected — server returns `202 Accepted`). After that, normal `tools/list` and `tools/call` flow per JSON-RPC.

### A.4 Tool definition shape

`tools/list` returns an array of `{ name, description, inputSchema }`. `inputSchema` is a standard JSON Schema object — zod-derived `z.toJSONSchema()` is the conventional way to produce it.

### A.5 Recommended TypeScript SDK

**`@modelcontextprotocol/sdk`** — Anthropic's official MCP SDK. NOT currently in this repo's deps (`npm install` needed in Phase 2). Provides:
- Server class with handshake/lifecycle handled
- `setRequestHandler(ListToolsRequestSchema, ...)` and `setRequestHandler(CallToolRequestSchema, ...)` for tool registration
- A `StreamableHTTPServerTransport` ready to wire into a Next.js route handler

**Alternative considered: hand-implement JSON-RPC.** Possible but adds protocol-correctness risk (handshake / version-negotiation / session-management edge cases are easy to get subtly wrong). **Recommend the SDK** — same logic as choosing the A2A v1.0 shape for Beacon 2: standards-shaped via the reference implementation. New dep is small (Anthropic-maintained, MIT, server-side only).

---

## SECTION B — Route slot in this Next.js app + collision/framing check

### B.1 The route slot

**Recommended: `/api/mcp/route.ts`** — handled at `src/app/api/mcp/route.ts`.

| Slot option | Pros | Cons |
|---|---|---|
| **`/api/mcp`** ← recommended | Middleware **already excludes `/api/*`** from auth + content-negotiation rewrites (verified — `matcher: '/((?!_next/static|...|api).*)'`). Zero middleware change. Pattern matches V2 JSON-LD endpoints (`/api/p/<slug>/jsonld`, `/api/atlas/roles/<id>/jsonld`, `/api/collections/<slug>/jsonld`). No overhead from auth/cookie/Supabase middleware code. | None — the convention in this codebase is `/api/<service>` for non-RPC HTTP services. |
| `/mcp` (per MCP spec example) | Matches spec's example URL `https://example.com/mcp` exactly. | Would route THROUGH middleware (which would attempt auth-cookie reads on every MCP POST — unnecessary overhead). Would need a middleware matcher change to exclude. The spec's example is informational; it explicitly says *"this could be a URL like https://example.com/mcp"* — any single endpoint URL satisfies the requirement. |

**Choosing `/api/mcp` is strictly better:** zero middleware change, consistent with existing API routes, middleware-bypassed by design.

### B.2 Middleware framing collision check (verified)

`src/middleware.ts:13-78` (the `tryContentNegotiation` function) matches these patterns:
- `/p/<slug>.json` → rewrite to `/api/p/<slug>/jsonld`
- `/atlas/roles/<id>.json` → rewrite to `/api/atlas/roles/<id>/jsonld`
- `/collections/<slug>.{json,csv}` → rewrite to `/api/collections/<slug>/{jsonld,csv}`
- Accept-negotiation for the same paths

**Zero match for `/api/mcp`** — middleware doesn't touch `/api/*` at all (`matcher` exclusion). No rewrite, no Accept-header inspection, no body-touching, no auth check. **MCP protocol framing is safe.**

### B.3 Existing `/mcp` or `/api/mcp` routes (collision check)

- `src/app/mcp/`, `src/app/api/mcp/` — **DO NOT EXIST** (verified). No collision.
- `src/services/extractors/mcp_server.ts` — exists but is the V2 paste-classifier probing EXTERNAL `/.well-known/mcp` URLs on user-pasted content. Does NOT expose anything at our `/mcp`. Confirmed safe in Beacon 2 discovery; unchanged.
- `public/.well-known/mcp` or any other `.well-known/mcp` artifact — does NOT exist (only `.well-known/agent-card.json` from Beacon 2). No collision.

### B.4 `git revert` cleanliness

If `git revert <beacon-5-sha>` is run: the new files (`src/app/api/mcp/route.ts` and `src/lib/mcp/*`) disappear, no orphaned handlers remain (the route is the only entry point), middleware is unchanged (because we never touched it). Next deploy → the `/api/mcp` route returns 404. **Endpoint fully gone.** Verified by the structural analysis: nothing else in the codebase references `mcp` as a route, and no middleware code path invokes the MCP handler.

---

## SECTION C — The minimal tool set (each justified by an existing public surface)

**4 tools proposed.** Each backed by an existing public site surface. Each read-only by construction (the reused source is a read path; no write exists downstream). Each schema is precise and bounded.

### C.1 `get-atlas-role`

| Property | Value |
|---|---|
| Mirrors site surface | `https://shipstacked.com/atlas/roles/<id>.json?v=<version>` |
| **Reused source** | `getAtlasRole(supabase, roleId, version)` at **`src/lib/atlas/roles.ts:46`** + `atlasRoleJsonLd(role)` at **`src/lib/atlas/jsonld.ts:42`** — exactly what the JSON-LD API route (`src/app/api/atlas/roles/[id]/jsonld/route.ts`) and the HTML page (`src/app/atlas/roles/[id]/page.tsx:63`) already call. |
| Input schema | `z.object({ roleId: z.string().regex(/^[A-G]\d+$/i).transform(s => s.toUpperCase()), version: z.enum(['v0.3', 'v0.4']).optional().default('v0.4') })` |
| Output shape | `AtlasRoleJsonLd` (the same DefinedTerm + shipstacked:AtlasRole structure the site serves) |
| Gate inheritance | No gate needed — Atlas roles are entirely public; `atlas_roles` has no published/active column; all rows are returnable. RLS allows anon read. |
| Read-only proof | `getAtlasRole` is a SELECT-only Supabase query (`.from('atlas_roles').select('*').eq(...)`). No `.insert`/`.update`/`.upsert`/`.delete` exists in `src/lib/atlas/roles.ts`. Path is structurally read. |
| Error mapping | role not found → MCP error code `-32602` `"Atlas role not found"`. Invalid input → `-32602` `"Invalid role id (expected pattern /^[A-G]\\d+$/)"`. |

### C.2 `list-atlas-roles`

| Property | Value |
|---|---|
| Mirrors site surface | The Beacon 4 package's `rolesByVersion` (already published as snapshots in `packages/atlas-roles/src/data/`) AND the live `/atlas` page's role list. |
| **Reused source** | **`getAllAtlasRoles(supabase, version)` — needs to be added.** *Wait — see §G.1: §3 forbids "re-implement" — but a simple `select * from atlas_roles where atlas_version = $1` is the same query the seed script writes to and the site implicitly reads through `getAtlasRole`. Discovery options:* either (a) add `getAllAtlasRoles` to `src/lib/atlas/roles.ts` (extending an existing source module, not creating a parallel one), or (b) just import from `packages/atlas-roles` Beacon-4 snapshot at runtime (zero new query, zero new fetcher, just import the package data) — **recommend (b)**: ZERO new query, the snapshot is gate-verified-equivalent to live by Beacon 4's Layer-2 proof. |
| Input schema | `z.object({ version: z.enum(['v0.3', 'v0.4']).optional().default('v0.4') })` |
| Output shape | `{ version, roles: AtlasRoleData[] }` — array of role data (small array: ~40 v0.4 + ~34 v0.3 entries) |
| Gate inheritance | Same as C.1 — Atlas is public, no gate. |
| Read-only proof | Pure data import from `@shipstacked/atlas-roles` (a static snapshot generated at build time). No DB query at all. |
| Bounded size | v0.4 = 40 roles × ~600 bytes ≈ 24KB; v0.3 = 34 roles × similar ≈ 20KB. Cap-safe. |
| Note | The fact that we import from our own Beacon-4 package is the strongest possible "one source" — the package data is gate-proven equivalent to live `/atlas/roles/<id>.json` by Beacon 4's Layer-2 verify. |

### C.3 `get-collection`

| Property | Value |
|---|---|
| Mirrors site surface | `https://shipstacked.com/collections/<slug>` (HTML) + `.json` + `.csv` |
| **Reused source** | **`requireActiveCollection(db, slug)`** at `src/lib/collections/collections.ts:58` (gate 1) **THEN `getConsentedCollection(db, slug)`** at `src/lib/collections/assemble.ts:55` (gates 2-3-4). Exactly the two-call pattern every site collection surface uses (`src/app/collections/[slug]/page.tsx:60`, `src/app/api/collections/[slug]/{jsonld,csv}/route.ts:36/47/48`). |
| Input schema | `z.object({ slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/) })` |
| Output shape | The same `ConsentedCollection` shape `getConsentedCollection` returns (collection meta + builder array) |
| Gate inheritance | **All 4 gates inherited by reusing the two-function combo:** gate 1 (`collections.active = true`) enforced by `requireActiveCollection` throwing `CollectionNotFoundError`; gates 2 (`profiles.published = true`) + 3 (`memberships.opted_out_at IS NULL`) + 4 (fake-implicit-via-published) enforced inside `getConsentedCollection`'s SQL at `src/lib/collections/assemble.ts:50-66`. **See §D for the adversarial proof.** |
| Read-only proof | `requireActiveCollection` → `getCollection` → `db.from('collections').select(...)` (SELECT only). `getConsentedCollection` is two SELECT queries (memberships + profiles bulk-load). Zero write path. |
| Error mapping | Unknown/inactive slug → `requireActiveCollection` throws `CollectionNotFoundError` → caught and converted to MCP error `-32602` `"Collection not found"`. **Same response for unknown slug and inactive slug → no oracle.** |

### C.4 `get-builder` — §6 ESCALATION (Thomas decides)

The spec §3 cites *"the `person.ts` path"* as the source. **That source does not exist as a fetcher.** `src/lib/jsonld/person.ts` is the JSON-LD builder (transforms profile-row → JSON-LD); the actual published-gated fetcher is INLINE in `src/app/u/[username]/page.tsx:11-15` and `:36-41`:

```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, role, bio, about, location, verified, username, velocity_score, primary_profession')
  .eq('username', username)
  .eq('published', true)      // ← THE GATE (inline)
  .single()
```

There is no shared `getPublishedProfile(username)` module to reuse. Per spec §3 *"reuse existing single sources, never re-implement"* and §6 *"a tool that re-implements a query instead of reusing the source is a §6 escalation"*, the get-builder tool cannot be honestly built without making a choice. Three options (Thomas picks at Section H):

| Option | What it does | Pros | Cons |
|---|---|---|---|
| **A — Defer get-builder** | Ship Beacon 5 with 3 tools (get-atlas-role, list-atlas-roles, get-collection). Add get-builder later when the fetcher is extracted (e.g. Tier 4). | Strictest spec compliance. Zero existing-file modification. Cleanest revert. | Smaller surface. The "an agent can look up a public builder by username" use case is missing. |
| **B (recommended) — Extract fetcher, ship 4 tools** | Extract `getPublishedProfile(username, db)` into a new `src/lib/profiles.ts`. Modify `/u/[username]/page.tsx` to import from there (behavior-preserving — same SQL, same gate). MCP tool imports the same function. Beacon-4 pattern: before/after byte-identical proof in H10. | All 4 tools ship. Strict reuse invariant preserved. Extraction PERMANENTLY improves the codebase (a missing standard fetcher gets added). Same precedent as Beacon 4's parser extraction (proven safe). | One existing-file modification (`/u/[username]/page.tsx`). Spec §6 flags this as escalation territory — requires Thomas's explicit approval. |
| C — Re-implement query in tool | Off the table. Explicitly violates §3 + §6. | n/a | Creates a second source-of-truth for the published gate. Drift risk forever. **Forbidden.** |

**Recommendation: B.** Same logic as Beacon 4's parser extraction — extract once, byte-prove behavior-preserving, both consumers reuse from then on. The fact that the published-gated fetcher is currently inline in a single page is itself a pre-existing codebase debt that Beacon 5 has occasion to fix correctly while preserving every existing behavior.

**If B is approved:** the proposed Section H below assumes B. If you pick A, drop H4 (the extraction step), drop H8 (the get-builder tool), drop the get-builder adversarial test in H10.D, and the tool set becomes 3.

### C.5 Tools explicitly NOT proposed (and why)

- **`list-builders`** — would enumerate all published profiles. Already enumerable via `/talent` HTML scraping, but that's HTML+pagination friction; exposing it via MCP enables cheap bulk extraction. **Rejected.** If Thomas wants this later, design abuse limits first.
- **`list-collections`** — would enumerate all active collections by slug. Slugs are not secret (they're URLs anyone can guess) but per the brand-free rule, ShipStacked never publishes the canonical list anywhere. **Rejected** for symmetry with the rule.
- **`search-builders`** — query/filter API. Way beyond minimal. **Rejected.**
- **Any write/mutation tool** (`opt-in`, `create-collection`, `submit-receipt`, etc.) — Spec §3: read-only, full stop. Never.
- **Any tool over receipts, applications, messages, dashboards** — auth-gated; not public. Never.

---

## SECTION D — The gate-inheritance proof (load-bearing section)

This is the safety property the whole beacon hinges on. **The proof has two layers — a static design proof (this section) and an adversarial runtime test (Phase 2 H10).**

### D.1 The structural proof (design-level)

For each tool, the gate lives IN the reused source — not in any tool-local code path:

| Tool | Gate(s) | Lives in (verified) |
|---|---|---|
| `get-atlas-role` | None — Atlas is public | n/a |
| `list-atlas-roles` | None | n/a |
| `get-collection` | (1) collections.active = true; (2) profiles.published = true; (3) memberships.opted_out_at IS NULL; (4) fake-implicit-via-#2 | (1) `src/lib/collections/collections.ts:58-73` `requireActiveCollection` — throws CollectionNotFoundError on inactive/missing; (2-4) `src/lib/collections/assemble.ts:50-66` SQL — `.eq('profiles.published', true).is('opted_out_at', null)` plus belt-and-braces `if (!p || !p.published) continue` at line 178 |
| `get-builder` (Option B) | profiles.published = true | `src/lib/profiles.ts:getPublishedProfile` (extracted from `/u/[username]/page.tsx` — same SQL, same `.eq('published', true)`) |

**The tool handlers contain ZERO published/active/consent logic of their own.** They simply call the source function and convert the result/error to MCP shape. The gate is structurally impossible to bypass without modifying the source — which would be a separate, reviewed change.

### D.2 The adversarial test design (mandatory at Phase 2 H10)

The Phase 2 verification gate MUST include this exact test sequence and SHOW THE ACTUAL TOOL RESPONSES. A pass is: the fake/unpublished/inactive entity is non-returnable AND the response is **identical** to the response for a nonexistent entity (no oracle).

**Test D.2.a — fake username via `get-builder` (Option B only):**
```
tools/call get-builder { username: "jennypeterson224" }   → MCP error -32602 "Builder not found"
tools/call get-builder { username: "__nonexistent_xyz__" } → MCP error -32602 "Builder not found"
```
Responses MUST be byte-identical. Fake (`published=false`) and nonexistent both fail at `.single()` with PGRST116 → identical surface error.

**Test D.2.b — fake feed-author via `get-builder`:**
Same as D.2.a for all 3 known fakes: `jennypeterson224`, `johnchambers73`, `oxleethomasagentox598`. All three MUST return identical "Builder not found".

**Test D.2.c — unknown slug via `get-collection`:**
```
tools/call get-collection { slug: "__nonexistent_collection__" } → MCP error -32602 "Collection not found"
```
`requireActiveCollection` throws `CollectionNotFoundError(slug, 'NOT_FOUND')` → caught, returned as MCP error.

**Test D.2.d — inactive slug via `get-collection`:**
Requires an inactive collection to exist; if no inactive collection currently exists in the DB, the test creates a fixture via direct DB insert (admin script, not via MCP), runs the test, then drops the fixture. ALTERNATIVELY: skip this test if no inactive collection exists, document that gate (1) is structurally enforced by `requireActiveCollection` (which throws identically for missing AND inactive — same error code `NOT_FOUND`). **Recommend the simpler path:** rely on `requireActiveCollection`'s source-code-verified behavior (same error class for missing vs inactive — see `src/lib/collections/collections.ts:67-72`); D.2.c proves the error-mapping path; the missing-vs-inactive equivalence is proven by reading the source.

**Test D.2.e — get-builder with a real published builder (sanity):**
```
tools/call get-builder { username: "aniketaslaliya801" } → success with profile data
```
Confirms the tool actually works for the happy path.

**Test D.2.f — get-atlas-role full equivalence:**
```
tools/call get-atlas-role { roleId: "A1" }     → success
tools/call get-atlas-role { roleId: "ZZZZ" }   → MCP error -32602 "Atlas role not found"
tools/call get-atlas-role { roleId: "drop;--" } → schema-rejected, MCP error -32602 "Invalid role id"
```

**Test D.2.g — output equivalence to live site (the Beacon-4-style proof):**
For a representative role + a representative collection, the tool output structurally equals the site's JSON-LD response for the same entity (since both go through the same source). Run:
```
tools/call get-atlas-role { roleId: "A1" }     vs curl https://shipstacked.com/atlas/roles/A1.json
tools/call get-collection { slug: "<some-real-active-collection-slug>" } vs curl https://shipstacked.com/collections/<slug>.json
```
Structural compare; same result. (If no real active collection exists at test time, skip the collection half; the source-reuse argument plus the unit-of-reuse `requireActiveCollection`+`getConsentedCollection` proves equivalence structurally.)

### D.3 What proves "no oracle" (information leak through error differences)

The two failure modes for `get-builder` MUST yield byte-identical error responses:
- nonexistent profile (no row) → Supabase `.single()` returns `{ data: null, error: PGRST116 }` → tool sees null → returns `"Builder not found"`.
- unpublished profile (`published=false`) → Supabase query has `.eq('published', true)` → no row matches → `.single()` returns `{ data: null, error: PGRST116 }` → tool sees null → returns `"Builder not found"`.

Both code paths converge at the SAME `null` check in the source. Same error message, same MCP code, same response bytes. **No oracle exists.** The adversarial test (D.2.a / D.2.b) is the live proof.

For `get-collection`, the same applies: `requireActiveCollection` throws the same `CollectionNotFoundError(slug, 'NOT_FOUND')` for missing AND inactive (verified at `src/lib/collections/collections.ts:62-72`). One catch path → one error response.

---

## SECTION E — Request-surface hardening + abuse posture

### E.1 Per-tool input schemas (zod, machine-validated)

```ts
// All schemas use existing zod (^3.25.76 in deps).
const GetAtlasRoleInput = z.object({
  roleId: z.string().regex(/^[A-G]\d+$/i, "Invalid role id (expected pattern /^[A-G]\\d+$/)").transform(s => s.toUpperCase()),
  version: z.enum(['v0.3', 'v0.4']).optional().default('v0.4'),
}).strict();

const ListAtlasRolesInput = z.object({
  version: z.enum(['v0.3', 'v0.4']).optional().default('v0.4'),
}).strict();

const GetCollectionInput = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "Invalid slug (expected /^[a-z0-9-]+$/)"),
}).strict();

const GetBuilderInput = z.object({   // Option B only
  username: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/i, "Invalid username (expected /^[a-z0-9_-]+$/)"),
}).strict();
```

`.strict()` rejects unknown keys → no smuggling extra params. Min/max length bounds prevent multi-megabyte inputs. Regex bounds prevent SQL/path/command injection via the input string (the Supabase client also parameterizes, but defense-in-depth).

Zod validation runs FIRST in every handler — before any DB call. Invalid input → MCP error `-32602 "Invalid params"` with the schema-generated error message (e.g. `"Invalid role id (expected pattern /^[A-G]\\d+$/)"`). The error message is the schema's own message — never the raw zod error or stack trace.

### E.2 Error-shaping (no leak)

Every tool handler wrapped in:
```ts
try {
  // parse input → call source → return result
} catch (err) {
  // log full err server-side (console.error)
  // return ONE OF the pre-defined safe error shapes:
  //   - "Invalid params: <schema message>"  (zod failures only — sanitized to user-safe message)
  //   - "<entity-kind> not found"           (any missing/inactive/unpublished case)
  //   - "Internal error"                    (any unrecognized exception class — no detail)
}
```

**Banned in any user-facing error message:**
- Stack traces
- File paths
- DB error strings (PGRST*, Supabase messages, Postgres column names)
- Schema details (table names, column names)
- Environment variable names
- Internal IDs that aren't the input the user provided

The handler does NOT use `err.message` directly — it pattern-matches against known error classes (`CollectionNotFoundError`, `ZodError`, `PGRST116` null result) and emits the corresponding safe message; unknown error classes get `"Internal error"`.

### E.3 Enumeration/oracle analysis

| Tool | Enumeration risk | Mitigation |
|---|---|---|
| `get-atlas-role` | None — Atlas roles are public; enumerating them via the package data (`list-atlas-roles`) is bounded and intended. | None needed. |
| `list-atlas-roles` | Returns all roles for a version (~40 entries, ~24KB). Bounded by Atlas content size. | Acceptable — same data the package ships. |
| `get-collection` | Slug must be guessed (the brand-free rule means slugs aren't published). Active/inactive/missing all return identical error. | No list-collections tool ⇒ no enumeration path. Per-call rate limit acceptable risk (see E.4). |
| `get-builder` (Option B) | Username space is huge (any string matching `/^[a-z0-9_-]+$/`). Brute-force enumeration would hit DB but reveal nothing not already public via `/u/<username>` HTML (which is already cheaply scrapable). No published/unpublished oracle (D.3). | No list-builders tool ⇒ no efficient enumeration path. Per-call latency is the natural floor. |

**Critically: no `list-builders` tool ships.** Enumerating the builder set via MCP would be functionally equivalent to scraping `/talent` but cheaper for the attacker. Forbidden.

### E.4 Abuse / rate-limiting posture — Thomas decides at H

**Two postures to choose from:**

**Posture α — No MCP-specific rate limit in v1 (accepted documented risk).**
- Rationale: the data exposed is already public via HTML routes that have no MCP-specific rate limit either. The underlying DB sees the same load profile from `/u/`, `/atlas/`, `/collections/` HTTP traffic, which has not historically required rate limiting at the DB level.
- Bounded by: Vercel's edge concurrency limits + Supabase connection pool limits (both are infra-level, not per-route).
- Documented in the MCP server's README as: *"v1: no per-call rate limit. Abuse mitigation is at the Vercel/Supabase infrastructure layer. If MCP-specific abuse arises, the next iteration will add `@upstash/redis`-backed rate limiting (already in deps)."*
- Pros: minimal v1, KISS, doesn't over-build, matches the rest of the site's posture.
- Cons: a determined attacker could use MCP for cheaper enumeration than scraping HTML. Atlas + Collection data is already public; builder data is already public via `/u/`. So the attack value is low.

**Posture β — Add `@upstash/redis`-backed per-IP rate limit in v1.**
- Already in deps (verified: `"@upstash/redis": "^1.37.0"`). Existing pattern in `src/lib/rateLimit.ts`.
- Limit: e.g. 30 tool calls per IP per minute (any tool). Above limit → MCP error `-32603 "Rate limited; retry after N seconds"`.
- Pros: defense in depth. Limits cost of accidental abuse.
- Cons: adds complexity. Choosing the right limit is itself a tradeoff (too low → breaks legitimate agent use; too high → useless).

**Recommendation: α (accepted risk for v1)**, on the grounds of "minimal, read-only, public-data-only" + the data is already public via cheaper-or-equivalent HTTP paths + the Tier 4 housekeeping can add β if needed once we observe real usage. **Thomas decides at Section H.**

### E.5 The `Origin` header / DNS-rebinding posture

MCP spec security warning: *"Servers MUST validate the Origin header on all incoming connections to prevent DNS rebinding attacks."* The attack model: a malicious browser page on `evil.com` uses DNS-rebinding to make `shipstacked.com` resolve to localhost, then calls our MCP server.

For our server:
- The server is **deployed to a public domain** (shipstacked.com), not localhost. DNS-rebinding attacks specifically target localhost servers — they have less force against public deployments.
- Even if rebinding succeeded, the server exposes ONLY read-only public data. There is nothing to steal that isn't already on the public site.
- Strict Origin validation would BREAK the intended use case (remote agents calling our MCP from arbitrary client environments often have no/arbitrary Origin headers).

**Recommended posture:** **Do NOT validate Origin strictly.** Document the tradeoff in the README: *"This MCP server exposes only read-only public data. Strict Origin validation is not enforced to enable remote-agent access. The DNS-rebinding attack surface is limited to data already public on shipstacked.com."*

If Thomas disagrees: posture variant β would add Origin allowlist (e.g. `shipstacked.com` + `localhost:3000`) — but rejects most real-world agent calls. **Recommendation stands: don't strictly validate.**

---

## SECTION F — Confirmation: no Beacon 1-4 / Collections / V2 modification (Option A); ONE existing-file edit (Option B)

### F.1 Files NOT modified under EITHER option

- All of `src/lib/jsonld/` (Beacon 1) — including `person.ts` (byte-unchanged invariant since 0ceb69a, 5 commits running).
- All of `src/lib/agent-card/` (Beacon 2).
- `AGENTS.md`, `CLAUDE.md` (Beacon 3) — NOT updated to announce the MCP server (per Spec §2: fast-follow after live + verified, not this beacon).
- All of `packages/atlas-roles/` (Beacon 4) — the package gets IMPORTED by the MCP server but its source isn't modified.
- All of `src/lib/collections/` (Consented Collections) — `getConsentedCollection`, `requireActiveCollection`, `getCollection`, all unchanged.
- All of `src/lib/atlas/` — `getAtlasRole`, `atlasRoleJsonLd`, `parse.ts`, `roles.ts`, `jsonld.ts` all unchanged.
- All of `src/lib/receipts/` (V2 spine).
- `src/middleware.ts` — middleware is unchanged (the `(?!...|api)` exclusion already covers `/api/mcp`; no matcher edit needed).
- `scripts/v2/verify-agent-card.ts` (Beacon 2 accuracy gate) — unchanged.
- The `llms.txt` route, sitemap, robots — unchanged.

### F.2 The ONE existing-file edit under Option B (recommended)

**`src/app/u/[username]/page.tsx`** — modified to import `getPublishedProfile` from a new `src/lib/profiles.ts`. The change replaces the inline `.from('profiles').select(...).eq('username',username).eq('published',true).single()` with `await getPublishedProfile(supabase, username)`. **Same SQL, same gate, same result.**

- The extracted function in `src/lib/profiles.ts` is byte-equivalent to the inline query (verifiable by a Beacon-4-pattern before/after proof: capture profile fetched BEFORE the edit, capture profile fetched AFTER, assert byte-identical).
- The MCP `get-builder` tool imports the same `getPublishedProfile` function. Single source.
- Same precedent as Beacon 4's `parseAtlas` extraction from `seed-atlas-roles.ts` — verified safe.

Under Option A (deferred get-builder), NO existing file is modified.

### F.3 New files

| Path | Purpose | Lines (est.) |
|---|---|---|
| `src/app/api/mcp/route.ts` | Next.js route handler — POST + GET; wires the MCP server transport | ~80 |
| `src/lib/mcp/server.ts` | MCP server setup — name, version, tool registration | ~60 |
| `src/lib/mcp/tools.ts` | The 3-4 tool handlers; each calls a reused source | ~150 |
| `src/lib/mcp/schemas.ts` | zod input schemas + error-shape helpers | ~70 |
| `src/lib/mcp/README.md` | Module quick-ref + reuse contract + abuse posture | ~80 |
| `src/lib/profiles.ts` (Option B only) | The extracted `getPublishedProfile` shared fetcher | ~30 |
| `scripts/v2/verify-mcp.ts` | The adversarial gate-inheritance test + protocol handshake test | ~200 |
| `package.json` | Add `@modelcontextprotocol/sdk` dep (no `private:true` change; no script changes needed) | +1 line |

### F.4 No secrets, no strategic context, no brand-partner

- Server name `"shipstacked-mcp"`, description `"Read-only MCP server for the ShipStacked Atlas, builder profiles, and consented collections."` — brand-free.
- Tool descriptions parallel the AgentCard skill descriptions (Beacon 2 style): "Fetch X. Returns Y. No mutations."
- Brand-free verified at Phase 2 H10 via the existing `BRAND_ALLOWLIST_FORBIDDEN` allowlist (Beacon 2 verify-agent-card.ts pattern, applied to all new files).
- Zero env-var-name references in MCP files; the route handler uses the same standard server-side environment-variable pair the V2 API routes already use (not exposed in any error).

### F.5 Production data: zero mutation

- All tools are read-only by construction (each reused source is a SELECT-only path).
- No `npm install` writes (other than the SDK dep) — no DB connection from any install/script.
- The verify-mcp.ts adversarial gate may need a temporary inactive-collection fixture (D.2.d) — **but recommendation D.2.d says skip the fixture** and rely on structural-source-reuse. So zero DB write.

---

## SECTION G — Findings & escalations (propose-don't-auto-expand)

### G.1 The `list-atlas-roles` source — recommend Beacon-4-package import, not a new query

Per spec §3 "never re-implement": the cleanest implementation of `list-atlas-roles` is `import { rolesByVersion } from '@shipstacked/atlas-roles'` (or relative import to `packages/atlas-roles/src/index.ts` if the package isn't yet published, which it isn't). **The package data is Beacon-4 Layer-2-verified equivalent to live `/atlas/roles/<id>.json`.** Zero new query, zero new fetcher, perfect single-source.

Alternative (add `getAllAtlasRoles` to `src/lib/atlas/roles.ts`): also acceptable, would be a minor source-module addition (not a parallel source — it'd extend the existing module). Slightly more code; identical behavior. **Recommend the package import.**

### G.2 **The `get-builder` escalation** (already detailed in §C.4 and Item 2 at the top)

Surfacing here per §6 protocol: Thomas chooses Option A (defer) vs Option B (extract; recommended) vs Option C (re-implement; forbidden). **Recommendation: B**, with the Beacon-4-pattern byte-identical proof in H10.

### G.3 The MCP SDK is a new dep

`@modelcontextprotocol/sdk` is not currently in `package.json`. Phase 2 H7 adds it via `npm install @modelcontextprotocol/sdk`. Anthropic-maintained, MIT-licensed, no transitive deps with security history concerns. Roughly 50KB minified. Server-side only — does not impact bundle.

### G.4 No fast-follow MCP announcement in this beacon

Per Spec §2: announcing the MCP server in the AgentCard (`@shipstacked/atlas-roles` `skills[]` would gain a new entry pointing to `/api/mcp`), AGENTS.md, or `/llms.txt` is a fast-follow — not bundled here. The announcement IS small and useful (would let agents probe the AgentCard and discover MCP) but bundling it dilutes the single-purpose nature of this beacon. **Defer to a tiny separate commit after Beacon 5 is live and verified.**

### G.5 Tier 4 housekeeping items inherited

Per Spec §7, Tier 4's ledger now has the following items (from prior beacons + this discovery):

1. Tier 0 seed-jobs: 404 live vs 308 commit-described (Beacon 3 D.1).
2. ~~Beacon 1 homepage Person+WebSite drift — RESOLVED as regex false-positive~~ (Beacon 3 D.2).
3. Beacon 4 discovery "44 v0.4 roles" narrative vs 40 verified-true (your in-flight note after Beacon 4 ship).
4. (Beacon 3 G.5 housekeeping) Commit `docs/audit/` audit trail; `.gitignore` the `.claude/` local-settings dir.
5. **NEW (this discovery):** the `/u/[username]` page's inline published-gated fetcher should be extracted to `src/lib/profiles.ts` for shared reuse — this happens IN Phase 2 H4 if Option B is approved, eliminating this item; if Option A is approved, it stays as a Tier-4 item.

---

## SECTION H — Proposed Phase 2 change list (FOR THOMAS APPROVAL)

Numbered. Each individually approvable. Each fully reversible (`git revert <sha>` removes the `/api/mcp` route entirely — endpoint gone). **Zero DB mutation. Zero registry interaction. Zero existing-file behavior change** (the Option-B extraction is byte-identical-output behavior-preserving).

### **H-DECISION-A — Transport choice**

> **Approve: Streamable HTTP (MCP protocol version `2025-06-18`)** at `/api/mcp` with the official `@modelcontextprotocol/sdk`. No real alternative exists in the current spec; HTTP+SSE is deprecated; stdio is for subprocess servers.

### **H-DECISION-B — `get-builder` (§6 escalation)**

> Choose ONE:
> - **Option B (recommended):** Extract `getPublishedProfile` to `src/lib/profiles.ts`; modify `/u/[username]/page.tsx` to import; ship 4 MCP tools. Beacon-4-pattern byte-identical proof in H10.
> - Option A: Ship 3 MCP tools, defer get-builder + the extraction to Tier 4. Strictest spec compliance; no existing-file edit.
> - Option C: Re-implement query in tool. **Forbidden** — listed only for completeness.

### **H-DECISION-C — Abuse posture (E.4)**

> Choose ONE:
> - **Posture α (recommended):** No MCP-specific rate limit in v1; documented accepted risk; can add `@upstash/redis` rate-limit in Tier 4 if observed usage demands it.
> - Posture β: Add `@upstash/redis` per-IP rate limit in v1 (~30 calls/IP/min).

### H1 — Install MCP SDK

`npm install @modelcontextprotocol/sdk` — adds the dependency to `package.json`. Anthropic-maintained, MIT, server-side only. Run `npm install` from repo root; commits the updated `package-lock.json`.

### H2 — Create `src/lib/mcp/server.ts` + `tools.ts` + `schemas.ts`

- `server.ts` — exports `buildMcpServer()` function that constructs and registers the MCP server with name, version, and the tool list.
- `tools.ts` — exports tool handlers. Each: zod-validate input → call the reused source → return MCP-shaped success or convert error to safe shape.
- `schemas.ts` — exports the zod input schemas + the error-shape helpers (`toSafeError(err)` pattern-matches known classes to safe strings).

### H3 — Create `src/app/api/mcp/route.ts`

- Route handler. POST: parse JSON-RPC, dispatch via SDK transport. GET: returns `405 Method Not Allowed` (we don't use server-pushed SSE in v1 since all tools are synchronous read-only).
- Sets correct Content-Type per spec.
- Does NOT validate Origin strictly (per E.5).

### H4 — Extract `getPublishedProfile` to `src/lib/profiles.ts` (Option B ONLY)

- New file `src/lib/profiles.ts` exporting `getPublishedProfile(db: SupabaseClient, username: string): Promise<Profile | null>`.
- Modify `src/app/u/[username]/page.tsx`: both queries (the `generateMetadata` and the main page query) replaced with calls to `getPublishedProfile`. **Same SQL, same gate, same result.**
- Behavior-preserving proof captured in H10 (Beacon-4-pattern: before/after byte-identical).
- **Skip H4 entirely if Option A approved.**

### H5 — Create `src/lib/mcp/README.md`

Brand-free module quick-ref. Documents: chosen transport + protocol version, the tool list + sources each reuses, the gate-inheritance contract (every tool's gate lives in its reused source — modify the source if you want to change the gate), abuse posture, error-shape contract, "no fast-follow announcements bundled here".

### H6 — Create `scripts/v2/verify-mcp.ts`

The adversarial proof script (D.2 series): performs MCP handshake locally, then calls every tool with the test inputs. Asserts:
- `get-builder('jennypeterson224')` → identical to `get-builder('__nonexistent_xyz__')` (oracle test) — Option B only.
- `get-builder('aniketaslaliya801')` → success (happy path) — Option B only.
- `get-collection('__nonexistent_collection__')` → MCP error "Collection not found".
- `get-atlas-role('A1')` → success matching package data.
- `get-atlas-role('ZZZZ')` → MCP error.
- `get-atlas-role('drop;--')` → schema-rejected.
- `list-atlas-roles({version: 'v0.4'})` → 40 entries.
- Initialize handshake succeeds with `protocolVersion: '2025-06-18'`.
- Every error response: ZERO stack traces, ZERO DB error strings, ZERO file paths.

Same shape as `verify-agent-card.ts` from Beacon 2 — Node-runnable, `--base` flag for local vs prod. Becomes the mechanized gate going forward.

### H7 — Verification (before commit)

- `npx tsc --noEmit` clean (host repo, includes new MCP files).
- `npm run build` clean; `/api/mcp` route appears in build output.
- `verify-mcp.ts --base http://localhost:3000` passes ALL adversarial assertions.
- **Option B byte-identical proof:** capture profile-fetch output (`/u/aniketaslaliya801` SSR HTML) BEFORE H4 (git stash), capture AFTER, diff must be empty bytewise (or at minimum: the same profile row is fetched and rendered, structurally identical).
- `git status`: only new files (+ H4's two-file edit if Option B) — no Beacon 1/2/3/4/Collections/V2/middleware modifications.
- `src/lib/jsonld/person.ts` byte-unchanged (the standing invariant).
- Brand-free grep on all new files: zero matches against the Beacon 2 allowlist.
- Env-var-name grep on all new files: zero matches.
- Prior-tier prod regressions intact (the standard 4-curl + Beacon-2 AgentCard spot-check).
- **`npm publish` NOT run** (paranoia — this beacon adds a dep but doesn't publish anything; the registry-untouched discipline carries over).

### H8 — Commit + push

Commit message documents: the chosen transport + protocol version (`2025-06-18`); the tool set with the exact source each reuses (file:function); the gate-inheritance design proof + the adversarial test results (verbatim); read-only-by-construction proof; abuse posture shipped; brand-free / no-secrets / Option-B byte-identical proof if applicable; code-only / `git revert` removes the endpoint cleanly.

Push to `origin/main`. Poll Vercel deploy. Then run **verify-mcp.ts --base https://shipstacked.com** against PROD as the post-deploy load-bearing check: the live MCP server speaks the protocol AND the adversarial gate proof passes against the live endpoint. Report deploy SHA + the prod adversarial-proof output + the standard prior-tier regression curls.

### H9 — What this spec does NOT do (explicit non-goals)

- ❌ Does NOT mutate any data (no write tools).
- ❌ Does NOT expose non-public data (no receipts, no auth-gated, no service-role data).
- ❌ Does NOT add `list-builders` or `list-collections` tools (enumeration concerns; G.5).
- ❌ Does NOT modify any Beacon 1-4 / Collections / V2 source. (Option B's extraction is behavior-preserving with byte-identical proof.)
- ❌ Does NOT add an announcement of the MCP server to the AgentCard / AGENTS.md / llms.txt (fast-follow, per spec §2).
- ❌ Does NOT run `npm publish` for `@shipstacked/atlas-roles` (Beacon 4's decoupled-publish rule still applies; the MCP server imports the package via the relative path within the monorepo until/unless the package is published).
- ❌ Does NOT strictly validate Origin (E.5 — data is already public; strict validation breaks remote agents).
- ❌ Does NOT name any partner, program, brand, or specific collection slug.

---

## Sources verified during this discovery

- **MCP spec (2025-06-18):** https://modelcontextprotocol.io/specification/2025-06-18/basic/transports — Streamable HTTP standard, deprecated HTTP+SSE, JSON-RPC over HTTP POST+GET with optional SSE, Mcp-Session-Id, MCP-Protocol-Version header, Origin security warning, single endpoint URL.
- **MCP SDK:** `@modelcontextprotocol/sdk` (not yet in deps; Anthropic-maintained, MIT, npm install in H1).
- **`src/lib/atlas/roles.ts:46`** — `getAtlasRole(supabase, roleId, version)` (the get-atlas-role source).
- **`src/lib/atlas/jsonld.ts:42`** — `atlasRoleJsonLd(role, recentReceipts)` (output shape; same as live `/atlas/roles/<id>.json`).
- **`src/lib/collections/collections.ts:58-73`** — `requireActiveCollection(db, slug)` (gate 1 enforcer; throws `CollectionNotFoundError` for missing AND inactive — same error class → same MCP response → no oracle).
- **`src/lib/collections/assemble.ts:50-66`** — `getConsentedCollection(db, slug)` SQL with `.eq('profiles.published', true).is('opted_out_at', null)` (gates 2-4 enforcer).
- **`src/app/u/[username]/page.tsx:11-15, 36-41`** — inline `.eq('username', username).eq('published', true).single()` (the gate that needs extracting under Option B; G.2).
- **`src/middleware.ts`** — full read confirms `matcher: '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|og-default.svg|api).*)'` excludes `/api/*` from auth + content-negotiation. `/api/mcp` slot is collision-free.
- **`src/services/extractors/mcp_server.ts`** — confirmed unchanged (paste-classifier probing EXTERNAL `/.well-known/mcp` URLs, not exposing our own; pre-existing safe pattern).
- **`package.json`** — `zod` (^3.25.76) + `@upstash/redis` (^1.37.0) both present; `@modelcontextprotocol/sdk` is NOT (added in H1).
- **`packages/atlas-roles/src/index.ts`** — `rolesByVersion` available as the Beacon-4 import for `list-atlas-roles` (G.1).
- **`src/app/.well-known/agent-card.json/route.ts`** — reference handler pattern for the new `/api/mcp/route.ts` (Cache-Control, Content-Type, NextResponse usage).

---

*End of Phase 1 discovery. STOP. Awaiting Thomas's review of:*
- ***H-DECISION-A (transport)** — Streamable HTTP `2025-06-18` recommended; no real alternative exists.*
- ***H-DECISION-B (get-builder §6 escalation)** — Option B recommended (extract fetcher; behavior-preserving with byte-identical proof). Option A (defer get-builder) is the strictest-spec-compliance alternative.*
- ***H-DECISION-C (abuse posture)** — Posture α recommended (no v1 rate limit; documented accepted risk; data already public via cheaper HTTP paths). Posture β adds `@upstash/redis`-backed per-IP limit.*
- *Section H change list (item-by-item or as-a-whole approval).*

*Before Phase 2.*
