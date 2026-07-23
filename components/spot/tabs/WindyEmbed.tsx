'use client'

/**
 * Windy interactive weather map (Weather tab), centered on the spot. Uses
 * Windy's free public embed iframe — no API key. Wind overlay + knots/°F suit
 * the marine audience; the marker sits on the spot's coordinates.
 * See https://community.windy.com/topic/77/windy-com-url-parameters
 */
export interface WindyEmbedProps {
  lat: number | null
  lng: number | null
  zoom?: number
  name?: string | null
}

const eyebrow =
  'font-mono text-sm font-semibold uppercase tracking-wider text-header'

export function WindyEmbed({ lat, lng, zoom = 8, name }: WindyEmbedProps) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    detailLat: String(lat),
    detailLon: String(lng),
    zoom: String(zoom),
    level: 'surface',
    overlay: 'wind',
    menu: '',
    message: 'true',
    marker: 'true',
    calendar: 'now',
    pressure: '',
    type: 'map',
    location: 'coordinates',
    detail: '',
    metricWind: 'kt',
    metricTemp: '°F',
    radarRange: '-1',
  })
  const src = `https://embed.windy.com/embed2.html?${params.toString()}`

  return (
    <div className="box">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={eyebrow}>Wind &amp; Weather</h2>
      </div>
      <hr className="my-3 border-body" />

      <div className="overflow-hidden rounded-[5px] border border-body">
        <iframe
          title={`Windy weather map for ${name ?? 'this spot'}`}
          src={src}
          loading="lazy"
          className="block h-[450px] w-full"
          style={{ border: 0 }}
        />
      </div>

      <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-wide text-header/60">
        Wind &amp; weather from Windy.com
      </p>
    </div>
  )
}
