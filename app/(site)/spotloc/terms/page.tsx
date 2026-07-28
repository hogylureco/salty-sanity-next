import type { Metadata } from 'next'
import Link from 'next/link'

/** Placeholder so the footer link resolves (no fabricated legal text). Replace
 *  with the real terms before launch. */
export const dynamic = 'force-static'
export const metadata: Metadata = {
  title: 'Terms — Spot Loc',
  robots: { index: false, follow: false },
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-16">
      <h1 className="font-mono text-2xl font-bold text-header">Terms</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-ink">
        This page is a pre-launch waitlist. Getting on the list signs you up for
        one launch email — nothing more. The full terms of service publish with
        the app. Charts and conditions shown in Spot Loc are for reference, not
        navigation.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/spotloc" className="text-red-dark hover:underline">
          Back to the page
        </Link>
      </p>
    </main>
  )
}
