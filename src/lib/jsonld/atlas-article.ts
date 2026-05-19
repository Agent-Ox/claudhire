/**
 * Article markup for /atlas (the long-form practitioner-defined map).
 *
 * Reconciles the inline buildJsonLd at src/app/atlas/page.tsx to the
 * dual-context. Keeps the same Article shape (this is genuinely an
 * Article — author, dates, word count). Optionally callers can also
 * emit a DefinedTermSet referencing the per-role DefinedTerms
 * at /atlas/roles/[id] (those use src/lib/atlas/jsonld.ts and are
 * UNTOUCHED).
 *
 * Spec: BEACON_1_DISCOVERY.md §H10
 */

import { CANONICAL_HOST, SCHEMA_CONTEXT, orgId } from './context.ts'

const ATLAS_URL = `${CANONICAL_HOST}/atlas`
const PUBLISHED = '2026-05-13T00:00:00.000Z'

export interface AtlasArticleJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': ['Article', 'shipstacked:AtlasArticle']
  '@id': string
  headline: string
  alternativeHeadline: string
  author: {
    '@type': 'Person'
    name: string
    description: string
  }
  publisher: { '@id': string }
  datePublished: string
  dateModified: string
  url: string
  mainEntityOfPage: { '@type': 'WebPage'; '@id': string }
  wordCount: number
  inLanguage: string
}

export function buildAtlasArticleJsonLd(wordCount: number): AtlasArticleJsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': ['Article', 'shipstacked:AtlasArticle'],
    '@id': ATLAS_URL,
    headline: 'The Atlas — AI implementation roles, mapped',
    alternativeHeadline:
      "v0.5 — A practitioner's map of the labor market that didn't have a name yesterday",
    author: {
      '@type': 'Person',
      name: 'Thomas Oxlee',
      description:
        'Founder of ShipStacked, the marketplace where AI builders, teams, and agents get hired on proven, verified work. Embedded as an AI implementation lead at a regulated EU business.',
    },
    publisher: { '@id': orgId() },
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    url: ATLAS_URL,
    mainEntityOfPage: { '@type': 'WebPage', '@id': ATLAS_URL },
    wordCount,
    inLanguage: 'en',
  }
}

export interface AtlasDefinedTermSetJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': ['DefinedTermSet', 'shipstacked:AtlasDefinedTermSet']
  '@id': string
  name: string
  description: string
  'shipstacked:atlasVersion': string
  hasDefinedTerm: Array<{ '@id': string }>
}

/**
 * Top-level DefinedTermSet that references every per-role DefinedTerm.
 * Emit on /atlas alongside the Article; each DefinedTerm itself is
 * served at /atlas/roles/[id] (V2 pattern — untouched).
 */
export function buildAtlasDefinedTermSetJsonLd(
  atlasVersion: string,
  roleIds: string[],
): AtlasDefinedTermSetJsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': ['DefinedTermSet', 'shipstacked:AtlasDefinedTermSet'],
    '@id': `${ATLAS_URL}?v=${atlasVersion}`,
    name: 'The Atlas — AI implementation roles, mapped',
    description: 'A practitioner-defined map of the roles, operators, and teams doing real AI implementation work.',
    'shipstacked:atlasVersion': atlasVersion,
    hasDefinedTerm: roleIds.map(id => ({
      '@id': `${CANONICAL_HOST}/atlas/roles/${id}?v=${atlasVersion}`,
    })),
  }
}
