import { createServerSupabaseClient } from './supabase-server'

export type EntityModes = {
  builder: boolean
  hirer: boolean
  client: boolean
  admin: boolean
}

export type ResolvedUser = {
  user: any | null
  modes: EntityModes
  hasProfile: boolean
  hasSubscription: boolean
  profile: any | null
  subscription: any | null
}

const EMPTY_MODES: EntityModes = { builder: false, hirer: false, client: false, admin: false }

export async function getEntityModes(): Promise<ResolvedUser> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { user: null, modes: EMPTY_MODES, hasProfile: false, hasSubscription: false, profile: null, subscription: null }
    }

    const now = new Date().toISOString()

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('email', user.email)
      .eq('status', 'active')
      .eq('product', 'full_access')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      // Belt-and-suspenders: even if a lifecycle event was missed and status
      // is still 'active', access expires at the paid-through period end.
      // Backwards-compatible — existing rows have NULL current_period_end.
      .or(`current_period_end.is.null,current_period_end.gt.${now}`)
      .maybeSingle()

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    const hasSubscription = !!subscription
    const hasProfile = !!profile

    // Phase 2 (rollover from Phase 1 Item 8): surface email/auth drift early.
    // If a user has a profile but no active sub, AND the profile has a user_id,
    // log so we can spot mismatch before paying-customer issues hit support.
    if (!hasSubscription && hasProfile && profile?.user_id) {
      console.warn(`[getEntityModes] user ${user.id} (email=${user.email}) has profile but no active subscription — verify email match if expected as paying customer`)
    }

    const metaRole = user.user_metadata?.role

    const modes: EntityModes = {
      builder: hasProfile,
      hirer: hasSubscription,
      client: metaRole === 'client',
      admin: metaRole === 'admin',
    }

    return { user, modes, hasProfile, hasSubscription, profile, subscription }
  } catch {
    return { user: null, modes: EMPTY_MODES, hasProfile: false, hasSubscription: false, profile: null, subscription: null }
  }
}
