import type { Metadata } from 'next'
import Link from 'next/link'

/** Placeholder so the footer link resolves (no fabricated legal text). Replace
 *  with the real policy before launch. */
export const dynamic = 'force-static'
export const metadata: Metadata = {
  title: 'Privacy — Spot Loc',
  robots: { index: false, follow: false },
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-16">
      <h1 className="font-mono text-2xl font-bold text-header">Privacy</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-ink">
        We collect the email you give us for one reason: to tell you when Spot
        Loc launches. We don’t sell it. The full privacy policy publishes with
        the app.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/spotloc" className="text-red-dark hover:underline">
          Back to the page
        </Link>
      </p>
    </main>
  )
}
