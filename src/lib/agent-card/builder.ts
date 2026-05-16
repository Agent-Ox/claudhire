/**
 * AgentCard builder — the single source of truth for the document
 * served at /.well-known/agent-card.json.
 *
 * Shape: A2A AgentCard v1.0 (the dominant convention, Linux Foundation,
 * https://a2a-protocol.org/latest/specification/). Path matches Doc 05's
 * corrected `/.well-known/agent-card.json`.
 *
 * IMPORTANT — this card is a DATA-PUBLISHER card, not an interactive
 * A2A agent server card. ShipStacked publishes structured data (HTML +
 * JSON-LD + CSV); it does NOT respond to A2A JSON-RPC messages. The
 * non-interactivity disclaimer is load-bearing and unmissable:
 *
 *   1. `description` opens with the disclaimer in plain language.
 *   2. `capabilities` are all false.
 *   3. `metadata.shipstacked:cardKind = "data-publisher"`.
 *   4. Each skill description is phrased as "Fetch <URL> → returns
 *      <media-type>" — never as an invokable RPC action.
 *   5. The `url` field exists only because A2A v1.0 requires it; we
 *      do NOT serve JSON-RPC at that URL.
 *
 * Spec: docs/v2/TIER_3_BEACON_2_AGENTCARD_SPEC.md
 * Discovery: docs/audit/BEACON_2_DISCOVERY.md §A §D (decision: A2A v1.0
 * with unmissable data-publisher disclaimer; Section H approved 2026-05-16).
 *
 * Standing rules enforced in this file:
 *   - No brand, partner, program, or specific-collection-slug names
 *     anywhere in this card body. Collections capability is declared
 *     GENERICALLY via the slug-parameter route family.
 *   - The skills list is what the card declares about ShipStacked's
 *     surfaces; updating means PR-ing this function.
 *   - The `metadata.shipstacked:` extensions use the same namespace
 *     Beacon 1 + V2 already publish, so the whole site is one graph.
 */

import { CANONICAL_HOST, SHIPSTACKED_NS } from '../jsonld/context.ts'

// ─── A2A v1.0 types (minimal — only the fields we populate) ──────────

export interface AgentSkill {
  id: string
  name: string
  description: string
  tags?: string[]
  examples?: string[]
  inputModes?: string[]
  outputModes?: string[]
}

export interface AgentCapabilities {
  streaming: boolean
  pushNotifications: boolean
  stateTransitionHistory: boolean
  extensions: unknown[]
}

export interface AgentProvider {
  organization: string
  url: string
}

export interface AgentCard {
  protocolVersion: string
  name: string
  description: string
  url: string
  version: string
  documentationUrl?: string
  provider: AgentProvider
  capabilities: AgentCapabilities
  defaultInputModes: string[]
  defaultOutputModes: string[]
  skills: AgentSkill[]
  metadata: Record<string, unknown>
}

// ─── Constants ───────────────────────────────────────────────────────

const A2A_PROTOCOL_VERSION = '1.0.0'
const CARD_VERSION = '0.1.0'

// Unmissable non-interactivity disclaimer. Lead clause of `description`.
// Anyone parsing this card cannot reasonably miss that this is NOT an
// interactive A2A agent server.
const DESCRIPTION = [
  'NOT AN INTERACTIVE A2A AGENT SERVER — this is a data-publisher card.',
  'ShipStacked publishes structured data (HTML + JSON-LD + CSV) describing',
  'public builder profiles, the Atlas role taxonomy, proof receipts, and',
  'consented collections. All declared skills below are HTTP GET targets',
  'returning the listed media types; they are NOT invokable A2A tasks.',
  'The `url` field exists only because A2A v1.0 requires it — we do NOT',
  'respond to JSON-RPC at that endpoint. Capabilities are all false. See',
  '`metadata.shipstacked:cardKind = "data-publisher"`.',
].join(' ')

// ─── Skill helpers ───────────────────────────────────────────────────

const TEXT_PLAIN_IN: string[] = ['text/plain']

