import { getEntityModes } from '@/lib/user'

export async function canViewContact(profileEmail: string): Promise<boolean> {
  const { user, modes } = await getEntityModes()
  if (!user) return false
  if (user.email === profileEmail) return true // own profile
  if (modes.hirer) return true
  return false
}
