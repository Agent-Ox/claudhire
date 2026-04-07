import { NextResponse } from 'next/server'
import { postJobToX } from '@/lib/xPost'

export async function POST(req: Request) {
  try {
    const job = await req.json()
    const result = await postJobToX(job)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('X post error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
