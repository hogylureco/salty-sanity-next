import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * No-JS success page. The `<form>` POST to /api/spotloc-signup 303-redirects
 * here on success, so signup works with scripting off. Fully static; no site
 * chrome (it's under the (landing) group, not (site)).
 */
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'You’re on the list — Spot Loc',
  robots: { index: false, follow: false },
}

export default function ThanksPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-body px-5 py-16">
      <div className="box w-full max-w-md text-center">
        <span className="font-mono text-lg font-bold tracking-tight text-header">
          SPOT<span className="text-green-dark"> LOC</span>
        </span>
        <h1 className="mt-6 font-mono text-2xl font-bold text-header">
          You’re on the list.
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink">
          We’ll email you the day Spot Loc is ready. No spam, just the launch.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/spotloc" className="text-red-dark hover:underline">
            Back to the page
          </Link>
        </p>
      </div>
    </main>
  )
}
