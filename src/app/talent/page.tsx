import React from 'react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI-Native Builder Directory | ShipStacked',
  description: 'Browse verified AI-native builders. Vibe coders, prompt engineers, AI automation specialists — all with proven build histories and real outcomes.',
  openGraph: {
    title: 'AI-Native Builder Directory | ShipStacked',
    description: 'Find and hire verified AI-native builders with real proof of work. Browse by velocity score, skills, and availability.',
    url: 'https://shipstacked.com/talent',
  },
  alternates: { canonical: 'https://shipstacked.com/talent' },
}

export default async function TalentPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if user has paid employer subscription
  let isPaidEmployer = false
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
    isPaidEmployer = !!sub
  }

  // Fetch profiles — verified first, then recency
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, location, bio, avatar_url, verified, availability, velocity_score, skills(*)')
    .eq('published', true)
    .order('verified', { ascending: false })
    .order('velocity_score', { ascending: false })
    .order('created_at', { ascending: false })

  const profiles = allProfiles || []
  const verifiedCount = profiles.filter(p => p.verified).length

  // Public/builder sees only 6 teaser cards; paid employer sees all
  const displayProfiles = isPaidEmployer ? profiles : profiles.slice(0, 6)
  const isTeaser = !isPaidEmployer

  const velocityColor = (score: number) =>
    score >= 75 ? '#1a7f37' : score >= 50 ? '#0071e3' : score >= 25 ? '#bf7e00' : '#6e6e73'

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <style>{`
        .talent-card {
          display: block;
          background: white;
          border: 1px solid #e0e0e5;
          border-radius: 16px;
          padding: 1.25rem;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          position: relative;
        }
        .talent-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .talent-card-verified {
          border-color: rgba(0,113,227,0.2);
        }
        .talent-card-verified:hover {
          border-color: rgba(0,113,227,0.4);
          box-shadow: 0 8px 24px rgba(0,113,227,0.1);
        }
        .save-btn {
          position: absolute;
          top: 0.875rem;
          right: 0.875rem;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f5f5f7;
          border: 1px solid #e0e0e5;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          z-index: 2;
          flex-shrink: 0;
        }
        .save-btn:hover { background: #fff0e8; border-color: #ffb380; }
        .save-btn.saved { background: #fff3e0; border-color: #ff9500; }
        @media (max-width: 640px) {
          .talent-grid { grid-template-columns: 1fr !important; }
          .talent-header { flex-direction: column; align-items: flex-start !important; gap: 0.75rem !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '4rem 1.5rem 5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Talent</p>
          <div className="talent-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.4rem' }}>AI-native builders</h1>
              <p style={{ fontSize: 15, color: '#6e6e73' }}>
                {profiles.length} builders · {verifiedCount} verified
              </p>
            </div>
            {isPaidEmployer && (
              <div style={{ fontSize: 13, color: '#6e6e73', background: '#f5f5f7', padding: '0.4rem 0.875rem', borderRadius: 980, whiteSpace: 'nowrap' }}>
                Full access
              </div>
            )}
          </div>
        </div>

        {/* Scout prompt bar — paid employers only */}
        {isPaidEmployer && (
          <div style={{
            background: 'linear-gradient(135deg, #0f0f18 0%, #1a1a2e 100%)',
            border: '1px solid rgba(108,99,255,0.25)',
            borderRadius: 16,
            padding: '1.5rem 1.75rem',
            marginBottom: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/>
                  <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(240,240,245,0.95)', marginBottom: '0.2rem', letterSpacing: '-0.01em' }}>Know exactly what you need?</p>
                <p style={{ fontSize: 13, color: 'rgba(167,139,250,0.8)' }}>Ask Scout — describe your ideal hire and get matched instantly.</p>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,240,245,0.9)', background: 'rgba(108,99,255,0.2)', border: '1px solid rgba(108,99,255,0.3)', padding: '0.5rem 1.1rem', borderRadius: 980, whiteSpace: 'nowrap', cursor: 'default' }}>
              Scout is active ↘
            </div>
          </div>
        )}

        {/* Verified section header */}
        {verifiedCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              ✓ Verified builders
            </span>
            <div style={{ flex: 1, height: '0.5px', background: '#e0e0e5' }} />
          </div>
        )}

        {/* Talent grid */}
        {profiles.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: '1rem' }}>👀</p>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>Profiles coming soon.</h2>
            <p style={{ color: '#6e6e73', fontSize: 14 }}>We are onboarding our first verified builders. Check back shortly.</p>
          </div>
        ) : (
          <>
            <div className="talent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {displayProfiles.map((profile: any, index: number) => {
                const initials = profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                const claudeSkills = profile.skills?.filter((s: any) => s.category === 'claude_use_case').slice(0, 3) || []
                const otherSkills = profile.skills?.filter((s: any) => s.category !== 'claude_use_case').slice(0, 2) || []
                const prevProfile = displayProfiles[index - 1]
                const showUnverifiedDivider = index > 0 && !profile.verified && prevProfile?.verified
                const vColor = velocityColor(profile.velocity_score || 0)

                return (
                  <React.Fragment key={profile.id}>
                    {showUnverifiedDivider && (
                      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.05em', textTransform: 'uppercase' }}>All builders</span>
                        <div style={{ flex: 1, height: '0.5px', background: '#e0e0e5' }} />
                      </div>
                    )}
                    <a href={`/u/${profile.username}`} className={profile.verified ? 'talent-card talent-card-verified' : 'talent-card'}>
                      {/* Save button — only for paid employers, handled client-side via data attr */}
                      {isPaidEmployer && (
                        <button
                          className="save-btn"
                          data-profile-id={profile.id}
                          data-profile-name={profile.full_name}
                          onClick={(e) => e.preventDefault()}
                          title="Save to shortlist"
                          aria-label="Save to shortlist"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                          </svg>
                        </button>
                      )}

                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', paddingRight: isPaidEmployer ? '2rem' : 0 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                          background: profile.verified ? 'linear-gradient(135deg, #e8f1fd, #d0e4fb)' : '#f0f0f5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, fontWeight: 700,
                          color: profile.verified ? '#0071e3' : '#6e6e73',
                          border: profile.verified ? '2px solid rgba(0,113,227,0.2)' : 'none',
                          overflow: 'hidden',
                        }}>
                          {profile.avatar_url
                            ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : initials
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{profile.full_name}</span>
                            {profile.verified && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#0071e3', background: '#e8f1fd', padding: '0.15rem 0.45rem', borderRadius: 980 }}>✓ Verified</span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: '#6e6e73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {profile.role}{profile.location ? ` · ${profile.location}` : ''}
                          </div>
                        </div>
                        {(profile.velocity_score || 0) > 0 && (
                          <div style={{ flexShrink: 0, textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: vColor, lineHeight: 1 }}>{profile.velocity_score}</div>
                            <div style={{ fontSize: 9, color: '#aeaeb2', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>velocity</div>
                          </div>
                        )}
                      </div>

                      {/* Bio */}
                      {profile.bio && (
                        <p style={{ fontSize: 13, color: '#3d3d3f', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                          {profile.bio}
                        </p>
                      )}

                      {/* Skills */}
                      {(claudeSkills.length > 0 || otherSkills.length > 0) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {claudeSkills.map((s: any) => (
                            <span key={s.id} style={{ fontSize: 11, padding: '0.2rem 0.55rem', background: '#e8f1fd', borderRadius: 980, color: '#0071e3', fontWeight: 500 }}>{s.name}</span>
                          ))}
                          {otherSkills.map((s: any) => (
                            <span key={s.id} style={{ fontSize: 11, padding: '0.2rem 0.55rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>{s.name}</span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.25rem' }}>
                        <span style={{ fontSize: 11, color: '#6e6e73', textTransform: 'capitalize', background: '#f5f5f7', padding: '0.2rem 0.6rem', borderRadius: 980, fontWeight: 500 }}>
                          {profile.availability || 'open'}
                        </span>
                        {isPaidEmployer && (
                          <a href={`/employer/messages?new=${profile.id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: 12, padding: '0.4rem 0.875rem', background: '#0071e3', color: 'white', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
                            Message →
                          </a>
                        )}
                      </div>
                    </a>
                  </React.Fragment>
                )
              })}
            </div>

            {/* Paywall gate for non-employers */}
            {isTeaser && (
              <div style={{
                marginTop: '2.5rem',
                background: 'linear-gradient(180deg, rgba(251,251,253,0) 0%, #fbfbfd 60%)',
                borderRadius: 20,
                padding: '3rem 2rem',
                textAlign: 'center',
                position: 'relative',
              }}>
                {/* Blur overlay above */}
                <div style={{
                  position: 'absolute',
                  top: -80,
                  left: 0,
                  right: 0,
                  height: 120,
                  background: 'linear-gradient(180deg, transparent 0%, #fbfbfd 100%)',
                  pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <p style={{ fontSize: 28, marginBottom: '0.75rem' }}>🔒</p>
                  <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem' }}>
                    {profiles.length - 6 > 0 ? `+${profiles.length - 6} more verified builders` : `Full directory access`}
                  </h2>
                  <p style={{ fontSize: 15, color: '#6e6e73', maxWidth: 400, margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
                    Get full access to every ShipStacked builder. Read their Build Feed, see their Velocity Score, and message them directly — all for $199/month.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href="/#pricing" style={{ padding: '0.875rem 2rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                      Get full access — $199/mo
                    </a>
                    {!user && (
                      <a href="/login" style={{ padding: '0.875rem 1.5rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 15, fontWeight: 500, textDecoration: 'none', display: 'inline-block' }}>
                        Sign in
                      </a>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: '#aeaeb2', marginTop: '1rem' }}>No commissions. Cancel anytime.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Shortlist JS — client-side save to localStorage for now, DB upgrade later */}
      {isPaidEmployer && (
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var STORAGE_KEY = 'ss_saved_profiles';
            function getSaved() {
              try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; }
            }
            function setSaved(arr) {
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch(e) {}
            }
            function updateBtn(btn, saved) {
              if (saved) {
                btn.classList.add('saved');
                btn.title = 'Saved to shortlist';
                btn.querySelector('svg').setAttribute('fill', '#ff9500');
              } else {
                btn.classList.remove('saved');
                btn.title = 'Save to shortlist';
                btn.querySelector('svg').setAttribute('fill', 'none');
              }
            }
            // Init all buttons
            var saved = getSaved();
            document.querySelectorAll('.save-btn').forEach(function(btn) {
              var id = btn.getAttribute('data-profile-id');
              updateBtn(btn, saved.some(function(s) { return s.id === id; }));
              btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var saved = getSaved();
                var idx = saved.findIndex(function(s) { return s.id === id; });
                if (idx > -1) {
                  saved.splice(idx, 1);
                } else {
                  saved.push({ id: id, name: btn.getAttribute('data-profile-name'), saved_at: new Date().toISOString() });
                }
                setSaved(saved);
                updateBtn(btn, saved.some(function(s) { return s.id === id; }));
              });
            });
          })();
        `}} />
      )}
    </div>
  )
}