function fetchSkill(opts: {
  id: string
  name: string
  description: string
  tags: string[]
  examples: string[]
  outputModes: string[]
}): AgentSkill {
  // Every skill name leads with "Fetch …" or "Read …" so it cannot be
  // mistaken for an invokable A2A action. The description starts with
  // "Fetch <url> → returns <media-type>" for the same reason.
  return {
    id: opts.id,
    name: opts.name,
    description: opts.description,
    tags: opts.tags,
    examples: opts.examples,
    inputModes: TEXT_PLAIN_IN,
    outputModes: opts.outputModes,
  }
}

// ─── The builder ─────────────────────────────────────────────────────

export function buildAgentCard(): AgentCard {
  const skills: AgentSkill[] = [
    fetchSkill({
      id: 'fetch-builder-profile',
      name: 'Fetch a public builder profile',
      description:
        'Fetch https://shipstacked.com/u/<username> → returns text/html with embedded schema.org/Person + shipstacked:Builder JSON-LD. ' +
        'The Person @id matches the identity used in proof receipts and consented collections (one URL keys the whole graph). ' +
        'This is a plain HTTP GET; no A2A invocation.',
      tags: ['schema.org', 'Person', 'shipstacked:Builder', 'http-get'],
      examples: [`GET ${CANONICAL_HOST}/u/<username>`],
      outputModes: ['text/html'],
    }),
    fetchSkill({
      id: 'fetch-atlas-role',
      name: 'Fetch an Atlas role definition by id',
      description:
        'Fetch https://shipstacked.com/atlas/roles/<id> → returns text/html with embedded schema.org/DefinedTerm + shipstacked:AtlasRole. ' +
        'Append .json or send Accept: application/ld+json to receive the pure JSON-LD body instead. ' +
        'Plain HTTP GET with content negotiation; no A2A invocation.',
      tags: ['schema.org', 'DefinedTerm', 'shipstacked:AtlasRole', 'taxonomy', 'http-get'],
      examples: [
        `GET ${CANONICAL_HOST}/atlas/roles/<id>`,
        `GET ${CANONICAL_HOST}/atlas/roles/<id>.json`,
        `GET ${CANONICAL_HOST}/atlas/roles/<id> (Accept: application/ld+json)`,
      ],
      outputModes: ['text/html', 'application/ld+json'],
    }),
    fetchSkill({
      id: 'fetch-atlas-overview',
      name: 'Fetch the Atlas overview document',
      description:
        'Fetch https://shipstacked.com/atlas → returns text/html with embedded schema.org/Article + shipstacked:AtlasArticle and a DefinedTermSet linking to every per-role DefinedTerm. ' +
        'Plain HTTP GET; no A2A invocation.',
      tags: ['schema.org', 'Article', 'DefinedTermSet', 'shipstacked:AtlasArticle', 'http-get'],
      examples: [`GET ${CANONICAL_HOST}/atlas`],
      outputModes: ['text/html'],
    }),
    fetchSkill({
      id: 'fetch-proof-receipt',
      name: 'Fetch a public proof receipt by slug',
      description:
        'Fetch https://shipstacked.com/p/<slug> → returns text/html with embedded schema.org/CreativeWork + shipstacked:ProofReceipt. ' +
        'Append .json or send Accept: application/ld+json to receive the pure JSON-LD body. ' +
        'Each receipt carries Atlas role classification and verification-ladder state. ' +
        'Plain HTTP GET with content negotiation; no A2A invocation.',
      tags: ['schema.org', 'CreativeWork', 'shipstacked:ProofReceipt', 'verification', 'http-get'],
      examples: [
        `GET ${CANONICAL_HOST}/p/<slug>`,
        `GET ${CANONICAL_HOST}/p/<slug>.json`,
      ],
      outputModes: ['text/html', 'application/ld+json'],
    }),
    fetchSkill({
      id: 'fetch-consented-collection',
      name: 'Fetch a named consented collection (generic route family)',
      description:
        'Fetch https://shipstacked.com/collections/<slug> → returns text/html, .json (application/ld+json: schema.org/ItemList + shipstacked:BuilderCollection of Person items), or .csv (text/csv) per suffix or Accept header. ' +
        'Only builders who explicitly opted in are included. Unknown or inactive slugs return 404 by design (active-collection gate). ' +
        'This card declares the route FAMILY generically — it does not name any specific collection slug. ' +
        'Plain HTTP GET with content negotiation; no A2A invocation.',
      tags: ['schema.org', 'ItemList', 'shipstacked:BuilderCollection', 'consent', 'http-get'],
      examples: [
        `GET ${CANONICAL_HOST}/collections/<slug>`,
        `GET ${CANONICAL_HOST}/collections/<slug>.json`,
        `GET ${CANONICAL_HOST}/collections/<slug>.csv`,
      ],
      outputModes: ['text/html', 'application/ld+json', 'text/csv'],
    }),
    fetchSkill({
      id: 'fetch-llms-index',
      name: 'Fetch the LLM-discoverable plain-text index',
      description:
        'Fetch https://shipstacked.com/llms.txt → returns text/plain. ' +
        'A flat index of Atlas roles and recent public proof receipts, formatted per the llms.txt convention. ' +
        'Plain HTTP GET; no A2A invocation.',
      tags: ['llms.txt', 'discovery', 'http-get'],
      examples: [`GET ${CANONICAL_HOST}/llms.txt`],
      outputModes: ['text/plain'],
    }),
    fetchSkill({
      id: 'fetch-sitemap',
      name: 'Fetch the public sitemap',
      description:
        'Fetch https://shipstacked.com/sitemap.xml → returns application/xml. ' +
        'XML sitemap of public pages (homepage, published builder profiles, active job listings, public employer pages, build-feed posts). ' +
        'Plain HTTP GET; no A2A invocation.',
      tags: ['sitemap', 'discovery', 'http-get'],
      examples: [`GET ${CANONICAL_HOST}/sitemap.xml`],
      outputModes: ['application/xml'],
    }),
  ]

  return {
    protocolVersion: A2A_PROTOCOL_VERSION,
    name: 'ShipStacked',
    description: DESCRIPTION,
    url: `${CANONICAL_HOST}/`,
    version: CARD_VERSION,
    documentationUrl: `${CANONICAL_HOST}/api-docs`,
    provider: {
      organization: 'ShipStacked',
      url: `${CANONICAL_HOST}/`,
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
      extensions: [],
    },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: [
      'text/html',
      'application/ld+json',
      'application/json',
      'text/csv',
      'text/plain',
      'application/xml',
    ],
    skills,
    metadata: {
      // Unmissable extension flag — agents that read shipstacked: extensions
      // get the explicit non-interactivity signal.
      'shipstacked:cardKind': 'data-publisher',
      'shipstacked:interactiveAgent': false,
      'shipstacked:respondsToA2AMessages': false,
      'shipstacked:namespace': SHIPSTACKED_NS,
      'shipstacked:graphNote':
        'All public surfaces share one @id graph keyed by canonical URLs. ' +
        'A builder Person @id at /u/<username> is the same @id used in receipt author refs at /p/<slug> ' +
        'and in collection ItemList items at /collections/<slug>. One URL keys both per-page and aggregated data.',
      'shipstacked:beacons': {
        schemaOrg:            { status: 'live',     since: '2026-05-16' },
        consentedCollections: { status: 'live',     since: '2026-05-16', note: 'Capability is live; specific collections are operational and created out-of-band.' },
        agentCard:            { status: 'live',     since: '2026-05-16' },
        agentsMd:             { status: 'deferred', note: 'Beacon 3 — not yet shipped.' },
        atlasPackage:         { status: 'deferred', note: 'Beacon 4 — not yet shipped.' },
        mcpServer:            { status: 'deferred', note: 'Beacon 5 — not yet shipped.' },
      },
    },
  }
}
