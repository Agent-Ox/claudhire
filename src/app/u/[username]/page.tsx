import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .eq('published', true)
    .single()

  if (!profile) notFound()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('profile_id', profile.id)
    .order('display_order')

  const { data: skills } = await supabase
    .from('skills')
    .select('*')
    .eq('profile_id', profile.id)

  const byCategory = (cat: string) => skills?.filter(s => s.category === cat).map(s => s.name) || []

  const initials = profile.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <nav style={{ borderBottom: '0.5px solid #e0e0e5', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 
'space-between', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}>
        <a href="/" style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          ClaudHire<span style={{ color: '#0071e3' }}>.</span>
        </a>
        <a href="/join" style={{ padding: '0.4rem 1rem', background: '#0071e3', color: 'white', borderRadius: 20, fontSize: 13, fontWeight: 500, 
textDecoration: 'none' }}>
          Create your profile →
        </a>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e8f1fd', display: 'flex', alignItems: 'center', justifyContent: 
'center', fontSize: 22, fontWeight: 700, color: '#0071e3', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '0.3rem' }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>{profile.full_name}</h1>
              {profile.verified && (
                <span style={{ background: '#e8f1fd', color: '#0071e3', fontSize: 11, fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 20, 
letterSpacing: '0.05em' }}>
                  ✓ VERIFIED
                </span>
              )}
            </div>
            <p style={{ color: '#6e6e73', fontSize: 15, margin: '0 0 0.4rem' }}>{profile.role}</p>
            {profile.location && <p style={{ color: '#aeaeb2', fontSize: 13, margin: 0 }}>{profile.location}</p>}
          </div>
          {profile.availability && (
            <span style={{ background: '#e8fdf0', color: '#1a7f37', fontSize: 12, fontWeight: 500, padding: '0.3rem 0.75rem', borderRadius: 20, 
whiteSpace: 'nowrap' }}>
              {profile.availability}
            </span>
          )}
        </div>

        {profile.bio && (
          <p style={{ fontSize: 16, color: '#1d1d1f', lineHeight: 1.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>
            "{profile.bio}"
          </p>
        )}

        {profile.about && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '0.75rem', color: '#1d1d1f' }}>About</h2>
            <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.7 }}>{profile.about}</p>
          </div>
        )}

        {byCategory('claude_use_case').length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '0.75rem' }}>Claude use cases</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {byCategory('claude_use_case').map((s: string) => (
                <span key={s} style={{ background: '#e8f1fd', color: '#0071e3', fontSize: 13, padding: '0.3rem 0.75rem', borderRadius: 20, 
fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {projects && projects.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem' }}>Projects</h2>
            {projects.map((p: any) => (
              <div key={p.id} style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' 
}}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>{p.title}</h3>
                {p.description && <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, marginBottom: '0.75rem' }}>{p.description}</p>}
                {p.prompt_approach && (
                  <div style={{ background: '#f5f5f7', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#aeaeb2', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>HOW CLAUDE WAS 
USED</p>
                    <p style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.6, margin: 0 }}>{p.prompt_approach}</p>
                  </div>
                )}
                {p.outcome && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1a7f37' }}>OUTCOME</span>
                    <span style={{ fontSize: 14, color: '#1d1d1f' }}>{p.outcome}</span>
                  </div>
                )}
                {p.project_url && (
                  <a href={p.project_url} target="_blank" style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: 13, color: '#0071e3', 
textDecoration: 'none' }}>
                    View project →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {(byCategory('language').length > 0 || byCategory('framework').length > 0 || byCategory('ai_tool').length > 0) && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem' }}>Skills & tools</h2>
            {[
              { label: 'Languages', items: byCategory('language') },
              { label: 'Frameworks', items: byCategory('framework') },
              { label: 'AI tools', items: byCategory('ai_tool') },
              { label: 'Other LLMs', items: byCategory('llm') },
              { label: 'Domains', items: byCategory('domain') },
            ].filter(g => g.items.length > 0).map(({ label, items }) => (
              <div key={label} style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#aeaeb2', letterSpacing: '0.05em', marginBottom: '0.5rem' 
}}>{label.toUpperCase()}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {items.map((s: string) => (
                    <span key={s} style={{ background: '#f5f5f7', color: '#1d1d1f', fontSize: 13, padding: '0.25rem 0.65rem', borderRadius: 20 
}}>{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: '1.5rem', borderTop: '1px solid #e0e0e5' }}>
          {profile.github_url && <a href={profile.github_url} target="_blank" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none' 
}}>GitHub →</a>}
          {profile.x_url && <a href={profile.x_url} target="_blank" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none' }}>X →</a>}
          {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none' 
}}>LinkedIn →</a>}
          {profile.website_url && <a href={profile.website_url} target="_blank" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none' 
}}>Website →</a>}
        </div>

        <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#f5f5f7', borderRadius: 14, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: '0.75rem' }}>Are you looking to hire Claude-native talent?</p>
          <a href="/join" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>Post a job on ClaudHire →</a>
        </div>

      </div>
    </div>
  )
}

