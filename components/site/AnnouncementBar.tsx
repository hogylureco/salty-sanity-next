// Site-wide announcement bar. Static server component — no client JS.
//
// TODO: source from Sanity siteSettings singleton (Phase: site config). For now
// the copy is a hardcoded constant so the bar exists in the chrome and can be
// wired to content later without touching the layout.
const ANNOUNCEMENT = '🎣 New: 7-day tide forecasts now live for every spot.'

export function AnnouncementBar() {
  return (
    <div className="w-full bg-[#0e2a3b] text-center text-white">
      <p className="mx-auto max-w-6xl px-4 py-1.5 font-mono text-xs tracking-wide">
        {ANNOUNCEMENT}
      </p>
    </div>
  )
}
