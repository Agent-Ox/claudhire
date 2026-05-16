/**
 * Collection JSON-LD projection.
 *
 * Wraps Beacon 1's buildPersonJsonLd output (UNTOUCHED — reused
 * byte-unchanged) inside a schema.org/ItemList. The collection metadata
 * (title, description) comes from the CollectionRow passed in — NOT
 * from any code constant. Slugs are data.
 */

import { SCHEMA_CONTEXT } from '../jsonld/context.ts'
import { buildPersonJsonLd } from '../jsonld/person.ts'
import { collectionUrl, type CollectionRow } from './context.ts'
import type { ConsentedCollection } from './assemble.ts'

export interface CollectionJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': ['ItemList', 'shipstacked:BuilderCollection']
  '@id': string
  name: string
  description?: string
  numberOfItems: number
  dateModified: string
  'shipstacked:collectionSlug': string
  'shipstacked:consentModel': 'explicit-per-builder-opt-in'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    item: ReturnType<typeof buildPersonJsonLd>
  }>
}

export function buildCollectionJsonLd(
  collection: CollectionRow,
  data: ConsentedCollection,
): CollectionJsonLd {
  const itemListElement = data.builders.map((b, idx) => ({
    '@type': 'ListItem' as const,
    position: idx + 1,
    item: buildPersonJsonLd(b.profile, b.entity, b.skills, b.projects, b.github),
  }))

  const out: CollectionJsonLd = {
    '@context': SCHEMA_CONTEXT,
    '@type': ['ItemList', 'shipstacked:BuilderCollection'],
    '@id': collectionUrl(collection.slug),
    name: collection.title,
    numberOfItems: data.builders.length,
    dateModified: data.most_recent_change ?? collection.created_at,
    'shipstacked:collectionSlug': collection.slug,
    'shipstacked:consentModel': 'explicit-per-builder-opt-in',
    itemListElement,
  }
  if (collection.description && collection.description.trim().length > 0) {
    out.description = collection.description.trim()
  }
  return out
}
