/**
 * /collections/[slug]/optin?t=<token>
 *
 * Token-redemption confirmation page. The page itself reads the token,
 * validates it server-side (without consuming it — that's the POST's
 * job), shows the disclosure + confirm button. On confirm, the client
 * POSTs to /api/collections/[slug]/optin/redeem which atomically marks
 * the token used and writes the membership row.
 */

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { requireActiveCollection } from '@/lib/collections/collections'
import { CollectionGateError } from '@/lib/collections/context'
import { inspectToken } from '@/lib/collections/tokens'
import OptinConfirmButton from './OptinConfirmButton'

export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function OptinPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const token = sp.t

  const admin = adminClient()

  let collection
  try {
    collection = await requireActiveCollection(admin, slug)
  } catch (e) {
    if (e instanceof CollectionGateError) notFound()
    throw e
  }

  if (!token) {
    return (
      <ErrorShell title="Missing token">
        This link is missing the required token. Ask whoever sent you the link to resend.
      </ErrorShell>
    )
  }

  const inspection = await inspectToken(admin, token)
  if (!inspection.ok) {
    const message =
      inspection.reason === 'expired' ? 'This link has expired.' :
      inspection.reason === 'already_used' ? 'This link has already been used.' :
      inspection.reason === 'revoked' ? 'This link has been revoked.' :
      'This link is not valid.'
    return <ErrorShell title="Link no longer valid">{message}</ErrorShell>
  }

  if (inspection.collection_slug !== slug) {
    return <ErrorShell title="Link mismatch">This link is for a different collection.</ErrorShell>
  }

  return (
    <main style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '4rem 1.5rem 5rem' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
          CONSENTED COLLECTION
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem', lineHeight: 1.15 }}>
          Join {collection.title}
        </h1>
        <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.7, marginBottom: '1rem' }}>
          ShipStacked maintains consented, machine-readable collections of builders that approved
          partners can access. Joining {collection.title} includes only data already public on
          your profile (name, role, location, links, skills, GitHub, verified status), at a public
          URL approved partners can access directly. Nothing new is exposed.
        </p>
        {collection.description && (
          <p style={{ fontSize: 13, fontStyle: 'italic', color: '#6e6e73', lineHeight: 1.6, marginBottom: '1rem' }}>
            {collection.description}
          </p>
        )}
        <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.7, marginBottom: '2rem' }}>
          Opt-in; opt out anytime; default is not joined.
        </p>
        <OptinConfirmButton slug={slug} token={token} />
      </div>
    </main>
  )
}

function ErrorShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '6rem 1.5rem 5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>{title}</h1>
        <p style={{ fontSize: 14, color: '#6e6e73' }}>{children}</p>
      </div>
    </main>
  )
}
