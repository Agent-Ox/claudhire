import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import TalentClient from './TalentClient'
import { buildItemListJsonLd } from '@/lib/jsonld/item-list'
import { CANONICAL_HOST, personId } from '@/lib/jsonld/context'
import { getRankedBuilders } from '@/lib/ranking/get-ranked-builders'

export const metadata: Metadata = {
  title: 'AI-Native Builder Directory | ShipStacked',
  description: 'Browse verified AI-native builders. Vibe coders, prompt engineers, AI automation specialists — all with proven build histories and real outcomes.',
  openGraph: {
    title: 'AI-Native Builder Directory | ShipStacked',
    description: 'Find and hire verified AI-native builders with real proof of work.',
    url: 'https://shipstacked.com/talent',
  },
  alternates: { canonical: 'https://shipstacked.com/talent' },
}

export default async function TalentPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams
  const filterProfession = params.profession || ''
  const filterAvailability = params.availability || ''
  const filterVerified = params.verified === 'true'
  const filterSort = params.sort || 'quality'

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check paid hirer subscription
  let isPaidHirer = false
  if (user) {
    const now = new Date().toISOString()
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('email', user.email)
      .eq('status', 'active')
      .eq('product', 'full_access')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle()
    isPaidHirer = !!sub
  }

  // Quality-ranked builders (Formula E) — replaces the frozen velocity sort.
  // Ranked first (quality_score DESC), then "not yet ranked" builders below.
  const { ranked, belowThreshold } = await getRankedBuilders()
  const allBuilders = [...ranked, ...belowThreshold] as any[]
  const totalPublished = allBuilders.length

  // Filters applied in JS (small dataset; keeps one ranking source of truth).
  // `verified` is a filter + badge only — no longer a sort key (D3).
  let profiles = allBuilders
  if (filterVerified) profiles = profiles.filter((p: any) => p.verified)
  if (filterProfession) profiles = profiles.filter((p: any) => p.primary_profession === filterProfession)
  if (filterAvailability) profiles = profiles.filter((p: any) => p.availability === filterAvailability)

  // Default sort is the quality order from getRankedBuilders; "newest" overrides.
  if (filterSort === 'newest') {
    profiles = [...profiles].sort((a: any, b: any) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }
  const verifiedCount = profiles.filter((p: any) => p.verified).length
  const displayProfiles = isPaidHirer ? profiles : profiles.slice(0, 6)
  const isTeaser = !isPaidHirer

  // Total unfiltered count for the header (only when filters are active)
  const hasFilters = !!(filterProfession || filterAvailability || filterVerified)
  const totalUnfilteredCount = hasFilters ? totalPublished : profiles.length

  // Fetch hirer profile to check if they have set up their company
  let hasHirerProfile = false
  if (isPaidHirer && user) {
    const { data: hirerProfile } = await admin
      .from('employer_profiles')
      .select('id, company_name')
      .eq('email', user.email)
      .maybeSingle()
    hasHirerProfile = !!(hirerProfile?.company_name)
  }

  // Fetch saved profile IDs for this hirer
  let savedIds: string[] = []
  if (isPaidHirer && user) {
    const { data: saved } = await admin
      .from('saved_profiles')
      .select('profile_id')
      .eq('employer_email', user.email)
    savedIds = saved?.map((s: any) => s.profile_id) || []
  }

  // Beacon 1 — paywall-aware ItemList. JSON-LD reflects the 6-builder
  // teaser slice that's HTML-visible to anonymous viewers, NOT the full
  // unpaywalled list (emitting the full list to crawlers would expose
  // data behind a paywall). Query above already filters published=true so
  // the 3 fakes are excluded at source.
  const teaserSlice = profiles.slice(0, 6)
  const talentItemListLd = buildItemListJsonLd({
    listUrl: `${CANONICAL_HOST}/talent`,
    listName: 'AI-native builders on ShipStacked',
    items: teaserSlice.map((p: any) => ({
      url: personId(p.username),
      id: personId(p.username),
      name: p.full_name?.trim() || p.username,
    })),
  })

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', overflowX: 'hidden' }}>
      {talentItemListLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(talentItemListLd) }} />
      )}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '4rem 1.5rem 5rem' }}>
        <TalentClient
          profiles={displayProfiles}
          savedIds={savedIds}
          isPaidHirer={isPaidHirer}
          isTeaser={isTeaser}
          verifiedCount={verifiedCount}
          totalCount={profiles.length}
          totalUnfilteredCount={totalUnfilteredCount}
          user={user}
          hasHirerProfile={hasHirerProfile}
          filters={{ profession: filterProfession, availability: filterAvailability, verified: filterVerified, sort: filterSort }}
        />
      </div>
    </div>
  )
}
