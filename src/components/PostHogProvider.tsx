'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

// Cookieless, privacy-respecting init. Run at module scope (client only) so the
// singleton is ready before any child component fires a capture — React runs
// child effects before parent effects, so an in-effect init would miss the
// first mount events.
if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY &&
  !(posthog as any).__loaded
) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only', // no anonymous person profiles (privacy)
    capture_pageview: false,            // handled manually below for App Router
    disable_session_recording: true,    // off by default (no consent banner)
  })
}

// App Router doesn't full-page-load on client navigation, so capture $pageview
// on pathname/search changes. useSearchParams requires a Suspense boundary.
function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    let url = window.origin + pathname
    const qs = searchParams?.toString()
    if (qs) url += '?' + qs
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
