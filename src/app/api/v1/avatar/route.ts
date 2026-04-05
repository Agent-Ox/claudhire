import { authenticateApiKey, apiError, apiOk } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/v1/avatar
// Accepts either:
//   { image_base64: "data:image/jpeg;base64,/9j/4AAQ..." }  — base64 encoded image
//   { image_url: "https://example.com/photo.jpg" }          — public URL to fetch and upload
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)

  const { profile } = auth.auth
  const db = admin()

  let body: any
  try {
    body = await req.json()
  } catch {
    return apiError(400, 'Invalid JSON body')
  }

  let buffer: Buffer
  let contentType: string
  let ext: string

  if (body.image_base64) {
    // Handle base64 data URI: data:image/jpeg;base64,/9j/4AAQ...
    const dataUri = body.image_base64 as string
    const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!match) {
      return apiError(400, 'Invalid base64 image. Format: data:image/jpeg;base64,...')
    }
    contentType = match[1]
    ext = contentType.split('/')[1].replace('jpeg', 'jpg')
    buffer = Buffer.from(match[2], 'base64')

  } else if (body.image_url) {
    // Fetch image from URL
    let fetchRes: Response
    try {
      fetchRes = await fetch(body.image_url)
      if (!fetchRes.ok) return apiError(400, `Could not fetch image from URL: ${fetchRes.status}`)
    } catch {
      return apiError(400, 'Could not fetch image from URL')
    }
    contentType = fetchRes.headers.get('content-type') || 'image/jpeg'
    // Normalise content type
    if (!contentType.startsWith('image/')) contentType = 'image/jpeg'
    ext = contentType.split('/')[1].replace('jpeg', 'jpg')
    const arrayBuffer = await fetchRes.arrayBuffer()
    buffer = Buffer.from(arrayBuffer)

  } else {
    return apiError(400, 'Provide either image_base64 or image_url')
  }

  // Validate type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(contentType)) {
    return apiError(400, 'Invalid image type. Use JPG, PNG, or WebP.')
  }

  // Validate size — 5MB max
  if (buffer.length > 5 * 1024 * 1024) {
    return apiError(400, 'Image too large. Max 5MB.')
  }

  const filename = `${profile.user_id || profile.id}.${ext}`

  const { error: uploadError } = await db.storage
    .from('avatars')
    .upload(filename, buffer, {
      contentType,
      upsert: true,
    })

  if (uploadError) return apiError(500, 'Upload failed', uploadError.message)

  const { data: { publicUrl } } = db.storage
    .from('avatars')
    .getPublicUrl(filename)

  // Update profile avatar_url
  await db
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', profile.id)

  return apiOk({
    avatar_uploaded: true,
    avatar_url: publicUrl,
  })
}
