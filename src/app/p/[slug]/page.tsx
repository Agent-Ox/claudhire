import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getReceiptBundle, receiptCanonicalUrl, entityCanonicalUrl } from '@/lib/receipts/render'
import { receiptJsonLd } from '@/lib/receipts/jsonld'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Dynamic SSR (auth check for private receipts forces it). Cache headers
// applied via the Next response when the page renders publicly. ISR
// deferred — spec §3.4 was incompatible with the private-visibility
// auth gate; flagged.
export const dynamic = 'force-dynamic'

const EVENT_TYPE_LABEL: Record<string, string> = {
  shipped_app: 'Shipped App',
  shipped_site: 'Shipped Site',
  shipped_agent: 'Shipped Agent',
  shipped_workflow: 'Shipped Workflow',
  shipped_integration: 'Shipped Integration',
  deployed_mcp_server: 'Deployed MCP Server',
  published_repo: 'Published Repo',
  completed_eval: 'Completed Eval',
  delivered_engagement: 'Delivered Engagement',
  resolved_incident: 'Resolved Incident',
}

const VERIFICATION_LABEL: Record<string, string> = {
  L0_claimed: 'Claimed',
  L1_artifact_confirmed: 'Artifact Confirmed',
  L2_technically_checked: 'Technically Checked',
  L3_externally_attested: 'Externally Attested',
  L4_cryptographically_signed: 'Cryptographically Signed',
}

