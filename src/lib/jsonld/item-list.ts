/**
 * Generic ItemList wrapper for collection pages.
 *
 * Each item is a {@type: ListItem, position, url, @id?} record that
 * references a canonical resource by URL rather than re-emitting the
 * full record. Consumers traverse to the @id for the full markup.
 *
 * Empty-suppressed: callers should NOT render the JSON-LD <script> at
 * all when items is empty (per Spec §F — no noise). This builder
 * returns null for empty arrays as a defence-in-depth signal.
 *
 * Spec: BEACON_1_DISCOVERY.md §H6
 */

import { CANONICAL_HOST, SCHEMA_CONTEXT } from './context.ts'

export interface ListItem {
  /** The canonical URL of the resource this ListItem points at. Required. */
  url: string
  /** Optional friendly name surfaced to consumers. */
  name?: string
  /** Optional resource @id (often equals url; required for cross-graph joins). */
  id?: string
}

export interface ItemListJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': 'ItemList'
  '@id': string
  name: string
  numberOfItems: number
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    url: string
    name?: string
    item?: { '@id': string }
  }>
}

export interface ItemListInput {
  /** Canonical URL of the collection page (e.g. https://shipstacked.com/leaderboard). */
  listUrl: string
  /** Human-readable name of the list (e.g. "Top builders by Velocity Score"). */
  listName: string
  /** Items in order. Returns null when empty (caller should skip the <script>). */
  items: ListItem[]
}

export function buildItemListJsonLd(input: ItemListInput): ItemListJsonLd | null {
  if (!input.items || input.items.length === 0) return null

  const itemListElement = input.items.map((item, idx) => {
    const el: ItemListJsonLd['itemListElement'][number] = {
      '@type': 'ListItem',
      position: idx + 1,
      url: item.url,
    }
    if (item.name) el.name = item.name
    if (item.id) el.item = { '@id': item.id }
    return el
  })

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'ItemList',
    '@id': input.listUrl,
    name: input.listName,
    numberOfItems: input.items.length,
    itemListElement,
  }
}

export { CANONICAL_HOST }
