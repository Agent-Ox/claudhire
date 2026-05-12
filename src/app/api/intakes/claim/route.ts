import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { rateLimit } from '@/lib/rateLimit'

const resend = new Resend(process.env.RESEND_API_KEY)

const ATLAS_ROLE_LABELS: Record<string, string> = {
  // Cluster A — Implementation & Deployment
  A1: 'A1 AI Integration Operator',
  A2: 'A2 Forward Deployed Engineer',
  A3: 'A3 AI Deployment Triage Specialist',
  A4: 'A4 Agent Workflow Implementer',
  A5: 'A5 Agent System Integrator',
  A6: 'A6 Deployment Strategist',
  A7: 'A7 Partner / Channel Solutions Architect',

  // Cluster B — Reliability & Operations
  B1: 'B1 AI Operations Engineer',
  B2: 'B2 Agent Reliability Engineer',
  B3: 'B3 AI Cost & Capacity Operator',
  B4: 'B4 AI Inference & Model Serving Reliability Engineer',

  // Cluster C — Governance, Risk & Compliance
  C1: 'C1 AI Audit & Conformity Lead',
  C2: 'C2 AI Risk & Policy Analyst',
  C3: 'C3 Model & Vendor Governance Manager',
  C4: 'C4 AI Agent Steward',
  C5: 'C5 AI Incident Responder',
  C6: 'C6 AI Red Team Lead',
  C7: 'C7 Data Provenance & Training-Data Compliance Officer',
  C8: 'C8 AI Procurement & Vendor Risk Assessor',
  C9: 'C9 Vulnerable User Protection Lead',

  // Cluster D — Design & Architecture
  D1: 'D1 AI Workflow Designer',
  D2: 'D2 Agent System Architect',
  D3: 'D3 Prompt and Context Engineer',
  D4: 'D4 Human-AI Handoff Designer',
  D5: 'D5 AI Evaluations Engineer',

  // Cluster E — Translation & Enablement
  E1: 'E1 AI Implementation Lead',
  E2: 'E2 AI Enablement Trainer',
  E3: 'E3 AI Translator',
  E4: 'E4 Fractional Head of AI',

  // Part II — Operators
  F1: 'F1 Solo Agent Operator',
  F2: 'F2 Boutique Agent Operator',
  F3: 'F3 Vertical Agent Operator',
  F4: 'F4 Function Agent Operator',
  F5: 'F5 Integration Agent Operator',
}

const ENGAGEMENT_VALUES = ['employed', 'fractional', 'operator', 'contract', 'not_looking'] as const
type EngagementValue = (typeof ENGAGEMENT_VALUES)[number]

const ENGAGEMENT_LABELS: Record<EngagementValue, string> = {
  employed: 'Employed',
  fractional: 'Fractional',
  operator: 'Operator',
  contract: 'Contract',
  not_looking: 'Not looking',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\//i
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

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  const out: string[] = []
  for (const item of v) {
    if (typeof item !== 'string') return null
    const trimmed = item.trim()
    if (trimmed) out.push(trimmed)
  }
  return out
}

function roleLabel(code: string): string {
  return ATLAS_ROLE_LABELS[code] ?? code
}

