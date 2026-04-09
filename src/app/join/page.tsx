'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const AI_TOOLS = ['Cursor', 'Replit', 'Bolt', 'Lovable', 'v0', 'Windsurf', 'Claude Code', 'Midjourney', 'ElevenLabs', 'Pinecone']
const FRAMEWORKS = ['Next.js', 'React', 'Vue', 'LangChain', 'LlamaIndex', 'n8n', 'Make', 'Zapier', 'Supabase', 'Firebase', 'FastAPI', 'Node.js', 'Vercel', 'AWS', 'Docker']
const DOMAINS = ['Legal', 'Healthcare', 'Finance', 'Marketing', 'Education', 'E-commerce', 'Real estate', 'HR', 'Customer support', 'Research', 'Media', 'Gaming']
const CLAUDE_USE_CASES = ['Automation and workflows', 'Content creation', 'Coding and development', 'Data analysis', 'Customer support', 'Research', 'Document processing', 'API integration', 'Agent systems', 'Education and training']

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem 1rem', border: '1px solid #d2d2d7',
  borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: 'inherit',
  background: 'white', boxSizing: 'border-box'
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.4rem', color: '#1d1d1f'
}

function Tag({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '0.4rem 0.9rem', borderRadius: 20, border: '1px solid', fontSize: 13,
      cursor: 'pointer', fontFamily: 'inherit',
      background: selected ? '#0071e3' : 'white',
      borderColor: selected ? '#0071e3' : '#d2d2d7',
      color: selected ? 'white' : '#1d1d1f'
    }}>{label}</button>
  )
}

function tog<T>(arr: T[], setArr: (v: T[]) => void, val: T) {
  setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
}

