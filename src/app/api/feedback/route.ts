import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// In-dashboard hirer feedback -> operator email (INTAKE_NOTIFY_EMAIL).
// The sender email is included in the subject + body so the operator can reply
// directly; no DB capture (minimum viable — see Task 4 scope).
export async function POST(req: Request) {
  let body: { message?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const message = (body.message || '').trim()
  const email = (body.email || '').trim() || 'anonymous'

  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })
  if (message.length > 5000) return NextResponse.json({ error: 'Message too long' }, { status: 400 })

  const to = process.env.INTAKE_NOTIFY_EMAIL
  if (!to) {
    console.error('INTAKE_NOTIFY_EMAIL not configured — feedback dropped')
    return NextResponse.json({ error: 'Feedback channel not configured' }, { status: 500 })
  }

  try {
    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to,
      subject: `[ShipStacked Feedback] from ${email}`,
      text: `From: ${email}\nAt: ${new Date().toISOString()}\n\n${message}`,
    })
  } catch (e) {
    console.error('Feedback email failed:', e)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
