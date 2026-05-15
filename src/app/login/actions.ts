'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

function safeReturnToPaste(returnTo: string | null, pastedUrl: string | null): string | null {
  if (!returnTo) return null
  if (!returnTo.startsWith('/paste')) return null
  if (returnTo.includes('://')) return null
  if (/[\r\n\x00-\x1f]/.test(returnTo)) return null
  if (!pastedUrl) return returnTo
  if (/[\r\n\x00-\x1f]/.test(pastedUrl)) return returnTo
  const sep = returnTo.includes('?') ? '&' : '?'
  return `${returnTo}${sep}pasted_url=${encodeURIComponent(pastedUrl)}`
}

export async function login(formData: FormData) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('email', user.email!)

  // /paste round-trip: if the user came in with a return_to=/paste hint
  // (set by /paste when sending an unauthed visitor here), honor it ahead
  // of role-based routing. Guarded against open-redirect by safeReturnToPaste.
  const returnToTarget = safeReturnToPaste(
    formData.get('return_to') as string | null,
    formData.get('pasted_url') as string | null,
  )
  if (returnToTarget) redirect(returnToTarget)

  // Role-based redirect
  const metaRole = user.user_metadata?.role

  if (metaRole === 'admin') {
    redirect('/admin')
  }

  if (metaRole === 'employer') {
    redirect('/employer')
  }

  // Check subscription (employer who paid before role was set)
  const now = new Date().toISOString()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('email', user.email)
    .eq('status', 'active')
    .eq('product', 'full_access')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()

  if (sub) {
    redirect('/employer')
  }

  redirect('/dashboard')
}
