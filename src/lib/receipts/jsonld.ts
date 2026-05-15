/**
 * ProofReceipt → JSON-LD shape (schema.org CreativeWork +
 * shipstacked:ProofReceipt). Matches the ProofReceiptJsonLd interface in
 * src/schemas/proof-receipt-v0.1.ts.
 *
 * Spec: docs/v2/STEP_7_PUBLIC_PAGES_SPEC.md §4.
 */

import type { ReceiptBundle, ReceiptRow, ReceiptSubject } from './render.ts'

const CANONICAL_HOST = 'https://shipstacked.com'

export interface ProofReceiptJsonLd {
  '@context': [
    'https://schema.org',
    { shipstacked: 'https://shipstacked.com/schema/v0.1#' },
  ]
  '@type': ['CreativeWork', 'shipstacked:ProofReceipt']
  '@id': string
  identifier: string
  name: string
  description: string
  dateCreated: string
  dateModified: string
  temporalCoverage: string
  author: {
    '@type': 'Person' | 'Organization'
    '@id': string
    name: string
  }
  'shipstacked:eventType': string
  'shipstacked:atlasRoles': Array<{
    '@id': string
    'shipstacked:roleId': string
    'shipstacked:source': 'claimed' | 'inferred' | 'confirmed'
  }>
  'shipstacked:verificationLevel': string
  'shipstacked:atlasVersion': string
  workExample: Array<{
    '@type': 'CreativeWork' | 'SoftwareSourceCode' | 'WebSite'
    url: string
    name?: string
  }>
}

function atlasRoleRef(roleId: string, version: string): string {
  return `${CANONICAL_HOST}/atlas/roles/${roleId}?v=${version}`
}

function artifactSchemaType(kind: string): 'SoftwareSourceCode' | 'WebSite' | 'CreativeWork' {
  if (kind === 'repo') return 'SoftwareSourceCode'
  if (kind === 'deployment' || kind === 'url') return 'WebSite'
  return 'CreativeWork'
}

function authorTypeForSubject(subject: ReceiptSubject): 'Person' | 'Organization' {
  // Entities are 'human' | 'operator' | 'fleet' | 'agent' in the schema.
  // For Phase 1A only 'human' is auto-created; future operators/fleets
  // are Organizations. Default to Person; the subject row doesn't carry
  // kind in the bundle's projection so we infer conservatively.
  return 'Person'
}

/**
 * Build the multi-source atlas role list. Each role can appear in
 * multiple buckets (claimed/inferred/confirmed); we emit one entry per
 * (roleId, source) pair. `confirmed` is the canonical signal; `claimed`
 * and `inferred` are emitted only when they differ.
 */
function buildAtlasRoles(receipt: ReceiptRow): ProofReceiptJsonLd['shipstacked:atlasRoles'] {
  const out: ProofReceiptJsonLd['shipstacked:atlasRoles'] = []
  const seen = new Set<string>()

  for (const id of receipt.atlas_confirmed) {
    const key = `${id}:confirmed`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      '@id': atlasRoleRef(id, receipt.atlas_version),
      'shipstacked:roleId': id,
      'shipstacked:source': 'confirmed',
    })
  }
  for (const id of receipt.atlas_inferred) {
    if (receipt.atlas_confirmed.includes(id)) continue
    const key = `${id}:inferred`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      '@id': atlasRoleRef(id, receipt.atlas_version),
      'shipstacked:roleId': id,
      'shipstacked:source': 'inferred',
    })
  }
  for (const id of receipt.atlas_claimed) {
    if (receipt.atlas_confirmed.includes(id) || receipt.atlas_inferred.includes(id)) continue
    const key = `${id}:claimed`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      '@id': atlasRoleRef(id, receipt.atlas_version),
      'shipstacked:roleId': id,
      'shipstacked:source': 'claimed',
    })
  }
  return out
}

export function receiptJsonLd(bundle: ReceiptBundle): ProofReceiptJsonLd {
  const { receipt, subject } = bundle
  const canonical = `${CANONICAL_HOST}/p/${receipt.slug}`
  const entityCanonical = `${CANONICAL_HOST}/u/${subject.slug}`

  return {
    '@context': [
      'https://schema.org',
      { shipstacked: 'https://shipstacked.com/schema/v0.1#' },
    ],
    '@type': ['CreativeWork', 'shipstacked:ProofReceipt'],
    '@id': canonical,
    identifier: receipt.external_id,
    name: receipt.title,
    description: receipt.description,
    dateCreated: receipt.issued_at,
    dateModified: receipt.updated_at,
    temporalCoverage: receipt.occurred_at,
    author: {
      '@type': authorTypeForSubject(subject),
      '@id': entityCanonical,
      name: subject.display_name,
    },
    'shipstacked:eventType': receipt.event_type,
    'shipstacked:atlasRoles': buildAtlasRoles(receipt),
    'shipstacked:verificationLevel': receipt.verification_level,
    'shipstacked:atlasVersion': receipt.atlas_version,
    workExample: receipt.artifacts.map((a) => ({
      '@type': artifactSchemaType(a.kind),
      url: a.url,
      ...(a.title ? { name: a.title } : {}),
    })),
  }
}
