/**
 * Collection CSV projection — RFC 4180.
 *
 * Derived from the same ConsentedCollection that drives the JSON-LD
 * projection. The one-source invariant: opt-out propagates here because
 * the underlying builder list is the same.
 *
 * Columns chosen for realistic ingest-tool minimums; documented inline.
 */

import { personId } from '../jsonld/context.ts'
import type { ConsentedCollection } from './assemble.ts'

/** RFC 4180 quoting: wrap in double-quotes when needed; double internal quotes. */
function csvQuote(value: string): string {
  if (value === null || value === undefined) return ''
  const needsQuote = /[",\r\n]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

const COLUMNS = [
  'username',
  'profile_url',
  'full_name',
  'role',
  'location',
  'skills',
  'github_username',
  'verified',
  'entity_identifier',
  'opted_in_at',
] as const

export function buildCollectionCsv(data: ConsentedCollection): string {
  const lines: string[] = []
  lines.push(COLUMNS.join(','))

  for (const b of data.builders) {
    const skills = b.skills
      .map(s => (s.name ?? '').trim())
      .filter(s => s.length > 0)
      .join('|')

    const cells: string[] = [
      b.profile.username,
      personId(b.profile.username),
      (b.profile.full_name ?? '').trim(),
      (b.profile.role ?? '').trim(),
      (b.profile.location ?? '').trim(),
      skills,
      b.github?.github_username ?? '',
      b.profile.verified ? 'true' : 'false',
      b.entity?.external_id ?? '',
      b.membership.opted_in_at,
    ].map(v => csvQuote(String(v ?? '')))

    lines.push(cells.join(','))
  }

  // RFC 4180 CRLF line endings, trailing CRLF.
  return lines.join('\r\n') + '\r\n'
}
