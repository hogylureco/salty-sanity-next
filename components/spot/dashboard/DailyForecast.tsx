/**
 * Daily Forecast box (dashboard, Step 2).
 *
 * ⚠ WORKER GAP: the Salty Cape Worker currently exposes only `/tides` and
 * `/currents` — there is NO NWS text-forecast endpoint. Per the brief we render
 * the box shell it will eventually fill (Today / Tonight rows + the National
 * Weather Service attribution line) with an explicit "unavailable" state rather
 * than inventing data. When the Worker gains a `/weather` (or `/forecast`)
 * endpoint returning `{ today: {temp,text}, tonight: {temp,text} }`, swap this
 * static shell for a client fetch mirroring PeakTidesToday.
 */
const eyebrow = 'font-mono text-xs font-semibold uppercase tracking-wider text-header'

function Period({ label }: { label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-mono text-sm font-semibold text-header">{label}</span>
      <span className="font-mono text-lg font-bold text-header/50">—°</span>
    </div>
  )
}

export function DailyForecast() {
  return (
    <section className="flex h-full flex-col">
      <h2 className={eyebrow}>Daily Forecast</h2>
      <hr className="my-3 border-body" />

      <div className="space-y-3">
        <Period label="Today" />
        <p className="text-sm text-header/70">
          Forecast text not yet available.
        </p>
        <Period label="Tonight" />
      </div>

      <div className="mt-auto pt-4">
        <p className="font-mono text-[0.7rem] uppercase tracking-wide text-header/60">
          Data from National Weather Service
        </p>
      </div>
    </section>
    
  )
}
