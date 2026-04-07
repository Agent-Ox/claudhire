import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { comment_id } = await req.json()
  if (!comment_id) return NextResponse.json({ error: 'comment_id required' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if already liked
  const { data: existing } = await admin
    .from('comment_likes')
    .select('id')
    .eq('comment_id', comment_id)
    .eq('user_email', user.email)
    .maybeSingle()

  if (existing) {
    // Unlike
    await admin.from('comment_likes').delete().eq('id', existing.id)
    const { data: comment } = await admin
      .from('post_comments')
      .update({ likes_count: admin.rpc('greatest', { a: 0, b: -1 }) })
      .eq('id', comment_id)
      .select('likes_count')
      .single()
    // Decrement manually
    const { data: cur } = await admin.from('post_comments').select('likes_count').eq('id', comment_id).single()
    const newCount = Math.max(0, (cur?.likes_count || 1) - 1)
    await admin.from('post_comments').update({ likes_count: newCount }).eq('id', comment_id)
    return NextResponse.json({ liked: false, likes_count: newCount })
  } else {
    // Like
    await admin.from('comment_likes').insert({ comment_id, user_email: user.email })
    const { data: cur } = await admin.from('post_comments').select('likes_count').eq('id', comment_id).single()
    const newCount = (cur?.likes_count || 0) + 1
    await admin.from('post_comments').update({ likes_count: newCount }).eq('id', comment_id)
    return NextResponse.json({ liked: true, likes_count: newCount })
  }
}

// GET — fetch which comments current user has liked
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const post_id = searchParams.get('post_id')
  if (!post_id) return NextResponse.json({ liked_ids: [] })

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ liked_ids: [] })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all comment ids for this post that this user has liked
  const { data: comments } = await admin
    .from('post_comments')
    .select('id')
    .eq('post_id', post_id)

  const commentIds = (comments || []).map((c: any) => c.id)
  if (!commentIds.length) return NextResponse.json({ liked_ids: [] })

  const { data: likes } = await admin
    .from('comment_likes')
    .select('comment_id')
    .eq('user_email', user.email)
    .in('comment_id', commentIds)

  return NextResponse.json({ liked_ids: (likes || []).map((l: any) => l.comment_id) })
}
