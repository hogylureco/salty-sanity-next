import Link from 'next/link'

import { AppShotPlaceholder } from './AppShotPlaceholder'

/**
 * Static, server-rendered sections for the Spot Loc landing page, in argument
 * order: problem → reframe → mechanism → a real day → authority → objections.
 * Copy is written in Capt. Mike Hogan's voice from the source overview; every
 * claim traces to that doc or to a Step 0 confirmed fact. Framed pre-launch —
 * the app isn't shipped, so the CTA and microcopy say "at launch."
 */

const SECTION = 'mx-auto w-full max-w-5xl px-5'

/* ---- 2. The problem ------------------------------------------------------- */
export function Problem() {
  return (
    <section className="py-16 sm:py-24">
      <div className={`${SECTION} max-w-3xl`}>
        <h2 className="font-mono text-2xl font-bold leading-tight text-header sm:text-3xl">
          You lose the day in the driveway.
        </h2>
        <div className="mt-5 space-y-4 text-[17px] leading-relaxed text-ink">
          <p>
            Six weather apps open. A tide chart that doesn’t match the current on
            the rip. A marine forecast written for the wrong side of the Sound.
            You stitch it together, guess, and back the trailer down anyway.
          </p>
          <p>
            Then you spend the morning reacting. Chasing the last bird.
            Second-guessing the spot. Burning fuel and daylight. That’s not
            fishing. That’s reacting.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ---- 3. The reframe -------------------------------------------------------- */
export function Reframe() {
  return (
    <section className="py-16 sm:py-28">
      <div className={`${SECTION} max-w-3xl text-center`}>
        <span className="mx-auto block h-1 w-16 rounded bg-green-light" aria-hidden="true" />
        <h2 className="mt-8 font-mono text-3xl font-bold leading-[1.15] text-header sm:text-5xl">
          Decision mode,
          <br />
          not reaction mode.
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-ink sm:text-xl">
          One place for everything. One clear read. One plan you can run. You
          stop guessing and start fishing the window.
        </p>
      </div>
    </section>
  )
}

/* ---- 4. The mechanism ----------------------------------------------------- */
export function Mechanism() {
  return (
    <section data-section-view="mechanism" className="bg-box py-16 sm:py-24">
      <div className={`${SECTION}`}>
        <h2 className="max-w-3xl font-mono text-2xl font-bold leading-tight text-header sm:text-3xl">
          Every gauge in one place, read through forty years on the rips.
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="box">
            <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
              All the data, in one read
            </h3>
            <p className="mt-3 text-[16px] leading-relaxed text-ink">
              NOAA tides and currents. NWS marine forecasts. Buoy wind and
              pressure. The radar. Sea-surface temp. Every gauge you’d check
              before dawn, consolidated — so you’re not building the picture
              across ten apps. The picture’s already built.
            </p>
          </div>
          <div className="box">
            <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
              Run through local knowledge
            </h3>
            <p className="mt-3 text-[16px] leading-relaxed text-ink">
              That live data runs through forty years on these waters — the Salty
              Cape system, spot by spot, thousands of pages of archived reports
              and playbooks. So you don’t just get numbers. You get what the
              numbers mean, right here, right now.
            </p>
          </div>
        </div>

        <p className="mt-8 max-w-3xl border-l-2 border-green-dark pl-5 font-mono text-lg leading-relaxed text-header sm:text-xl">
          Live data alone is a weather app. Local knowledge alone is a guy at the
          ramp. Fused, you’re a 40-year veteran the moment you open it.
        </p>
      </div>
    </section>
  )
}

/* ---- 5. A real day, run --------------------------------------------------- */
interface Feature {
  outcome: string
  name: string
  body: string
  shot: string
}

const FEATURES: Feature[] = [
  {
    outcome: 'Know which side of the Sound opens up — before the trailer’s hitched.',
    name: 'Weather',
    body: 'One look at the live wind and what it’s doing to the water — laying a face clean, or stacking chop and dirtying the edge. Albies want clean water and a surface you can read. Spot Loc tells you which neighborhood opens today and which one shuts down. One decision, made calm, at the kitchen table.',
    shot: 'Regional weather + wind read',
  },
  {
    outcome: 'Fish the window, to the minute.',
    name: 'Tide timing',
    body: 'High tide at the dock is not slack on the rip. Spot Loc does the current math for each spot and hands you the peak window — built around peak velocity at the local station, not a vague “incoming.” When it fires, how hard, which way. Now you stack a morning: this corner on the early push, the next as it turns.',
    shot: 'Peak-window timeline for a spot',
  },
  {
    outcome: 'Know they’re really on, and know the play.',
    name: 'Best Bets',
    body: 'In season doesn’t mean here. Best Bets won’t say albies are around until they actually are. When they’re on, you get Capt. Mike’s Playbooks — the fast, small-profile, outside-edge game, matched to the light and the current, the whole play one tap away. You’re not standing there wondering what to tie on.',
    shot: 'Best Bets + the Playbook for a spot',
  },
  {
    outcome: 'The whole day on one ticket.',
    name: 'TripTix',
    body: 'The windows, the conditions, the spots, the plays — on one sheet. The float plan you’d have scribbled on the back of a chart, except it’s built from live data and it’s already done. You’re not managing chaos from the helm. You’ve got the day on a ticket, and you fish it.',
    shot: 'A TripTix day sheet',
  },
  {
    outcome: 'When they’re up and won’t eat, get the adjustment.',
    name: 'Troubleshooting',
    body: 'Every albie day has that moment — fish boiling, refusing everything. Instead of tearing through the crate, Spot Loc coaches the adjustment: profile, speed, angle, what the bait’s telling you. The same read you’d get standing next to Mike. A stall becomes a problem you solve, calm.',
    shot: 'The troubleshooting coach in the app',
  },
]

export function RealDay() {
  return (
    <section className="py-16 sm:py-24">
      <div className={SECTION}>
        <h2 className="max-w-3xl font-mono text-2xl font-bold leading-tight text-header sm:text-3xl">
          One albie morning, start to finish.
        </h2>
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink">
          Albies are the sharpest test there is — fast, fickle, all tide and
          light. If it can organize an albie morning, it can organize anything.
        </p>

        <div className="mt-12 space-y-14 sm:space-y-20">
          {FEATURES.map((f, i) => (
            <div
              key={f.name}
              className="grid items-center gap-6 sm:gap-10 md:grid-cols-2"
            >
              <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                <AppShotPlaceholder caption={f.shot} />
              </div>
              <div className={i % 2 === 1 ? 'md:order-1' : ''}>
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-green-dark">
                  {f.name}
                </span>
                <h3 className="mt-2 font-mono text-xl font-bold leading-snug text-header sm:text-2xl">
                  {f.outcome}
                </h3>
                <p className="mt-3 text-[16px] leading-relaxed text-ink">
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-14 max-w-2xl border-t border-body pt-8 text-center text-[16px] leading-relaxed text-header">
          Albies are the example, not the limit. The same five moves run a
          striper day, a bonito day, fluke, sea bass — the whole inshore mix.
          Albies just show best why timing and a real read beat guessing.
        </p>
      </div>
    </section>
  )
}

/* ---- 6. Authority --------------------------------------------------------- */
export function Authority() {
  return (
    <section className="bg-box py-16 sm:py-24">
      <div className={`${SECTION} max-w-4xl`}>
        <div className="grid items-center gap-8 sm:grid-cols-[220px_1fr] sm:gap-10">
          <div className="mx-auto w-full max-w-[220px]">
            <AppShotPlaceholder caption="Capt. Mike Hogan, on the water" />
          </div>
          <div>
            <h2 className="font-mono text-2xl font-bold leading-tight text-header sm:text-3xl">
              Forty years on these rips is what the app is made of.
            </h2>
            <div className="mt-4 space-y-4 text-[16px] leading-relaxed text-ink">
              <p>
                Capt. Mike Hogan has fished Cape Cod and the Islands for forty
                years — the sounds, the rips, the Canal, the whole inshore mix.
                Spot Loc isn’t a weather app with his name on it. It’s his read.
              </p>
              <p>
                The Salty Cape system — the reports and the playbooks, spot by
                spot — is the local knowledge the app runs on. When Spot Loc
                tells you what the numbers mean, that’s forty years talking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---- 7. Objections / FAQ -------------------------------------------------- */
const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Is this just another weather app?',
    a: 'No. A weather app hands you numbers. Spot Loc reads them through forty years of local knowledge and tells you what they mean for your spot, today.',
  },
  {
    q: 'Does it cover my area?',
    a: 'It’s built for Cape Cod and the Islands — Buzzards Bay to Nantucket, the sounds, the rips, the Canal. Spot by spot.',
  },
  {
    q: 'Do I need a separate Salty Cape subscription?',
    a: 'No. The local knowledge that powers Spot Loc is built in. The full picture comes at launch.',
  },
  {
    q: 'What does it cost?',
    a: 'We’re setting that now. Get on the list and you’ll hear it first, the day it launches.',
  },
  {
    q: 'What if I fish from shore, not a boat?',
    a: 'Spot Loc is built around boat days on the Cape’s rips and sounds, where timing and current reads matter most. The weather, tides, and Best Bets still help from shore; the float-plan side is aimed at running a boat.',
  },
  {
    q: 'How is this different from what I already do?',
    a: 'You stop stitching six apps together and reacting all day. You get one read and one plan, and you fish the window instead of the whole ocean.',
  },
  {
    q: 'Does it know when fish are actually around?',
    a: 'Best Bets won’t say a species is on until it actually is. In season doesn’t mean here.',
  },
  {
    q: 'When does it launch?',
    a: 'Soon. The list hears first.',
  },
]

export function Faq() {
  return (
    <section className="py-16 sm:py-24">
      <div className={`${SECTION} max-w-3xl`}>
        <h2 className="font-mono text-2xl font-bold leading-tight text-header sm:text-3xl">
          Straight answers.
        </h2>
        <dl className="mt-8 divide-y divide-body">
          {FAQ.map((item) => (
            <div key={item.q} className="py-5">
              <dt className="font-mono text-[17px] font-semibold text-header">
                {item.q}
              </dt>
              <dd className="mt-2 text-[16px] leading-relaxed text-ink">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ---- 9. Footer ------------------------------------------------------------ */
export function LandingFooter({ contactEmail }: { contactEmail: string }) {
  return (
    <footer className="border-t border-body bg-box py-10">
      <div className={`${SECTION} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
        <span className="font-mono text-lg font-bold tracking-tight text-header">
          SPOT<span className="text-green-dark"> LOC</span>
        </span>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a href={`mailto:${contactEmail}`} className="text-red-dark hover:underline">
            Contact
          </a>
          <Link href="/spotloc/privacy" className="text-red-dark hover:underline">
            Privacy
          </Link>
          <Link href="/spotloc/terms" className="text-red-dark hover:underline">
            Terms
          </Link>
        </nav>
      </div>
      <div className={`${SECTION} mt-4`}>
        <p className="font-mono text-xs text-header">
          © Spot Loc. A Salty Cape app. Charts and conditions are for reference,
          not navigation.
        </p>
      </div>
    </footer>
  )
}
