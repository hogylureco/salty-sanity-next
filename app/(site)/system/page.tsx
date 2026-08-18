import type { Metadata } from 'next'
import Link from 'next/link'

import { SITE_URL } from '@/lib/taxonomy'

// Fully static — no runtime data, no dynamic APIs.
export const dynamic = 'force-static'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Capt. Mike's System",
  description:
    "Capt. Mike's five-part framework for reading the day and deciding how to fish it — seasonal analysis, environmental reads, observation, structure, and gear. Built to meet you where you are, whatever your skill level.",
  alternates: { canonical: '/system' },
  openGraph: {
    type: 'website',
    url: '/system',
    title: "Capt. Mike's System",
    description:
      "A five-part framework for discovering the best way for YOU to fish, today, in your situation.",
  },
  twitter: {
    card: 'summary_large_image',
    title: "Capt. Mike's System",
    description:
      "A five-part framework for discovering the best way for YOU to fish, today, in your situation.",
  },
}

/**
 * Responsive 16:9 YouTube embed.
 *
 * `referrerPolicy` is REQUIRED, not cosmetic: YouTube's embed returns a "Video
 * player configuration error" for any request that reaches it with no `Referer`.
 * A browser normally sends one, but a stricter inherited document policy
 * (privacy browsers/extensions, or a preview/proxy that injects
 * `Referrer-Policy: no-referrer`) can strip it — which breaks EVERY embed.
 * Setting the policy on the element itself overrides any inherited policy so the
 * origin is always sent. (Same pattern as the video detail page.)
 */
