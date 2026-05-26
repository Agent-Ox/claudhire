import { rateLimit } from '@/lib/rateLimit'
import { authenticateApiKey, apiError, apiOk, requireScope } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

// GET /api/v1/messages — list the buyer's conversations (buyer:rw, keyed on the
// key's email). Bearer-auth sibling of cookie-session /api/messages.
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)
  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')
  const scopeErr = requireScope(auth.auth, ['buyer:rw'])
  if (scopeErr) return scopeErr

  const email = auth.auth.email
  if (!email) return apiError(400, 'API key has no associated email')

  const db = admin()
  const { data: convs } = await db
    .from('conversations')
    .select('*, profiles!builder_profile_id(username, full_name, avatar_url, verified), jobs(role_title, company_name)')
    .eq('employer_email', email)
    .order('last_message_at', { ascending: false })

  const conversations = convs ?? []
  const convIds = conversations.map((c: any) => c.id)
  const lastMsgMap: Record<string, any> = {}
  const unreadMap: Record<string, number> = {}
  if (convIds.length > 0) {
    const { data: recentMsgs } = await db
      .from('messages')
      .select('conversation_id, content, sender_email, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })
    for (const m of (recentMsgs ?? [])) {
      if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m
    }
    const { data: unreadMsgs } = await db
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .eq('read', false)
      .neq('sender_email', email)
    for (const m of (unreadMsgs ?? [])) {
      unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1
    }
  }

  return apiOk({
    conversations: conversations.map((c: any) => ({
      ...c,
      last_message: lastMsgMap[c.id] || null,
      unread_count: unreadMap[c.id] || 0,
    })),
  })
}

// POST /api/v1/messages — message a builder by username (buyer:rw). Creates or
// appends a conversation keyed on (employer_email = key email, builder_profile_id).
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)
  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')
  const scopeErr = requireScope(auth.auth, ['buyer:rw'])
  if (scopeErr) return scopeErr

  const email = auth.auth.email
  if (!email) return apiError(400, 'API key has no associated email')

  let body: { to_username?: string; body?: string; job_id?: string | null }
  try { body = await req.json() } catch { return apiError(400, 'Invalid JSON body') }
  const toUsername = body.to_username?.trim()
  const content = body.body?.trim()
  const jobId = body.job_id ?? null
  if (!toUsername || !content) return apiError(400, 'to_username and body required')

  const db = admin()

  const { data: builder } = await db
    .from('profiles')
    .select('id, email, full_name')
    .eq('username', toUsername)
    .eq('published', true)
    .maybeSingle()
  if (!builder) return apiError(404, 'Builder not found or not published')

  // Find or create the conversation.
  let convId: string | null = null
  if (!jobId) {
    const { data: existing } = await db
      .from('conversations')
      .select('id')
      .eq('employer_email', email)
      .eq('builder_profile_id', builder.id)
      .is('job_id', null)
      .maybeSingle()
    if (existing) {
      convId = existing.id
      await db.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      const { data: newConv, error } = await db
        .from('conversations')
        .insert({ employer_email: email, builder_profile_id: builder.id, job_id: null, last_message_at: new Date().toISOString() })
        .select('id').single()
      if (error || !newConv) return apiError(500, 'Failed to create conversation', error?.message)
      convId = newConv.id
    }
  } else {
    const { data: newConv, error } = await db
      .from('conversations')
      .upsert(
        { employer_email: email, builder_profile_id: builder.id, job_id: jobId, last_message_at: new Date().toISOString() },
        { onConflict: 'employer_email,builder_profile_id,job_id' },
      )
      .select('id').single()
    if (error || !newConv) return apiError(500, 'Failed to create conversation', error?.message)
    convId = newConv.id
  }

  const { data: message, error: msgErr } = await db
    .from('messages')
    .insert({ conversation_id: convId, sender_email: email, content, read: false })
    .select()
    .single()
  if (msgErr) return apiError(500, 'Failed to send message', msgErr.message)

  await db.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId)

  // Notify the builder on the first message in the conversation (mirror cookie route).
  const { count: msgCount } = await db
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', convId)
  if ((msgCount || 0) <= 1 && builder.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'ShipStacked <hello@shipstacked.com>',
        to: builder.email,
        subject: 'New message about your ShipStacked profile',
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
            <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f;">New message on ShipStacked</h2>
            <p style="color: #6e6e73; font-size: 14px; line-height: 1.6;">A hirer on ShipStacked sent you a message:</p>
            <div style="background: #f5f5f7; border-radius: 10px; padding: 1rem; margin: 1rem 0; font-size: 14px; color: #3d3d3f; line-height: 1.6;">${content}</div>
            <a href="${siteUrl}/messages?as=builder" style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500;">Reply on ShipStacked →</a>
          </div>
        `,
      })
    } catch (e) {
      console.error('v1/messages notification email failed:', e)
    }
  }

  return apiOk({ message, conversation_id: convId })
}
