import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getDraft } from '@/lib/paste/draft'
import { getAtlasRoles } from '@/services/atlas-classifier/roles'
import ReviewForm from '@/components/paste/ReviewForm'

export const metadata: Metadata = {
  title: 'Review your receipt | ShipStacked',
  description: 'Review and edit before publishing.',
  robots: { index: false, follow: false },
}

// The draft_id (random UUID, 15-min TTL in Redis) is the capability token
// for viewing a draft. Anyone with a valid id can render the page. The
// stored draft retains user_id for Step 6's publish action, which will
// enforce ownership at write time.
export default async function PasteReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>
}) {
  const params = await searchParams
  const draftId = params.draft

  if (!draftId) {
    redirect('/paste')
  }

  const draft = await getDraft(draftId)
  if (!draft) {
    redirect('/paste')
  }

  const roles = getAtlasRoles()

  return <ReviewForm draftId={draftId} draft={draft} atlasRoles={roles} />
}
