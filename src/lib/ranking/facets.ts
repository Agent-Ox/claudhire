// Single source of truth for /talent facet vocabulary (Batch 8).
//
// Atlas cluster labels + the "Shipped" event-type grouping live ONLY here.
// get-ranked-builders (derivation), /talent/page.tsx (filtering + counts), and
// TalentClient.tsx (chip labels + card badges) all import from this module.
// Do NOT hardcode a cluster label or bucket label string in a consumer file —
// route it through here. This is the platform's positioning vocabulary.

// Atlas cluster letter -> hirer-facing label.
// A is "AI Integration" (its dominant role A1 "AI Integration Operator"), NOT
// "Workforce": "Workforce" matches 32/32 receipt-having builders (a no-op
// filter) and collides with the Atlas prompt's "Part I — The Workforce
// (Clusters A–E)" framing.
export const CLUSTER_LABELS: Record<string, string> = {
  A: 'AI Integration',
  B: 'Operations',
  C: 'Compliance',
  D: 'Design',
  E: 'Enablement',
  F: 'Operators',
  G: 'Practitioners',
}

// Render order for cluster chips (roughly by current population; chips only
// render when ≥1 builder carries them — see page.tsx).
export const CLUSTER_ORDER = ['A', 'F', 'D', 'B', 'G', 'E', 'C'] as const

/** Atlas role id (e.g. "A1", "F3") -> cluster letter, or null if unrecognized. */
export function clusterOf(roleId: string | null | undefined): string | null {
  const c = roleId?.[0]?.toUpperCase()
  return c && CLUSTER_LABELS[c] ? c : null
}

export interface ShippedBucket {
  key: string        // URL param value + builder facet key
  label: string      // chip label
  eventTypes: string[]
}

// "Shipped" facet buckets. `deployed_mcp_server` folds into Agents (agent
// infrastructure). Order = chip render order. "Other" renders only when ≥1
// builder qualifies (handled in page.tsx).
export const SHIPPED_BUCKETS: ShippedBucket[] = [
  { key: 'shipped_agent', label: 'Agents', eventTypes: ['shipped_agent', 'deployed_mcp_server'] },
  { key: 'shipped_app', label: 'Apps', eventTypes: ['shipped_app'] },
  { key: 'shipped_site', label: 'Sites', eventTypes: ['shipped_site'] },
  { key: 'published_repo', label: 'Repos', eventTypes: ['published_repo'] },
  { key: 'other', label: 'Other', eventTypes: ['shipped_workflow', 'shipped_integration', 'completed_eval', 'delivered_engagement', 'resolved_incident'] },
]

export const SHIPPED_LABEL: Record<string, string> =
  Object.fromEntries(SHIPPED_BUCKETS.map(b => [b.key, b.label]))

const EVENT_TO_BUCKET: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const b of SHIPPED_BUCKETS) for (const et of b.eventTypes) m[et] = b.key
  return m
})()

/** Distinct shipped-bucket keys a builder qualifies for, from their event types. */
export function bucketsForEvents(eventTypes: string[]): string[] {
  const out = new Set<string>()
  for (const et of eventTypes) out.add(EVENT_TO_BUCKET[et] ?? 'other')
  return [...out]
}
