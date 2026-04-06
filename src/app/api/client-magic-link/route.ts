import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

    // Only send if account exists
    const { data: users } = await admin.auth.admin.listUsers()
    const existing = users?.users?.find(u => u.email === email)
    if (!existing) {
      // Return success anyway — don't reveal if email exists
      return NextResponse.json({ success: true })
    }

    const { data } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${siteUrl}/auth/callback?redirect_to=/client/inbox` }
    })

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const magicLink = data?.properties?.action_link || `${siteUrl}/client/inbox`

    await resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: email,
      subject: 'Your ShipStacked inbox link',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; margin-bottom: 0.5rem;">Here is your inbox link</h2>
          <p style="color: #6e6e73; font-size: 14px; line-height: 1.6; margin-bottom: 1.5rem;">
            Click below to access your ShipStacked enquiries. No password needed.
          </p>
          <a href="${magicLink}" style="display: inline-block; padding: 0.75rem 1.5rem; background: #0071e3; color: white; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: 500;">
            Open my inbox →
          </a>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;" />
          <p style="color: #aeaeb2; font-size: 12px;">ShipStacked — The proof-of-work platform for AI-native builders.</p>
        </div>
      `
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
