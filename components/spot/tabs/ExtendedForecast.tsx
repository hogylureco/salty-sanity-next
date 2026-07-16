/**
 * Weather tab — extended forecast.
 *
 * ⚠ WORKER GAP (recon confirmed): the Worker exposes `/tides` and `/currents`
 * only; `GET /weather` returns 404. There is no NWS forecast endpoint, so this
 * renders a labeled placeholder + the NWS attribution rather than inventing data.
 * When a `/weather` (or `/forecast`) endpoint lands returning per-period
 * temp/text, replace this with a client fetch mirroring SevenDayConditions.
 */
export function ExtendedForecast() {
  return (
    <div className="box">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
        Extended Forecast
      </h2>
      <hr className="my-3 border-body" />
      <p className="text-sm text-[#535c71]">
        Extended weather forecast is not yet available — the data service does not
        expose a weather endpoint.
      </p>
      <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-wide text-header/60">
        Data from National Weather Service
      </p>
    </div>
  )
}
