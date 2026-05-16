# `src/lib/agent-card/` — A2A AgentCard for ShipStacked

Single source of truth for the document served at `/.well-known/agent-card.json`.

## Shape

A2A AgentCard v1.0 — the dominant convention.

- Spec: https://a2a-protocol.org/latest/specification/
- Adoption: 150+ orgs (Google, Microsoft, AWS, Salesforce, SAP, ServiceNow, Workday, IBM); Linux Foundation since June 2025.
- Path per RFC 8615: `/.well-known/agent-card.json` (Doc 05's corrected path).
- Content-Type: `application/a2a+json` (IANA registration in progress).

## Why this card carries a load-bearing disclaimer

A2A AgentCards are designed for **interactive agent servers** that respond
to A2A JSON-RPC messages (`message/send`). **ShipStacked is not that.**
ShipStacked is a structured-data publisher (HTML + JSON-LD + CSV).

The card uses A2A's shape because that is the convention agents probe,
but every signal a client could possibly read is set to truthfully
declare non-interactivity:

1. **`description`** — opens with `NOT AN INTERACTIVE A2A AGENT SERVER`
   in plain language. Cannot be missed by anyone parsing the document.
2. **`capabilities.streaming` / `pushNotifications` / `stateTransitionHistory`**
   are all `false`.
3. **`metadata.shipstacked:cardKind = "data-publisher"`** — explicit
   extension flag using the same `shipstacked:` namespace Beacon 1 and V2
   already publish.
4. **`metadata.shipstacked:respondsToA2AMessages = false`** — second
   explicit flag, separately findable.
5. **`skills[].name`** all begin with "Fetch …" — never "Invoke …",
   "Execute …", "Call …". The descriptions are phrased as
   "Fetch `<URL>` → returns `<media-type>`. Plain HTTP GET; no A2A
   invocation." Every skill is unambiguously a `curl`-able URL, not an
   RPC target.
6. **`url`** is the canonical site root (`https://shipstacked.com/`),
   present only because A2A v1.0 requires it. The card's own description
   notes we do NOT serve JSON-RPC there.

## Standing rules

- **No brand / partner / program / specific-collection-slug names.**
  Anywhere. The collections capability is declared generically via the
  slug-parameter route family. Updating this rule (e.g. naming a partner)
  requires Thomas's explicit approval AND a spec amendment.
- **Accuracy invariant.** Every endpoint declared in `skills[].examples`
  must actually exist and return what the description says. The
  verification script (`scripts/v2/verify-agent-card.ts`) curls each
  one and asserts; it is part of the H7 commit-gate.
- **One source.** This module is the only writer. Updating the card
  means PR-ing `buildAgentCard()`. The route handler at
  `src/app/.well-known/agent-card.json/route.ts` is a thin shell.

## What this card does NOT include (explicit non-goals)

- No signed AgentCard / JWS (A2A v1.2 feature — deferred to a later beacon).
- No IETF draft duplicate at `/.well-known/agentcard` (defer until draft stabilises).
- No `security.txt` (RFC 9116 — fast-follow, separate scope).
- No auth-gated surfaces, intake forms, or interactive routes.
- No `@id` graph extensions beyond what Beacon 1 already publishes.

## Updating the card when surfaces change

When a future beacon adds a new public surface, edit `buildAgentCard()`:
1. Append a new entry to `skills[]` with `id`, `name` ("Fetch …"),
   `description` ("Fetch `<URL>` → returns `<type>`. Plain HTTP GET; no
   A2A invocation."), `examples`, and `outputModes`.
2. Update `metadata.shipstacked:beacons.<beaconKey>.status` from
   `'deferred'` to `'live'` with the date.
3. Bump `version` if the change is non-trivial.
4. Re-run `node --env-file=.env.local scripts/v2/verify-agent-card.ts`
   to confirm every declared example URL is live.
