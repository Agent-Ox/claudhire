/**
 * Schema.org JSON-LD helper for Atlas roles.
 *
 * Produces the exact `application/ld+json` shape the live
 * `https://shipstacked.com/atlas/roles/<id>.json` endpoints return
 * (a DefinedTerm + shipstacked:AtlasRole). The package-build verify
 * step (scripts/verify.ts) curls the live endpoint for every role
 * and asserts byte/structural equivalence with the output of this
 * helper applied to the package's role data — that is the load-bearing
 * one-source proof per BEACON_4_DISCOVERY.md §C.3 Layer 2.
 */

import type { AtlasRoleData, AtlasVersion } from './types.js';

const CANONICAL_HOST = 'https://shipstacked.com';

export interface AtlasRoleJsonLd {
  '@context': [
    'https://schema.org',
    { shipstacked: 'https://shipstacked.com/schema/v0.1#' },
  ];
  '@type': ['DefinedTerm', 'shipstacked:AtlasRole'];
  '@id': string;
  identifier: string;
  name: string;
  description: string;
  inDefinedTermSet: string;
  'shipstacked:cluster': string;
  'shipstacked:automationTrajectory': string | null;
  'shipstacked:atlasVersion': string;
  'shipstacked:crosswalks': {
    isco_08: string | null;
    soc_2018: string | null;
    onet: string | null;
    status: string | null;
  };
  'shipstacked:euAiActArticles': string[] | null;
  'shipstacked:iso42001Sections': string[] | null;
  'shipstacked:recentReceipts': string[];
}

export function atlasRoleCanonicalUrl(roleId: string, version: AtlasVersion): string {
  return `${CANONICAL_HOST}/atlas/roles/${roleId}?v=${version}`;
}

export function atlasDefinedTermSetUrl(version: AtlasVersion): string {
  return `${CANONICAL_HOST}/atlas?v=${version}`;
}

/**
 * Build the JSON-LD representation of a role. `recentReceipts` is the
 * list of canonical receipt URLs the live endpoint includes; the package
 * does NOT know about receipts (those are runtime data, not taxonomy),
 * so this defaults to an empty array. The verify step accounts for this
 * by stripping `shipstacked:recentReceipts` from the structural compare
 * (it is provably non-taxonomy data; the package is a taxonomy package).
 */
export function atlasRoleJsonLd(
  role: AtlasRoleData,
  recentReceipts: string[] = [],
): AtlasRoleJsonLd {
  return {
    '@context': [
      'https://schema.org',
      { shipstacked: 'https://shipstacked.com/schema/v0.1#' },
    ],
    '@type': ['DefinedTerm', 'shipstacked:AtlasRole'],
    '@id': atlasRoleCanonicalUrl(role.role_id, role.atlas_version),
    identifier: role.role_id,
    name: role.name,
    description: role.short_description,
    inDefinedTermSet: atlasDefinedTermSetUrl(role.atlas_version),
    'shipstacked:cluster': role.cluster,
    'shipstacked:automationTrajectory': role.automation_trajectory,
    'shipstacked:atlasVersion': role.atlas_version,
    'shipstacked:crosswalks': {
      isco_08: role.isco_08_code,
      soc_2018: role.soc_2018_code,
      onet: role.onet_code,
      status: role.crosswalk_status,
    },
    'shipstacked:euAiActArticles': role.eu_ai_act_articles,
    'shipstacked:iso42001Sections': role.iso_42001_sections,
    'shipstacked:recentReceipts': recentReceipts,
  };
}