const LADDER_LEVELS = ['L1', 'L2', 'L3', 'L4'] as const

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function shortDescription(s: string, max: number): string {
  const flat = s.replace(/[#*`>\-]/g, '').replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  return flat.slice(0, max - 1) + '…'
}

function formatOccurred(iso: string, precision: string): string {
  const d = new Date(iso)
  if (precision === 'year') return d.getUTCFullYear().toString()
  if (precision === 'month') {
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  }
  if (precision === 'quarter') {
    const q = Math.floor(d.getUTCMonth() / 3) + 1
    return `Q${q} ${d.getUTCFullYear()}`
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const bundle = await getReceiptBundle(adminClient(), slug)
  if (!bundle) return { title: 'Not found · ShipStacked' }
  const { receipt, subject } = bundle
  const canonical = receiptCanonicalUrl(receipt.slug)
  const ogImage =
    (receipt.ingestion_metadata as Record<string, unknown> | null)?.embed_card_url as
      | string
      | undefined
  const desc = shortDescription(receipt.description, 200)
  const noIndex = receipt.visibility !== 'public'

  return {
    title: `${receipt.title} — by ${subject.display_name} · ShipStacked`,
    description: shortDescription(receipt.description, 160),
    alternates: {
      canonical,
      types: {
        'application/ld+json': `${canonical}.json`,
      },
    },
    openGraph: {
      title: receipt.title,
      description: desc,
      type: 'article',
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: receipt.title,
      description: desc,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  }
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const bundle = await getReceiptBundle(adminClient(), slug)
  if (!bundle) notFound()

  const { receipt, subject, attestations, verification_events } = bundle

  // Private gate: only the subject's owner can view. Anyone else → 404
  // (deliberately indistinguishable from "doesn't exist").
  if (receipt.visibility === 'private') {
    const ssrClient = await createServerSupabaseClient()
    const { data: { user } } = await ssrClient.auth.getUser()
    if (!user || user.id !== subject.owner_user_id) notFound()
  }

  const jsonLd = receiptJsonLd(bundle)
  const canonical = receiptCanonicalUrl(receipt.slug)

  const currentLadderIndex = LADDER_LEVELS.findIndex((l) => receipt.verification_level.startsWith(l))
  const eventTypeLabel = EVENT_TYPE_LABEL[receipt.event_type] ?? receipt.event_type

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: '2rem 1.5rem 4rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <a href="/" style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '2rem' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        <span style={{ display: 'inline-block', padding: '0.25rem 0.65rem', borderRadius: 999, background: '#eaf3ff', color: '#0a3d80', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {eventTypeLabel}
        </span>

        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '1rem 0 0.75rem', lineHeight: 1.1 }}>
          {receipt.title}
        </h1>

        <p style={{ color: '#6e6e73', fontSize: 16, margin: 0 }}>
          by{' '}
          <Link
            href={`/u/${subject.slug}`}
            style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}
            title="Profile pages ship in Phase 1B"
          >
            {subject.display_name}
          </Link>
          {'  ·  '}
          <time dateTime={receipt.occurred_at}>
            {formatOccurred(receipt.occurred_at, receipt.occurred_at_precision)}
          </time>
        </p>

        <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: 999, background: '#eaf3ff', border: '1px solid #c8defc', fontSize: 13, fontWeight: 600, color: '#0a3d80' }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#0071e3' }} />
            {receipt.verification_level.replace('_', ' ').replace(/^L(\d)/, 'L$1 ')} —{' '}
            {VERIFICATION_LABEL[receipt.verification_level] ?? receipt.verification_level}
          </span>
          {receipt.visibility === 'unlisted' && (
            <span style={{ padding: '0.3rem 0.6rem', borderRadius: 999, background: '#fff8e6', border: '1px solid #ffd98a', fontSize: 12, color: '#5a4400', fontWeight: 600 }}>
              Unlisted
            </span>
          )}
        </div>

        <hr style={{ border: 0, borderTop: '1px solid #ececf0', margin: '2rem 0' }} />

        <div style={{ fontSize: 16, color: '#1d1d1f', lineHeight: 1.6 }}>
          <Markdown remarkPlugins={[remarkGfm]}>{receipt.description}</Markdown>
        </div>

        {/* ATLAS ROLES */}
        {(receipt.atlas_confirmed.length > 0 || receipt.atlas_inferred.length > 0) && (
          <Section label="Atlas roles">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
              {receipt.atlas_confirmed.map((id) => (
                <li key={`c-${id}`}>
                  <Link href={`/atlas/roles/${id}?v=${receipt.atlas_version}`} style={atlasPillStyle}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0071e3' }}>{id}</span>
                    <span style={{ marginLeft: 'auto', color: '#6e6e73', fontSize: 13 }}>confirmed →</span>
                  </Link>
                </li>
              ))}
              {receipt.atlas_inferred
                .filter((id) => !receipt.atlas_confirmed.includes(id))
                .map((id) => (
                  <li key={`i-${id}`}>
                    <Link href={`/atlas/roles/${id}?v=${receipt.atlas_version}`} style={{ ...atlasPillStyle, background: '#fafafd' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0071e3' }}>{id}</span>
                      <span style={{ marginLeft: 'auto', color: '#6e6e73', fontSize: 13 }}>inferred →</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </Section>
        )}

        {/* STACK */}
        {receipt.stack.length > 0 && (
          <Section label="Stack">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {receipt.stack.map((s) => (
                <span
                  key={`${s.category}-${s.name}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'baseline',
                    gap: '0.4rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: 999,
                    background: s.role === 'primary' ? '#eaf3ff' : '#f4f4f6',
                    border: s.role === 'primary' ? '1px solid #c8defc' : '1px solid #e3e3e8',
                    fontSize: 13,
                    color: '#1d1d1f',
                  }}
                >
                  {s.name}
                  {s.version && <span style={{ color: '#86868b', fontSize: 12 }}>{s.version}</span>}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* OUTCOMES */}
        {receipt.outcomes.length > 0 && (
          <Section label="Outcomes">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
              {receipt.outcomes.map((o, i) => (
                <li key={i} style={{ fontSize: 15, color: '#1d1d1f' }}>
                  <span style={{ marginRight: '0.5rem', color: '#0071e3' }}>•</span>
                  {typeof o.value === 'number' && (
                    <strong>
                      {o.value}
                      {o.unit ? `${o.unit.startsWith('%') ? '' : ' '}${o.unit}` : ''}
                      {' · '}
                    </strong>
                  )}
                  {o.description}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ARTIFACTS */}
        <Section label="Artifacts">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
            {receipt.artifacts.map((a, i) => (
              <li key={i} style={{ fontSize: 15 }}>
                <span style={{ color: '#86868b', fontSize: 12, fontFamily: 'monospace', marginRight: '0.6rem', textTransform: 'uppercase' }}>
                  {a.kind}
                </span>
                <a
                  href={a.url}
                  rel="noopener noreferrer"
                  target="_blank"
                  style={{ color: '#0071e3', textDecoration: 'none' }}
                >
                  {a.title || a.url}
                </a>
              </li>
            ))}
          </ul>
        </Section>

        {/* ATTESTATIONS */}
        <Section label="Attestations">
          {attestations.length === 0 ? (
            <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>
              None yet. Attestations ship in Phase 1B.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
              {attestations.map((a) => (
                <li key={a.id} style={{ padding: '0.6rem 0.85rem', background: '#f4f4f6', borderRadius: 8, fontSize: 14 }}>
                  <strong style={{ textTransform: 'capitalize', color: '#1d1d1f' }}>{a.attestor_role}</strong>:{' '}
                  {a.statement}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* VERIFICATION LADDER */}
        <Section label="Verification ladder">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
            {LADDER_LEVELS.map((level, idx) => {
              const active = idx === currentLadderIndex
              const past = idx < currentLadderIndex
              return (
                <li
                  key={level}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.7rem',
                    padding: '0.4rem 0.7rem',
                    borderRadius: 8,
                    background: active ? '#eaf3ff' : 'transparent',
                    border: active ? '1px solid #c8defc' : '1px solid transparent',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: active || past ? '#0071e3' : 'transparent',
                      border: active || past ? '1px solid #0071e3' : '1px solid #c8c8cf',
                      flex: '0 0 auto',
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: '#1d1d1f' }}>
                    {level} — {VERIFICATION_LABEL[`${level}_${level === 'L1' ? 'artifact_confirmed' : level === 'L2' ? 'technically_checked' : level === 'L3' ? 'externally_attested' : 'cryptographically_signed'}`]}
                  </span>
                </li>
              )
            })}
          </ul>
          {verification_events.length > 0 && (
            <p style={{ fontSize: 12, color: '#86868b', marginTop: '0.75rem' }}>
              Trail: {verification_events.map((e) => e.level).join(' → ')}
            </p>
          )}
        </Section>

        {/* SHARE */}
        <Section label="Share / embed">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(receipt.title)}`}
              rel="noopener noreferrer"
              target="_blank"
              style={shareBtn}
            >
              Share to X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}`}
              rel="noopener noreferrer"
              target="_blank"
              style={shareBtn}
            >
              Share to LinkedIn
            </a>
            <a
              href={`${canonical}.json`}
              rel="alternate"
              type="application/ld+json"
              style={shareBtn}
            >
              JSON-LD
            </a>
          </div>
        </Section>

        <p style={{ marginTop: '3rem', fontSize: 12, color: '#86868b' }}>
          <a href={entityCanonicalUrl(subject.slug)} style={{ color: '#86868b' }}>{entityCanonicalUrl(subject.slug)}</a>
          {' · '}
          schema_version {receipt.schema_version} · atlas_version {receipt.atlas_version}
        </p>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.75rem' }}>
        {label}
      </h2>
      {children}
    </section>
  )
}

const atlasPillStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  padding: '0.5rem 0.85rem',
  borderRadius: 10,
  background: '#f6f9ff',
  border: '1px solid #e3ecfa',
  fontSize: 14,
  color: '#1d1d1f',
  textDecoration: 'none',
}

const shareBtn: React.CSSProperties = {
  padding: '0.45rem 0.9rem',
  fontSize: 13,
  fontWeight: 500,
  color: '#1d1d1f',
  background: 'white',
  border: '1px solid #d2d2d7',
  borderRadius: 999,
  textDecoration: 'none',
  fontFamily: 'inherit',
}
