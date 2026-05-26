/**
 * Assembly layer — the single function that loads the consented set
 * for a collection and shapes it for the per-builder Person markup.
 *
 * The ONE-SOURCE INVARIANT lives here: JSON-LD, CSV, and HTML
 * projections all derive their builder set from getConsentedCollection.
 * Opt-out propagates to all three because there's only one query.
 *
 * Implementation note: rather than N+1 (one query per builder for
 * profile/skills/projects/github), we bulk-load each related table by
 * the consented profile_id set. Trades a few extra queries for
 * predictable latency at any cohort size.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type PersonProfileInput,
  type PersonEntityInput,
  type PersonSkillInput,
  type PersonProjectInput,
  type PersonGithubInput,
} from '../jsonld/person.ts'

export interface ConsentedBuilder {
  // Inputs shaped exactly for buildPersonJsonLd (Beacon 1, reused unchanged).
  profile: PersonProfileInput
  entity: PersonEntityInput | null
  skills: PersonSkillInput[]
  projects: PersonProjectInput[]
  github: PersonGithubInput | null
  // Membership metadata (used by CSV "opted_in_at" column + HTML "joined" line).
  membership: { opted_in_at: string; source: 'dashboard' | 'link' }
}

export interface ConsentedCollection {
  slug: string
  builders: ConsentedBuilder[]
  /** Max opted_in_at across all active memberships — drives ETag + dateModified. */
  most_recent_change: string | null
}

/**
 * Load every consented + published builder for a given slug, shaped
 * for Person markup. Slug is a parameter; the function neither knows
 * nor needs to know what the collection is for.
 *
 * Filter chain (the four gates from §F revised):
 *   1. collections.active = true            (callers should requireActiveCollection
 *                                              first; this query trusts that gate
 *                                              passed)
 *   2. profiles.published = true            (the universal post-Tier-1 gate)
 *   3. memberships.opted_out_at IS NULL     (active consent only)
 *   4. fake-exclusion is implicit via #2    (3 fakes are published=false)
 */
