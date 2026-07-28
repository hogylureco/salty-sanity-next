import type { Metadata } from 'next'

import { AppShotPlaceholder } from '@/components/spotloc/AppShotPlaceholder'
import { DeferredIslands } from '@/components/spotloc/DeferredIslands'
import { SignupForm } from '@/components/spotloc/SignupForm'
import {
  Authority,
  Faq,
  Mechanism,
  Problem,
  RealDay,
  Reframe,
} from '@/components/spotloc/sections'
import { SITE_URL } from '@/lib/taxonomy'

/* ============================ A/B VARIANTS — edit here ============================
 * Three genuinely different bets. `?variant=b|c` forces one (point an ad split at
 * it); the shown id rides on every analytics event so a test is attributable.
 * Default = variant A, server-rendered. Headlines are swapped before paint by the
 * inline script below; CTA labels resolve client-side (useVariant) so they survive
 * re-renders. Change copy in ONE place: this block.
 * -------------------------------------------------------------------------------- */
const DEFAULT_VARIANT = 'a'

const HEADLINES: Record<string, string> = {
  a: 'Show up already knowing where to be.', // the outcome
  b: 'You, plus Spot Loc: a 40-year local on day one.', // the identity
  c: 'Quit running the day from six weather apps.', // the pain
}

const CTA_LABELS: Record<string, string> = {
  a: 'Get on the list',
  b: 'Get early access',
  c: 'Notify me at launch',
}
/* ================================================================================ */

// Fully static prerender (no dynamic APIs, no runtime data). Confirmed ○ Static.
export const dynamic = 'force-static'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Spot Loc — show up already knowing where to be',
  description:
    'The companion app to Salty Cape. All the data in one place — tides, currents, marine forecasts, wind, radar, water temp — run through forty years of Cape Cod local knowledge. Get on the launch list.',
  alternates: { canonical: '/spotloc' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: '/spotloc',
    title: 'Spot Loc — show up already knowing where to be',
    description:
      'All the data in one place, run through forty years of local knowledge. The companion app to Salty Cape. Get on the launch list.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spot Loc — show up already knowing where to be',
    description:
      'All the data in one place, run through forty years of local knowledge. Get on the launch list.',
  },
}

// Runs synchronously during parse, before first paint (flash-prevention pattern):
// sets the variant on <html> and rewrites the static headline for a forced ?variant.
const variantScript = `(function(){try{var H=${JSON.stringify(
  HEADLINES,
)},d=${JSON.stringify(
  DEFAULT_VARIANT,
)},p=new URLSearchParams(location.search).get('variant'),v=(p&&H[p])?p:d;document.documentElement.dataset.variant=v;if(v!==d){var run=function(){var h=document.querySelector('[data-variant-headline]');if(h)h.textContent=H[v];};run();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);}}catch(e){}})();`

export default function SpotLocLandingPage() {
  return (
    <>
      <main className="bg-body">
        {/* 1 — Hero */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-14 pt-14 sm:pb-20 sm:pt-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-widest text-green-dark">
                A Salty Cape app · Launching soon
              </p>
              {/* min-height reserves the tallest headline so a variant swap can't
                  shift layout below it (CLS-safe). */}
              <div className="mt-4 min-h-[132px] sm:min-h-[168px]">
                <h1
                  data-variant-headline
                  suppressHydrationWarning
                  className="font-mono text-3xl font-bold leading-[1.1] text-header sm:text-5xl"
                >
                  {HEADLINES[DEFAULT_VARIANT]}
                </h1>
              </div>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink sm:text-lg">
                All the data in one place — tides, currents, marine forecasts,
                wind, radar, water temp — run through forty years of local
                knowledge. You stop guessing and start fishing the window.
              </p>
              <div id="hero-signup" className="mt-7 max-w-xl">
                <SignupForm section="hero" ctaLabels={CTA_LABELS} defaultCta={CTA_LABELS[DEFAULT_VARIANT]} />
              </div>
            </div>

            {/* Text (incl. the H1/LCP element) comes first on mobile so it
                paints at the top; visual sits right on desktop. */}
            <div>
              <AppShotPlaceholder caption="Spot Loc, open on the water" phone />
            </div>
          </div>
        </section>

        {/* Variant init — placed right after the hero so the H1 exists and swaps
            before paint for a forced ?variant. */}
        <script dangerouslySetInnerHTML={{ __html: variantScript }} />

        {/* 2–7 */}
        <Problem />
        <Reframe />
        <Mechanism />
        <RealDay />
        <Authority />
        <Faq />

        {/* 8 — Final CTA: restate the promise, then the SAME form + button. */}
        <section className="bg-box py-16 sm:py-24">
          <div className="mx-auto w-full max-w-3xl px-5 text-center">
            <p className="font-mono text-lg leading-relaxed text-header sm:text-xl">
              Weather says where. Timing says when. Best Bets say what and how.
              TripTix puts it on one sheet. Troubleshooting keeps you in them when
              it’s hard.
            </p>
            <h2 className="mt-8 font-mono text-2xl font-bold text-header sm:text-3xl">
              Get on the list.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[16px] text-ink">
              We’ll email you the day Spot Loc is ready.
            </p>
            <div id="final-signup" className="mx-auto mt-6 max-w-xl text-left">
              <SignupForm section="final" ctaLabels={CTA_LABELS} defaultCta={CTA_LABELS[DEFAULT_VARIANT]} />
            </div>
          </div>
        </section>
        {/* Footer + primary nav come from the shared (site) layout chrome. */}
      </main>

      <DeferredIslands ctaLabels={CTA_LABELS} defaultCta={CTA_LABELS[DEFAULT_VARIANT]} />
    </>
  )
}
