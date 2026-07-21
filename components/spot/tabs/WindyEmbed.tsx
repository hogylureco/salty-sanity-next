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
    <div className="box overflow-hidden p-0">
      <iframe
        title={`Windy weather map for ${name ?? 'this spot'}`}
        src={src}
        loading="lazy"
        className="block h-[450px] w-full"
        style={{ border: 0 }}
      />
    </div>
  )
}