function Embed({ id, title }: { id: string; title: string }) {
  return (
    <div className="box overflow-hidden p-0">
      <div className="relative aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${id}?rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  )
}

/** A numbered step: eyebrow number, title, subtitle, then arbitrary body + video. */
function Part({
  n,
  title,
  subtitle,
  children,
  video,
}: {
  n: number
  title: string
  subtitle: string
  children: React.ReactNode
  video: { id: string; title: string }
}) {
  return (
    <section className="scroll-mt-24">
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <div className="space-y-4">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-green-dark">
            Part {n}
          </p>
          <h2 className="font-mono text-2xl font-bold leading-tight text-header sm:text-3xl">
            {title}
          </h2>
          <p className="font-mono text-sm font-semibold uppercase tracking-wider text-ink">
            {subtitle}
          </p>
          <div className="space-y-4 text-[16px] leading-relaxed text-ink">
            {children}
          </div>
        </div>
        <div className="md:pt-1">
          <Embed id={video.id} title={video.title} />
        </div>
      </div>
    </section>
  )
}

/** "End Goal →" / "Feedback Loop →" style callout. */
function Note({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="font-semibold text-header">{label} → </span>
      {children}
    </p>
  )
}

// The three "hats." Images are plain ImageKit URLs (not Sanity assets), so a
// bare <img> — same treatment as the taxonomy/system cards.
const TOP_LINKS: Array<{ label: string; href: string; image: string }> = [
  {
    label: 'Boat Inshore',
    href: '/system/boat-inshore',
    image:
      'https://ik.imagekit.io/hogylures/Mike%20cast%20dogwalker%20sunset_1.20.2.jpg?updatedAt=1786462732581',
  },
  {
    label: 'Boat Offshore',
    href: '/system/boat-offshore',
    image:
      'https://ik.imagekit.io/hogylures/boat%20turn.png?updatedAt=1786464506780',
  },
  {
    label: 'Shore',
    href: '/system/shore',
    image:
      'https://ik.imagekit.io/hogylures/Screenshot%202026-08-11%20at%2011.22.00%E2%80%AFAM.png',
  },
]

export default function CaptMikesSystemPage() {
  return (
    <main className="bg-body">
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-14 sm:pt-20">
        <h1 className="font-mono text-4xl font-bold leading-[1.1] text-header sm:text-5xl">
          Capt. Mike&rsquo;s System
        </h1>
        <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-ink sm:text-xl">
          The advice I give depends on the hat I&rsquo;m wearing&mdash;but the
          principles stay the same.
        </p>

        {/* Context cards — the three "hats," each linking to its system page. */}
        <nav
          aria-label="Fishing context"
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {TOP_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="group flex flex-col overflow-hidden rounded-[6px] border border-body bg-box transition-colors hover:border-green-light"
            >
              <div className="aspect-[16/10] overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={link.image}
                  alt={link.label}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="px-4 py-3">
                <span className="font-mono text-base font-semibold text-header transition-colors group-hover:text-green-dark">
                  {link.label}
                </span>
              </div>
            </Link>
          ))}
        </nav>
      </section>

      {/* Welcome video */}
      <section className="mx-auto mt-10 w-full max-w-6xl px-5 sm:mt-12">
        <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-green-dark">
          Welcome to the Salty Cape system
        </p>
        <Embed id="Zh2aIia7krE" title="Welcome to the Salty Cape system" />
      </section>

      {/* Intro copy */}
      <section className="mx-auto mt-12 w-full max-w-6xl space-y-5 px-5 text-[17px] leading-relaxed text-ink sm:mt-16">
        <p>
          As a lifelong angler, I&rsquo;ve spent years giving friends and family
          the kind of hands-on tips that help emerging anglers get over that
          initial learning curve. As a charter captain, my job was to take
          people&mdash;many of them with zero fishing experience&mdash;and get
          them catching fish, smiling, and fully engaged in the process within 20
          minutes of stepping aboard. And as a fishing video host, I have to
          speak to everyone at once&mdash;beginners, intermediates, and
          lifers&mdash;offering insight that works across the entire skill
          spectrum.
        </p>
        <p className="font-mono text-lg font-semibold text-header">
          That&rsquo;s why I built The Salty Cape System.
        </p>
        <p>
          Whether you&rsquo;re a first-timer or a seasoned angler who wants to
          sharpen your edge, this system meets you where you are. It&rsquo;s not
          about telling you the best way to fish. It&rsquo;s about helping you
          discover the best way for <em>you</em> to fish, today, in your
          situation, with your tools, your experience, and your time.
        </p>
      </section>

      {/* The five parts */}
      <div className="mx-auto mt-16 w-full max-w-6xl space-y-16 px-5 pb-20 sm:mt-20 sm:space-y-20 sm:pb-28">
        <Part
          n={1}
          title="Seasonal & Historical Analysis"
          subtitle="Macro → Micro Season → Micro Pattern"
          video={{ id: '2r7wqC_rxU0', title: 'Seasonal & Historical Analysis' }}
        >
          <p>
            Start with the big seasonal picture &mdash; macro trends like
            migrations, water temps, and forage cycles. Refine that using micro
            seasonal shifts (moon phases, localized bait changes), and zoom in on
            micro-patterns &mdash; day-to-day fluctuations.
          </p>
          <div>
            <p className="font-semibold text-header">
              End Goal → Establish your game plan:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Pick your spot</li>
              <li>Set expectations for what should be happening</li>
              <li>
                Create a working hypothesis for how the trip will play out
                &mdash; this becomes your forecast.
              </li>
            </ol>
          </div>
          <Note label="Feedback Loop">
            Environmental Analysis refines your initial game plan by adjusting for
            real-time factors that may shift or override your original
            micro-pattern forecast.
          </Note>
        </Part>

        <Part
          n={2}
          title="Environmental Analysis"
          subtitle="What the Water Is Telling You"
          video={{ id: 'eRuuyUWdf-w', title: 'Environmental Analysis' }}
        >
          <p>Evaluate current inputs:</p>
          <ul className="space-y-2">
            <li>
              <span className="font-semibold text-header">Wind</span> &mdash;
              Direction, strength, and recent change
            </li>
            <li>
              <span className="font-semibold text-header">Tide</span> &mdash;
              Stage, velocity, and timing
            </li>
            <li>
              <span className="font-semibold text-header">Weather</span> &mdash;
              Sun, fronts, pressure swings
            </li>
          </ul>
          <p>
            These drivers shape how fish and bait behave &mdash; they&rsquo;re the
            heartbeat of the day&rsquo;s micro-pattern.
          </p>
          <Note label="End Goal">
            Decide where you&rsquo;re going and why. This step filters broad
            seasonal possibilities into a short list of zones and timing windows
            worth committing to.
          </Note>
        </Part>

        <Part
          n={3}
          title="Observational Analysis"
          subtitle="The Moment of Truth"
          video={{ id: '81Rk9qzeZAA', title: 'Observational Analysis' }}
        >
          <p>Now you&rsquo;re on scene. Your job is to read the ecosystem:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Are fish present?</li>
            <li>Where in the column are they?</li>
            <li>What are they feeding on &mdash; and how?</li>
            <li>
              What signs (birds, bait, water texture, sonar) are showing you the
              story?
            </li>
          </ul>
          <Note label="End Goal">
            Determine whether you&rsquo;re in the right place &mdash; and if yes,
            refine your understanding of where, how, and what to fish.
          </Note>
          <p>
            If no life is present or the puzzle doesn&rsquo;t line up, loop back
            to Steps 1 and 2 to reassess location or timing.
          </p>
        </Part>

        <Part
          n={4}
          title="Structure & Approach"
          subtitle="Position Defines Presentation"
          video={{ id: 'oe69vCvfqzI', title: 'Structure & Approach' }}
        >
          <p>
            Fishing is always about structure, and how current, bait, and
            predators relate to it. Your approach (boat angle, cast path, drift
            setup) is shaped by what you learned in Step 3.
          </p>
          <div>
            <p className="font-semibold text-header">Ask</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Are you fishing into, across, or along the structure?</li>
              <li>How is the tide hitting it?</li>
              <li>How do bait and predators respond to that pressure?</li>
            </ul>
          </div>
          <Note label="End Goal">
            Set yourself up to deliver the right presentation in the right lane.
            This is where you lock in your angle, your cast line, and your drift
            plan.
          </Note>
        </Part>

        <Part
          n={5}
          title="Gear & Technique"
          subtitle="Match the Hatch, the Depth, the Mood — and Make It Come Alive"
          video={{ id: 'quIfGJK-13c', title: 'Gear & Technique' }}
        >
          <p>
            Everything before this step has led you to one thing: clarity. Now you
            make your choices with confidence.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Lure Type</li>
            <li>Lure Color</li>
            <li>Technique</li>
            <li>Outfit Selection</li>
          </ul>
          <Note label="End Goal">
            Deliver the most logical, natural, and believable presentation to the
            fish &mdash; based on everything you&rsquo;ve learned up to this point.
          </Note>
        </Part>
      </div>
    </main>
  )
}
