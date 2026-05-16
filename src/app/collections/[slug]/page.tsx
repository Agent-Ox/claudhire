/**
 * /collections/[slug] — HTML projection of a collection.
 *
 * Renders the consented builder set as a clean list of profile cards.
 * Slug is a parameter; unknown / inactive collections 404. Honest
 * empty state when no builders have opted in yet.
 *
 * The page uses the same generic copy template the dashboard card uses
 * — no brand / partner / program names anywhere.
 */

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { requireActiveCollection } from '@/lib/collections/collections'
import { CollectionGateError, CANONICAL_HOST } from '@/lib/collections/context'
import { getConsentedCollection } from '@/lib/collections/assemble'

export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const admin = adminClient()
  try {
    const c = await requireActiveCollection(admin, slug)
    return {
      title: `${c.title} — ShipStacked`,
      description: c.description ?? 'A consented collection of ShipStacked builders.',
      alternates: { canonical: `${CANONICAL_HOST}/collections/${slug}` },
    }
  } catch {
    return { title: 'Collection not found' }
  }
}

export default async function CollectionPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = adminClient()

  let collection
  try {
    collection = await requireActiveCollection(admin, slug)
  } catch (e) {
    if (e instanceof CollectionGateError) notFound()
    throw e
  }

  const data = await getConsentedCollection(admin, slug)

  return (
    <main style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem 5rem' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
          CONSENTED COLLECTION
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem', lineHeight: 1.1 }}>
          {collection.title}
        </h1>
        {collection.description && (
          <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {collection.description}
          </p>
        )}
        <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '2.5rem' }}>
          {data.builders.length} {data.builders.length === 1 ? 'builder' : 'builders'} ·
          opt-in only, withdrawable anytime ·
          machine-readable: <a href={`/collections/${slug}.json`} style={{ color: '#0071e3', textDecoration: 'none' }}>JSON-LD</a> ·
          <a href={`/collections/${slug}.csv`} style={{ color: '#0071e3', textDecoration: 'none', marginLeft: '0.25rem' }}>CSV</a>
        </p>

        {data.builders.length === 0 ? (
          <div style={{ background: 'white', border: '1px dashed #d2d2d7', borderRadius: 14, padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#6e6e73' }}>
              No builders have opted in yet. The collection appears here as builders consent.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.builders.map((b) => {
              const initials = (b.profile.full_name ?? b.profile.username)
                .split(' ')
                .map(w => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
              return (
                <Link
                  key={b.profile.username}
                  href={`/u/${b.profile.username}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{
                    background: 'white',
                    border: '1px solid #e0e0e5',
                    borderRadius: 14,
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: b.profile.verified ? 'linear-gradient(135deg, #e8f1fd, #d0e4fb)' : '#f0f0f5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                      color: b.profile.verified ? '#0071e3' : '#6e6e73',
                      flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.15rem', letterSpacing: '-0.01em' }}>
                        {b.profile.full_name ?? b.profile.username}
                        {b.profile.verified && (
                          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#0071e3', background: '#e8f1fd', padding: '0.15rem 0.45rem', borderRadius: 980 }}>✓ Verified</span>
                        )}
                      </p>
                      <p style={{ fontSize: 13, color: '#6e6e73' }}>
                        {b.profile.role ?? ''}{b.profile.location ? ` · ${b.profile.location}` : ''}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e0e0e5' }}>
          <p style={{ fontSize: 12, color: '#aeaeb2', lineHeight: 1.6 }}>
            This collection contains only data already public on each builder&apos;s ShipStacked profile.
            Builders opt in explicitly; they can opt out anytime and disappear from this page on the next read.
            Default state: not in the collection. No builder is ever added without their consent.
          </p>
        </div>
      </div>
    </main>
  )
}
