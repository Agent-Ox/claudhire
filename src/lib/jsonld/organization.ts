/**
 * Site-wide Organization markup (rendered in src/app/layout.tsx).
 *
 * Reconciles the inline Organization that already existed there to the
 * V2 dual-context pattern. Adds @id = "<host>/#org" so other emitters
 * can reference the ShipStacked org without re-emitting its fields.
 *
 * Spec: BEACON_1_DISCOVERY.md §H2, §E
 */

import { CANONICAL_HOST, SCHEMA_CONTEXT, orgId } from './context.ts'

export interface OrganizationJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': ['Organization', 'shipstacked:Organization']
  '@id': string
  name: string
  alternateName?: string
  url: string
  logo: string
  description: string
  foundingDate?: string
  founder?: { '@type': 'Person'; name: string }
  sameAs?: string[]
}

export function buildOrganizationJsonLd(): OrganizationJsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': ['Organization', 'shipstacked:Organization'],
    '@id': orgId(),
    name: 'ShipStacked',
    alternateName: 'ShipStacked.',
    url: CANONICAL_HOST,
    logo: `${CANONICAL_HOST}/icon.svg`,
    description: 'Proof-of-work hiring platform for AI-native builders. Find verified developers, prompt engineers, and AI automation specialists.',
    foundingDate: '2026-04',
    founder: { '@type': 'Person', name: 'Thomas Oxlee' },
    sameAs: [
      'https://x.com/ShipStacked',
      'https://www.linkedin.com/company/shipstacked',
    ],
  }
}