export async function getConsentedCollection(
  db: SupabaseClient,
  slug: string,
): Promise<ConsentedCollection> {
  // Bulk-load active memberships for this slug, joined with profile
  // basics for the published filter.
  const { data: memberships, error: mErr } = await db
    .from('collection_memberships')
    .select('profile_id, opted_in_at, source, profiles!inner(id, published)')
    .eq('collection_slug', slug)
    .is('opted_out_at', null)
    .eq('profiles.published', true)
    .order('opted_in_at', { ascending: true })
  if (mErr) throw new Error(`assemble.getConsentedCollection memberships: ${mErr.message}`)

  const list = (memberships as Array<{
    profile_id: string
    opted_in_at: string
    source: 'dashboard' | 'link'
  }> | null) ?? []

  if (list.length === 0) {
    return { slug, builders: [], most_recent_change: null }
  }

  const ids = list.map(m => m.profile_id)
  const optedInAtByProfile = new Map(list.map(m => [m.profile_id, m]))

  // Bulk-load each related table.
  const [profilesRes, entitiesRes, skillsRes, projectsRes, githubRes] = await Promise.all([
    db.from('profiles')
      .select(
        'id, user_id, username, full_name, role, bio, about, location, ' +
        'github_url, x_url, linkedin_url, website_url, verified, ' +
        'primary_profession, seniority, work_type, day_rate, timezone, languages, entity_id, published',
      )
      .in('id', ids),
    db.from('entities')
      .select('id, external_id, profile_id')
      .in('profile_id', ids),
    db.from('skills').select('profile_id, name').in('profile_id', ids),
    db.from('projects').select('profile_id, title, description, outcome, project_url').in('profile_id', ids),
    db.from('github_data')
      .select('profile_id, github_username, repos_count, commits_90d, top_languages')
      .in('profile_id', ids),
  ])

  for (const r of [profilesRes, entitiesRes, skillsRes, projectsRes, githubRes]) {
    if (r.error) throw new Error(`assemble.getConsentedCollection bulk-load: ${r.error.message}`)
  }

  interface ProfileShape {
    id: string
    username: string
    full_name: string | null
    role: string | null
    bio: string | null
    about: string | null
    location: string | null
    github_url: string | null
    x_url: string | null
    linkedin_url: string | null
    website_url: string | null
    verified: boolean
    primary_profession: string | null
    seniority: string | null
    work_type: string | null
    day_rate: string | null
    timezone: string | null
    languages: string[] | null
    entity_id: number | null
    published: boolean
  }
  const profilesRows = (profilesRes.data ?? []) as unknown as ProfileShape[]
  const profilesById = new Map<string, ProfileShape>(
    profilesRows.map(p => [p.id, p]),
  )
  const entitiesRows = (entitiesRes.data ?? []) as Array<{ id: number; external_id: string; profile_id: string }>
  const entitiesByProfile = new Map<string, { id: number; external_id: string; profile_id: string }>(
    entitiesRows.map(e => [e.profile_id, e]),
  )
  const skillsByProfile = new Map<string, PersonSkillInput[]>()
  for (const s of (skillsRes.data ?? []) as Array<{ profile_id: string; name: string }>) {
    if (!skillsByProfile.has(s.profile_id)) skillsByProfile.set(s.profile_id, [])
    skillsByProfile.get(s.profile_id)!.push({ name: s.name })
  }
  const projectsByProfile = new Map<string, PersonProjectInput[]>()
  for (const p of (projectsRes.data ?? []) as Array<{
    profile_id: string
    title: string | null
    description: string | null
    outcome: string | null
    project_url: string | null
  }>) {
    if (!projectsByProfile.has(p.profile_id)) projectsByProfile.set(p.profile_id, [])
    projectsByProfile.get(p.profile_id)!.push({
      title: p.title,
      description: p.description,
      outcome: p.outcome,
      project_url: p.project_url,
    })
  }
  const githubByProfile = new Map<string, PersonGithubInput>(
    ((githubRes.data ?? []) as Array<{
      profile_id: string
      github_username: string | null
      repos_count: number | null
      commits_90d: number | null
      top_languages: string[] | null
    }>).map(g => [g.profile_id, {
      github_username: g.github_username,
      repos_count: g.repos_count,
      commits_90d: g.commits_90d,
      top_languages: g.top_languages,
    }]),
  )

  const builders: ConsentedBuilder[] = []
  let mostRecent: string | null = null

  for (const id of ids) {
    const p = profilesById.get(id)
    if (!p || !p.published) continue // belt-and-braces — the SQL already filtered
    const m = optedInAtByProfile.get(id)!
    if (!mostRecent || m.opted_in_at > mostRecent) mostRecent = m.opted_in_at

    const e = entitiesByProfile.get(id)
    builders.push({
      profile: {
        username: p.username,
        full_name: p.full_name ?? null,
        role: p.role ?? null,
        bio: p.bio ?? null,
        about: p.about ?? null,
        location: p.location ?? null,
        github_url: p.github_url ?? null,
        x_url: p.x_url ?? null,
        linkedin_url: p.linkedin_url ?? null,
        website_url: p.website_url ?? null,
        verified: !!p.verified,
        primary_profession: p.primary_profession ?? null,
        seniority: p.seniority ?? null,
        work_type: p.work_type ?? null,
        day_rate: p.day_rate ?? null,
        timezone: p.timezone ?? null,
        languages: p.languages ?? null,
        entity_id: p.entity_id ?? null,
      },
      entity: e?.external_id ? { external_id: e.external_id } : null,
      skills: skillsByProfile.get(id) ?? [],
      projects: projectsByProfile.get(id) ?? [],
      github: githubByProfile.get(id) ?? null,
      membership: { opted_in_at: m.opted_in_at, source: m.source },
    })
  }

  return { slug, builders, most_recent_change: mostRecent }
}
