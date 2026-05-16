/**
 * WebSite markup for the homepage.
 *
 * NO SearchAction — `/talent` has filter params (?profession=, ?sort=)
 * but NO free-text `?q=` search. Emitting SearchAction with a
 * {search_term_string} urlTemplate would be a structured-data lie
 * (claims a search API the site doesn't expose). Truthfulness rule
 * inherited from Tier 0 applies to structured data too.
 *
 * Spec: BEACON_1_DISCOVERY.md §H3, §E
 */

import { CANONICAL_HOST, SCHEMA_CONTEXT, orgId, websiteId } from './context.ts'

export interface WebsiteJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': 'WebSite'
  '@id': string
  url: string
  name: string
  publisher: { '@id': string }
  inLanguage: string
}

export function buildWebsiteJsonLd(): WebsiteJsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    '@id': websiteId(),
    url: CANONICAL_HOST,
    name: 'ShipStacked',
    publisher: { '@id': orgId() },
    inLanguage: 'en',
  }
}
