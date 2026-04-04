// Scout has been removed.
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'Scout has been removed.' }, { status: 410 })
}
