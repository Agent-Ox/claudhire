import { ImageResponse } from '@vercel/og'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'edge'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')

  let name = 'ShipStacked Builder'
  let role = 'AI-native builder'
  let verified = false
  let location = ''

  if (username) {
    try {
      const supabase = await createServerSupabaseClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, verified, location')
        .eq('username', username)
        .eq('published', true)
        .maybeSingle()

      if (profile) {
        name = profile.full_name || name
        role = profile.role || role
        verified = profile.verified || false
        location = profile.location || ''
      }
    } catch {}
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0a0f',
          padding: '60px',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        {/* Purple gradient mesh */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: '50%',
          background: 'radial-gradient(ellipse at 20% 0%, rgba(108,99,255,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 0%, rgba(167,139,250,0.2) 0%, transparent 60%)',
          display: 'flex',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'auto' }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.02em' }}>
            ShipStacked<span style={{ color: '#6c63ff' }}>.</span>
          </span>
        </div>

        {/* Profile info */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 48 }}>
          {/* Avatar circle */}
          <div style={{
            width: 80, height: 80, borderRadius: 40,
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: 'white',
            marginBottom: 24,
          }}>
            {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <span style={{ fontSize: 52, fontWeight: 700, color: 'rgba(240,240,245,0.95)', letterSpacing: '-0.03em' }}>
              {name}
            </span>
            {verified && (
              <span style={{
                fontSize: 14, fontWeight: 700, color: '#34d399',
                background: 'rgba(52,211,153,0.15)',
                border: '1px solid rgba(52,211,153,0.3)',
                padding: '4px 14px', borderRadius: 20,
                letterSpacing: '0.06em',
              }}>
                VERIFIED
              </span>
            )}
          </div>

          <span style={{ fontSize: 26, color: 'rgba(240,240,245,0.6)', marginBottom: 8 }}>
            {role}
          </span>

          {location && (
            <span style={{ fontSize: 20, color: 'rgba(240,240,245,0.4)' }}>
              {location}
            </span>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 24,
        }}>
          <span style={{ fontSize: 18, color: 'rgba(167,139,250,0.8)' }}>
            shipstacked.com
          </span>
          <span style={{ fontSize: 16, color: 'rgba(240,240,245,0.3)' }}>
            The home for AI-native talent
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
