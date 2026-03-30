import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const product = session.metadata?.product || 'unknown'
    const email = session.customer_email 
      || session.customer_details?.email 
      || 'unknown@claudhire.com'

    let expiresAt = null
    if (product === 'job_post') {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      expiresAt = d.toISOString()
    }

    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from('subscriptions').insert([{
      email,
      stripe_customer_id: session.customer as string || 'test',
      stripe_session_id: session.id,
      product,
      status: 'active',
      expires_at: expiresAt
    }])

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}