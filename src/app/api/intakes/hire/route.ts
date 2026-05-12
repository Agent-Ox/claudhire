import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { rateLimit } from '@/lib/rateLimit'

const resend = new Resend(process.env.RESEND_API_KEY)

const URGENCY_VALUES = ['this_month', 'this_quarter', 'within_6_months', 'exploring'] as const
const BUDGET_VALUES = ['under_50k', '50k_200k', '200k_500k', '500k_plus', 'discuss'] as const

const URGENCY_LABELS: Record<(typeof URGENCY_VALUES)[number], string> = {
  this_month: 'This month',
  this_quarter: 'This quarter',
  within_6_months: 'Within 6 months',
  exploring: 'Exploring',
}

const BUDGET_LABELS: Record<(typeof BUDGET_VALUES)[number], string> = {
  under_50k: 'Under $50K',
  '50k_200k': '$50K–$200K',
  '200k_500k': '$200K–$500K',
  '500k_plus': '$500K+',
  discuss: 'Need to discuss',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GENERIC_BAD_REQUEST = 'Invalid request. Please check your entries and try again.'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v.trim() : null
}

export async function POST(req: Request) {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ ok: false, error: GENERIC_BAD_REQUEST }, { status: 400 })
    }

    const raw = body as Record<string, unknown>
    const symptom = asString(raw.symptom)
    const prior_role_title = asString(raw.prior_role_title)
    const urgency = asString(raw.urgency)
    const budget = asString(raw.budget)
    const email = asString(raw.email)
    const name = asString(raw.name)
    const company = asString(raw.company)
    const role = asString(raw.role)
    const linkedin_url = asString(raw.linkedin_url)

    const valid =
      !!symptom && symptom.length >= 200 && symptom.length <= 2000 &&
      !!urgency && (URGENCY_VALUES as readonly string[]).includes(urgency) &&
      !!budget && (BUDGET_VALUES as readonly string[]).includes(budget) &&
      !!email && EMAIL_RE.test(email) && email.length <= 320 &&
      !!name && name.length <= 200 &&
      !!company && company.length <= 200 &&
      !!role && role.length <= 200 &&
      (!linkedin_url || /^https?:\/\//i.test(linkedin_url)) &&
      (!prior_role_title || prior_role_title.length <= 200)

    if (!valid) {
      return NextResponse.json({ ok: false, error: GENERIC_BAD_REQUEST }, { status: 400 })
    }

    const normalizedEmail = email!.toLowerCase()
    const { success } = await rateLimit(`hire_intake:${normalizedEmail}`, 86400, 3)
    if (!success) {
      return NextResponse.json(
        { ok: false, error: 'You\'ve submitted a few times recently. Please email hello@shipstacked.com directly.' },
        { status: 429 },
      )
    }

    const user_agent = req.headers.get('user-agent') || null
    const referrer = req.headers.get('referer') || null

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: inserted, error: insertError } = await admin
      .from('hire_intakes')
      .insert({
        symptom,
        prior_role_title: prior_role_title || null,
        urgency,
        budget,
        email: normalizedEmail,
        name,
        company,
        role,
        linkedin_url: linkedin_url || null,
        user_agent,
        referrer,
      })
      .select()
      .single()

    if (insertError || !inserted) {
      console.error('hire_intakes insert error:', insertError)
      return NextResponse.json(
        { ok: false, error: 'Something went wrong on our end. Please try again or email hello@shipstacked.com.' },
        { status: 500 },
      )
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'
    const urgencyLabel = URGENCY_LABELS[urgency as (typeof URGENCY_VALUES)[number]]
    const budgetLabel = BUDGET_LABELS[budget as (typeof BUDGET_VALUES)[number]]

    const autoResponse = resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: normalizedEmail,
      subject: 'Got it — I\'ll come back to you within 24 hours',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem; background: #fbfbfd;">
          <h2 style="font-size: 22px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 1rem;">Got it.</h2>
          <p style="color: #3d3d3f; font-size: 15px; line-height: 1.65; margin-bottom: 1rem;">
            Hi ${escapeHtml(name!)} — got your message. I read every one of these myself, usually within a few hours of when it comes in.
          </p>
          <p style="color: #3d3d3f; font-size: 15px; line-height: 1.65; margin-bottom: 1rem;">
            I'll come back to you within 24 hours with three things: (1) what I think you're actually hiring for — often different from the role you'd post. (2) two or three specific humans I'd put in front of you for this. (3) what it would cost and how I'd run the engagement.
          </p>
          <p style="color: #3d3d3f; font-size: 15px; line-height: 1.65; margin-bottom: 1.5rem;">
            If I think you don't need me for this, I'll tell you that too and point you somewhere useful.
          </p>
          <p style="color: #1d1d1f; font-size: 15px; line-height: 1.65; margin-bottom: 1.5rem;">
            Talk soon,<br>Thomas
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;">
          <p style="font-size: 13px; color: #6e6e73;">
            <a href="${siteUrl}/atlas" style="color: #0071e3; text-decoration: none;">Read the Atlas while you wait →</a>
          </p>
        </div>
      `,
    })

    const notifyEmail = process.env.INTAKE_NOTIFY_EMAIL
    const linkedinRow = linkedin_url
      ? `<tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">LinkedIn</td><td style="padding: 6px 0;"><a href="${escapeHtml(linkedin_url)}" style="color:#0071e3;text-decoration:none;">${escapeHtml(linkedin_url)}</a></td></tr>`
      : ''
    const priorRoleRow = prior_role_title
      ? `<tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">Prior role</td><td style="padding: 6px 0;">${escapeHtml(prior_role_title)}</td></tr>`
      : ''

    const notify = notifyEmail
      ? resend.emails.send({
          from: 'ShipStacked <hello@shipstacked.com>',
          to: notifyEmail,
          subject: `🔔 New hire intake — ${company} (${urgencyLabel.toLowerCase()})`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 2rem; background: #fbfbfd;">
              <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 1.25rem;">New hire intake</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #3d3d3f;">
                <tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; width: 110px; vertical-align: top;">Name</td><td style="padding: 6px 0;">${escapeHtml(name!)}</td></tr>
                <tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(normalizedEmail)}" style="color:#0071e3;text-decoration:none;">${escapeHtml(normalizedEmail)}</a></td></tr>
                <tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">Company</td><td style="padding: 6px 0;">${escapeHtml(company!)}</td></tr>
                <tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">Role</td><td style="padding: 6px 0;">${escapeHtml(role!)}</td></tr>
                ${linkedinRow}
                <tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">Urgency</td><td style="padding: 6px 0;">${urgencyLabel}</td></tr>
                <tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">Budget</td><td style="padding: 6px 0;">${budgetLabel}</td></tr>
                ${priorRoleRow}
              </table>
              <h3 style="font-size: 13px; font-weight: 600; color: #1d1d1f; letter-spacing: 0.02em; text-transform: uppercase; margin: 1.5rem 0 0.5rem;">Symptom</h3>
              <blockquote style="background: #f5f5f7; border-left: 3px solid #0071e3; border-radius: 6px; padding: 0.875rem 1rem; margin: 0; font-size: 14px; color: #3d3d3f; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(symptom!)}</blockquote>
              <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;">
              <p style="font-size: 13px; color: #6e6e73;">
                <a href="${siteUrl}/admin/intakes" style="color: #0071e3; text-decoration: none;">Open in admin →</a>
              </p>
              <p style="font-size: 11px; color: #aeaeb2; font-family: ui-monospace, monospace;">id: ${inserted.id}</p>
            </div>
          `,
        })
      : Promise.resolve(null)

    const [autoRes, notifyRes] = await Promise.all([
      autoResponse.catch((err: unknown) => err),
      notify.catch((err: unknown) => err),
    ])

    if (autoRes instanceof Error) {
      console.error('hire intake auto-response email failed:', autoRes)
    }
    if (notifyRes instanceof Error) {
      console.error('hire intake notify email failed:', notifyRes)
    }
    if (!notifyEmail) {
      console.error('hire intake: INTAKE_NOTIFY_EMAIL is not set; notification skipped')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('hire intake POST unexpected error:', err)
    return NextResponse.json(
      { ok: false, error: 'Something went wrong on our end. Please try again or email hello@shipstacked.com.' },
      { status: 500 },
    )
  }
}
