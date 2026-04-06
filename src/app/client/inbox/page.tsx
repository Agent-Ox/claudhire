import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ClientInboxClient from './ClientInboxClient'
import ClientInboxGate from './ClientInboxGate'

export default async function ClientInboxPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <ClientInboxGate />

  const role = user.user_metadata?.role
  if (role && role !== 'client') {
    if (role === 'builder') redirect('/messages')
    if (role === 'employer') redirect('/employer/messages')
  }

  return <ClientInboxClient userEmail={user.email!} userName={user.user_metadata?.full_name || ''} />
}