export default function JoinPage() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [xUrl, setXUrl] = useState('')

  const [projectTitle, setProjectTitle] = useState('')
  const [projectOutcome, setProjectOutcome] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([])
  const [selectedAITools, setSelectedAITools] = useState<string[]>([])
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([])
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/signup'; return }
      setEmail(user.email || '')
      supabase.from('profiles').select('username').eq('email', user.email).maybeSingle().then(({ data }) => {
        if (data?.username) { window.location.href = '/dashboard' }
        else { setChecking(false) }
      })
    })
  }, [])

  const canProceed = () => {
    if (step === 0) return !!(fullName.trim() && role.trim() && bio.trim())
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const base = fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
      const suffix = Math.floor(Math.random() * 900) + 100
      const generatedUsername = base + suffix

      const { error: insertError } = await supabase.from('profiles').insert([{
        user_id: user.id,
        email: user.email,
        username: generatedUsername,
        full_name: fullName.trim(),
        role: role.trim(),
        location: location.trim() || null,
        bio: bio.trim(),
        github_url: githubUrl.trim() || null,
        x_url: xUrl.trim() || null,
        published: true,
        verified: false,
        accepts_project_inquiries: true,
        velocity_score: 0,
      }])

      if (insertError) throw insertError

      // Insert project if provided
      if (projectTitle.trim() && projectOutcome.trim()) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('username', generatedUsername).maybeSingle()
        if (profile?.id) {
          await supabase.from('posts').insert([{
            profile_id: profile.id,
            title: projectTitle.trim(),
            outcome: projectOutcome.trim(),
            url: projectUrl.trim() || null,
          }])
        }
      }

      // Insert skills
      const skills = [...selectedUseCases, ...selectedAITools, ...selectedFrameworks, ...selectedDomains]
      if (skills.length > 0) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('username', generatedUsername).maybeSingle()
        if (profile?.id) {
          await supabase.from('skills').insert(skills.map(s => ({ profile_id: profile.id, name: s })))
        }
      }

      // Welcome email
      try {
        await fetch('/api/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, name: fullName.trim(), username: generatedUsername })
        })
      } catch {}

      setUsername(generatedUsername)
      setStep(2)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#fbfbfd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #e0e0e5', borderTopColor: '#0071e3', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        {step < 2 && (
          <div style={{ margin: '2rem 0' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: '0.5rem' }}>
              {[0, 1].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? '#0071e3' : '#e0e0e5' }} />
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#6e6e73' }}>Step {step + 1} of 2 — {['Who you are', 'What you ship'][step]}</p>
          </div>
        )}

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>
            {error}
          </div>
        )}

        {step === 0 && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Who you are</h1>
            <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>Two minutes. Your profile goes live at the end.</p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Full name</label>
              <input autoComplete="name" type="text" placeholder="Sara Rodriguez" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} disabled style={{ ...inputStyle, background: '#f5f5f7', color: '#6e6e73' }} />
              <p style={{ fontSize: 12, color: '#6e6e73', marginTop: '0.3rem' }}>Linked to your account.</p>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Role / title</label>
              <input autoComplete="off" type="text" placeholder="AI Automation Engineer" value={role} onChange={e => setRole(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>One-line bio</label>
              <input autoComplete="off" type="text" placeholder="I build AI agents that run without human input" value={bio} onChange={e => setBio(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Location <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <input autoComplete="off" type="text" placeholder="Barcelona, Spain" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>GitHub <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional but recommended)</span></label>
              <input autoComplete="off" type="url" placeholder="https://github.com/username" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>X / Twitter <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <input autoComplete="off" type="url" placeholder="https://x.com/username" value={xUrl} onChange={e => setXUrl(e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>What you ship</h1>
            <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>Show one real thing you built. This is your proof of work.</p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>What did you build? <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <input autoComplete="off" type="text" placeholder="AI invoice parser for a 3-person law firm" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>What was the outcome? <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <input autoComplete="off" type="text" placeholder="Cut review time from 4 hours to 20 minutes" value={projectOutcome} onChange={e => setProjectOutcome(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Link <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <input autoComplete="off" type="url" placeholder="https://github.com/you/project" value={projectUrl} onChange={e => setProjectUrl(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={labelStyle}>How do you use AI? <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.4rem' }}>
                {CLAUDE_USE_CASES.map(item => <Tag key={item} label={item} selected={selectedUseCases.includes(item)} onClick={() => tog(selectedUseCases, setSelectedUseCases, item)} />)}
              </div>
            </div>
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={labelStyle}>AI tools you use <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.4rem' }}>
                {AI_TOOLS.map(item => <Tag key={item} label={item} selected={selectedAITools.includes(item)} onClick={() => tog(selectedAITools, setSelectedAITools, item)} />)}
              </div>
            </div>
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={labelStyle}>Frameworks & tools <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.4rem' }}>
                {FRAMEWORKS.map(item => <Tag key={item} label={item} selected={selectedFrameworks.includes(item)} onClick={() => tog(selectedFrameworks, setSelectedFrameworks, item)} />)}
              </div>
            </div>
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={labelStyle}>Domain expertise <span style={{ fontWeight: 400, color: '#6e6e73' }}>(optional)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.4rem' }}>
                {DOMAINS.map(item => <Tag key={item} label={item} selected={selectedDomains.includes(item)} onClick={() => tog(selectedDomains, setSelectedDomains, item)} />)}
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#6e6e73' }}>You can add more detail — day rate, stack, links — from your dashboard after going live.</p>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ width: 64, height: 64, background: '#e8f1fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: 28, color: '#0071e3', fontWeight: 700 }}>✓</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>You are live.</h1>
            <p style={{ color: '#6e6e73', marginBottom: '2rem', fontSize: 15 }}>Your ShipStacked profile is published. Employers can find you now.</p>
            <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: 14, color: '#1d1d1f', fontFamily: 'monospace' }}>
              shipstacked.com/u/{username}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={`https://x.com/intent/tweet?text=I just created my ShipStacked profile — proof of work is the new CV&url=https://shipstacked.com/u/${username}`}
                target="_blank" style={{ padding: '0.75rem 1.5rem', background: '#000', color: 'white', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Share on X</a>
              <a href={`https://wa.me/?text=I just created my ShipStacked profile: https://shipstacked.com/u/${username}`}
                target="_blank" style={{ padding: '0.75rem 1.5rem', background: '#25D366', color: 'white', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Share on WhatsApp</a>
              <button type="button" onClick={() => {
                if (navigator.share) { navigator.share({ title: 'My ShipStacked Profile', url: `https://shipstacked.com/u/${username}` }) }
                else { navigator.clipboard.writeText(`https://shipstacked.com/u/${username}`) }
              }} style={{ padding: '0.75rem 1.5rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 20, fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                Share / Copy link
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <a href="/dashboard" style={{ color: 'white', background: '#0071e3', padding: '0.65rem 1.25rem', borderRadius: 20, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Go to dashboard →</a>
              <a href={`/u/${username}`} style={{ color: '#0071e3', fontSize: 14, textDecoration: 'none', padding: '0.65rem 1.25rem' }}>View your profile →</a>
            </div>
          </div>
        )}

        {step < 2 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e0e0e5' }}>
            {step > 0
              ? <button type="button" onClick={() => setStep(s => s - 1)} style={{ padding: '0.75rem 1.5rem', background: 'white', border: '1px solid #d2d2d7', borderRadius: 20, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
              : <div />
            }
            {step === 0
              ? <button type="button" onClick={() => setStep(1)} disabled={!canProceed()} style={{ padding: '0.75rem 1.75rem', background: canProceed() ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none', borderRadius: 20, fontSize: 15, cursor: canProceed() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 500 }}>Continue</button>
              : <button type="button" onClick={handleSubmit} disabled={loading} style={{ padding: '0.75rem 1.75rem', background: loading ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 20, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>{loading ? 'Publishing...' : 'Publish my profile →'}</button>
            }
          </div>
        )}

      </div>
    </div>
  )
}
