/**
 * Atlas role → JSON-LD (DefinedTerm + shipstacked:AtlasRole).
 *
 * Spec: docs/v2/STEP_7_PUBLIC_PAGES_SPEC.md §6.
 */

import type { AtlasRoleRow, RecentReceiptAtRole } from './roles.ts'

const CANONICAL_HOST = 'https://shipstacked.com'

export interface AtlasRoleJsonLd {
  '@context': [
    'https://schema.org',
    { shipstacked: 'https://shipstacked.com/schema/v0.1#' },
  ]
  '@type': ['DefinedTerm', 'shipstacked:AtlasRole']
  '@id': string
  identifier: string
  name: string
  description: string
  inDefinedTermSet: string
  'shipstacked:cluster': string
  'shipstacked:automationTrajectory': string | null
  'shipstacked:atlasVersion': string
  'shipstacked:crosswalks': {
    isco_08: string | null
    soc_2018: string | null
    onet: string | null
    status: string | null
  }
  'shipstacked:euAiActArticles': string[] | null
  'shipstacked:iso42001Sections': string[] | null
  'shipstacked:recentReceipts': string[]
}

export function atlasRoleCanonicalUrl(roleId: string, version: string): string {
  return `${CANONICAL_HOST}/atlas/roles/${roleId}?v=${version}`
}

export function atlasRoleJsonLd(
  row: AtlasRoleRow,
  recent: RecentReceiptAtRole[],
): AtlasRoleJsonLd {
  return {
    '@context': [
      'https://schema.org',
      { shipstacked: 'https://shipstacked.com/schema/v0.1#' },
    ],
    '@type': ['DefinedTerm', 'shipstacked:AtlasRole'],
    '@id': atlasRoleCanonicalUrl(row.role_id, row.atlas_version),
    identifier: row.role_id,
    name: row.name,
    description: row.short_description,
    inDefinedTermSet: `${CANONICAL_HOST}/atlas?v=${row.atlas_version}`,
    'shipstacked:cluster': row.cluster,
    'shipstacked:automationTrajectory': row.automation_trajectory,
    'shipstacked:atlasVersion': row.atlas_version,
    'shipstacked:crosswalks': {
      isco_08: row.isco_08_code,
      soc_2018: row.soc_2018_code,
      onet: row.onet_code,
      status: row.crosswalk_status,
    },
    'shipstacked:euAiActArticles': row.eu_ai_act_articles,
    'shipstacked:iso42001Sections': row.iso_42001_sections,
    'shipstacked:recentReceipts': recent.map((r) => `${CANONICAL_HOST}/p/${r.slug}`),
  }
}