function optionalUrlValid(u: string | null): boolean {
  return !u || URL_RE.test(u)
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

    const name = asString(raw.name)
    const email = asString(raw.email)
    const location = asString(raw.location)
    const linkedin_url = asString(raw.linkedin_url)
    const github_url = asString(raw.github_url)
    const twitter_url = asString(raw.twitter_url)
    const website_url = asString(raw.website_url)
    const atlas_roles = asStringArray(raw.atlas_roles)
    const verticals = asStringArray(raw.verticals)
    const domain_practitioner =
      typeof raw.domain_practitioner === 'boolean' ? raw.domain_practitioner : false
    const domain_field = asString(raw.domain_field)
    const proof_of_work = asString(raw.proof_of_work)
    const engagement_modes = asStringArray(raw.engagement_modes)
    const comp_expectation = asString(raw.comp_expectation)
    const notes = asString(raw.notes)

    const valid =
      !!name && name.length <= 200 &&
      !!email && EMAIL_RE.test(email) && email.length <= 320 &&
      (!location || location.length <= 200) &&
      optionalUrlValid(linkedin_url) &&
      optionalUrlValid(github_url) &&
      optionalUrlValid(twitter_url) &&
      optionalUrlValid(website_url) &&
      !!atlas_roles && atlas_roles.length >= 1 && atlas_roles.length <= 10 &&
      atlas_roles.every((r) => r.length <= 50) &&
      (!verticals || verticals.length <= 10) &&
      (!domain_field || domain_field.length <= 200) &&
      !!proof_of_work && proof_of_work.length >= 100 && proof_of_work.length <= 3000 &&
      !!engagement_modes && engagement_modes.length >= 1 &&
      engagement_modes.every((m) => (ENGAGEMENT_VALUES as readonly string[]).includes(m)) &&
      (!comp_expectation || comp_expectation.length <= 500) &&
      (!notes || notes.length <= 1000)

    if (!valid) {
      return NextResponse.json({ ok: false, error: GENERIC_BAD_REQUEST }, { status: 400 })
    }

    const normalizedEmail = email!.toLowerCase()
    const { success } = await rateLimit(`claim_intake:${normalizedEmail}`, 86400, 3)
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
      .from('claim_submissions')
      .insert({
        name,
        email: normalizedEmail,
        location: location || null,
        linkedin_url: linkedin_url || null,
        github_url: github_url || null,
        twitter_url: twitter_url || null,
        website_url: website_url || null,
        atlas_roles: atlas_roles!,
        verticals: verticals && verticals.length ? verticals : null,
        domain_practitioner,
        domain_field: domain_field || null,
        proof_of_work,
        engagement_modes: engagement_modes!,
        comp_expectation: comp_expectation || null,
        notes: notes || null,
        user_agent,
        referrer,
      })
      .select()
      .single()

    if (insertError || !inserted) {
      console.error('claim_submissions insert error:', insertError)
      return NextResponse.json(
        { ok: false, error: 'Something went wrong on our end. Please try again or email hello@shipstacked.com.' },
        { status: 500 },
      )
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'
    const primaryRoleLabel = roleLabel(atlas_roles![0])

    const autoResponse = resend.emails.send({
      from: 'ShipStacked <hello@shipstacked.com>',
      to: normalizedEmail,
      subject: 'Got your claim — you\'re in',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem; background: #fbfbfd;">
          <h2 style="font-size: 22px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 1rem;">You're in the Atlas.</h2>
          <p style="color: #3d3d3f; font-size: 15px; line-height: 1.65; margin-bottom: 1rem;">
            Hi ${escapeHtml(name!)} — got your claim. You're now in the pool of practitioners I route to companies hiring for the role(s) you claimed.
          </p>
          <p style="color: #3d3d3f; font-size: 15px; line-height: 1.65; margin-bottom: 1rem;">
            What happens next: I review your proof of work and reach out within a few days if I'd like a 30-min call to learn more about your work. The bar is real — not every claim becomes routable. If your work fits something I'm currently routing for, you'll hear from me sooner than that.
          </p>
          <p style="color: #3d3d3f; font-size: 15px; line-height: 1.65; margin-bottom: 1.5rem;">
            No exclusivity. No obligation. You can ask to be removed at any time by replying to this email.
          </p>
          <p style="color: #1d1d1f; font-size: 15px; line-height: 1.65; margin-bottom: 1.5rem;">
            Talk soon,<br>Thomas
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e5; margin: 1.5rem 0;">
          <p style="font-size: 13px; color: #6e6e73;">
            <a href="${siteUrl}/atlas" style="color: #0071e3; text-decoration: none;">Read the Atlas →</a>
          </p>
        </div>
      `,
    })

    const notifyEmail = process.env.INTAKE_NOTIFY_EMAIL

    const linkRow = (label: string, url: string | null) =>
      url
        ? `<tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">${label}</td><td style="padding: 6px 0;"><a href="${escapeHtml(url)}" style="color:#0071e3;text-decoration:none;">${escapeHtml(url)}</a></td></tr>`
        : ''

    const rolesHtml = atlas_roles!
      .map((code) => `<li style="margin-bottom: 0.25rem;">${escapeHtml(roleLabel(code))}</li>`)
      .join('')

    const verticalsRow =
      verticals && verticals.length
        ? `<tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">Verticals</td><td style="padding: 6px 0;">${verticals.map((v) => escapeHtml(v)).join(', ')}</td></tr>`
        : ''

    const domainRow = domain_practitioner
      ? `<tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">Domain practitioner</td><td style="padding: 6px 0;">Yes${domain_field ? ` — ${escapeHtml(domain_field)}` : ''}</td></tr>`
      : ''

    const engagementLabels = engagement_modes!
      .map((m) => ENGAGEMENT_LABELS[m as EngagementValue] ?? m)
      .join(', ')

    const compRow = comp_expectation
      ? `<tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">Comp</td><td style="padding: 6px 0;">${escapeHtml(comp_expectation)}</td></tr>`
      : ''

    const notesBlock = notes
      ? `<h3 style="font-size: 13px; font-weight: 600; color: #1d1d1f; letter-spacing: 0.02em; text-transform: uppercase; margin: 1.5rem 0 0.5rem;">Notes</h3><blockquote style="background: #f5f5f7; border-left: 3px solid #6e6e73; border-radius: 6px; padding: 0.875rem 1rem; margin: 0; font-size: 14px; color: #3d3d3f; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(notes)}</blockquote>`
      : ''

    const locationRow = location
      ? `<tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">Location</td><td style="padding: 6px 0;">${escapeHtml(location)}</td></tr>`
      : ''

    const notify = notifyEmail
      ? resend.emails.send({
          from: 'ShipStacked <hello@shipstacked.com>',
          to: notifyEmail,
          subject: `🟢 New claim — ${name} (${primaryRoleLabel})`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 2rem; background: #fbfbfd;">
              <h2 style="font-size: 20px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 1.25rem;">New claim</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #3d3d3f;">
                <tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; width: 110px; vertical-align: top;">Name</td><td style="padding: 6px 0;">${escapeHtml(name!)}</td></tr>
                <tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(normalizedEmail)}" style="color:#0071e3;text-decoration:none;">${escapeHtml(normalizedEmail)}</a></td></tr>
                ${locationRow}
                ${linkRow('LinkedIn', linkedin_url)}
                ${linkRow('GitHub', github_url)}
                ${linkRow('Twitter', twitter_url)}
                ${linkRow('Website', website_url)}
                <tr><td style="padding: 6px 12px 6px 0; color: #6e6e73; vertical-align: top;">Engagement</td><td style="padding: 6px 0;">${escapeHtml(engagementLabels)}</td></tr>
                ${compRow}
                ${verticalsRow}
                ${domainRow}
              </table>

              <h3 style="font-size: 13px; font-weight: 600; color: #1d1d1f; letter-spacing: 0.02em; text-transform: uppercase; margin: 1.5rem 0 0.5rem;">Claimed roles</h3>
              <ul style="margin: 0; padding-left: 1.25rem; font-size: 14px; color: #3d3d3f; line-height: 1.6;">${rolesHtml}</ul>

              <h3 style="font-size: 13px; font-weight: 600; color: #1d1d1f; letter-spacing: 0.02em; text-transform: uppercase; margin: 1.5rem 0 0.5rem;">Proof of work</h3>
              <blockquote style="background: #f5f5f7; border-left: 3px solid #0071e3; border-radius: 6px; padding: 0.875rem 1rem; margin: 0; font-size: 14px; color: #3d3d3f; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(proof_of_work!)}</blockquote>

              ${notesBlock}

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
      console.error('claim intake auto-response email failed:', autoRes)
    }
    if (notifyRes instanceof Error) {
      console.error('claim intake notify email failed:', notifyRes)
    }
    if (!notifyEmail) {
      console.error('claim intake: INTAKE_NOTIFY_EMAIL is not set; notification skipped')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('claim intake POST unexpected error:', err)
    return NextResponse.json(
      { ok: false, error: 'Something went wrong on our end. Please try again or email hello@shipstacked.com.' },
      { status: 500 },
    )
  }
}
