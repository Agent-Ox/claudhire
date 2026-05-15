import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── Content negotiation for V2 public surfaces ─────────────────────────
// /p/<slug>.json                       → /api/p/<slug>/jsonld
// /atlas/roles/<id>.json               → /api/atlas/roles/<id>/jsonld?v=...
// /p/<slug>           with Accept: application/ld+json → /api/p/<slug>/jsonld
// /atlas/roles/<id>   with Accept: application/ld+json → /api/atlas/roles/<id>/jsonld?v=...
// Bails before the auth gate when a rewrite fires — JSON-LD endpoints are
// public reads gated downstream by visibility (receipts) / RLS (atlas).
function tryContentNegotiation(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl
  const accept = request.headers.get('accept') || ''
  const wantsJsonLd =
    accept.includes('application/ld+json') ||
    accept.includes('application/vnd.shipstacked.receipt+json')

  const receiptJsonMatch = pathname.match(/^\/p\/([^/]+)\.json$/)
  if (receiptJsonMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/p/${receiptJsonMatch[1]}/jsonld`
    return NextResponse.rewrite(url)
  }
  const atlasJsonMatch = pathname.match(/^\/atlas\/roles\/([^/]+)\.json$/)
  if (atlasJsonMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/atlas/roles/${atlasJsonMatch[1]}/jsonld`
    url.search = search
    return NextResponse.rewrite(url)
  }

  if (wantsJsonLd) {
    const receiptMatch = pathname.match(/^\/p\/([^/]+)$/)
    if (receiptMatch) {
      const url = request.nextUrl.clone()
      url.pathname = `/api/p/${receiptMatch[1]}/jsonld`
      return NextResponse.rewrite(url)
    }
    const atlasMatch = pathname.match(/^\/atlas\/roles\/([^/]+)$/)
    if (atlasMatch) {
      const url = request.nextUrl.clone()
      url.pathname = `/api/atlas/roles/${atlasMatch[1]}/jsonld`
      url.search = search
      return NextResponse.rewrite(url)
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  const negotiated = tryContentNegotiation(request)
  if (negotiated) return negotiated

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl

  // Routes that require auth — /talent is PUBLIC (handles its own access tiers server-side)
  const authRequired = ['/dashboard', '/post-job', '/admin', '/employer/', '/employer/messages', '/messages', '/client']
  const isProtected = authRequired.some(route => pathname.startsWith(route))

  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Employer-only routes — if builder tries to access, redirect to dashboard
  const employerOnly = ['/employer', '/post-job']
  if (session && employerOnly.some(route => pathname.startsWith(route))) {
    const metaRole = session.user.user_metadata?.role
    // Only redirect if explicitly a builder (not employer)
    if (metaRole === 'builder') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Builder-only routes — if employer tries to access dashboard, redirect to employer
  if (session && pathname.startsWith('/dashboard')) {
    const metaRole = session.user.user_metadata?.role
    if (metaRole === 'employer') {
      const url = request.nextUrl.clone()
      url.pathname = '/employer'
      return NextResponse.redirect(url)
    }
  }

  // Client-only routes — redirect clients away from builder/employer routes
  if (session && session.user.user_metadata?.role === 'client') {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/messages')) {
      const url = request.nextUrl.clone()
      url.pathname = '/client/inbox'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|og-default.svg|api).*)',
  ],
}
