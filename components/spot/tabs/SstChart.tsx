'use client'

import { useEffect, useState } from 'react'

import { SpotMapLoader } from '@/components/map/SpotMapLoader'
import { type SstReading, fetchSst } from '@/lib/weather'

/**
 * Sea Surface Temperature (Weather tab): the XWeather SST raster overlaid on the
 * spot's NOAA nautical chart, a color legend, and the exact point reading from
 * /api/sst as the authoritative number. The overlay tiles are proxied
 * server-side (app/api/xweather) so credentials never reach the browser.
 */
export interface SstChartProps {
  lat: number | null
  lng: number | null
  zoom?: number
  name: string
}

const eyebrow =
  'font-mono text-sm font-semibold uppercase tracking-wider text-header'

/**
 * Legend gradient — a representative cool→warm SST ramp with °F ticks. The tile
 * colors are XWeather's; this communicates the scale while the point reading
 * below gives the exact value.
 */
const LEGEND_GRADIENT =
  'linear-gradient(to right, #3b4cc0, #6788ee, #9abbff, #c9d7f0, #f2cbb7, #f7a789, #e36a53, #b40426)'
const LEGEND_TICKS = ['40°', '50°', '60°', '70°', '80°F']

export function SstChart({ lat, lng, zoom, name }: SstChartProps) {
  const [reading, setReading] = useState<SstReading | null>(null)
  const servable = typeof lat === 'number' && typeof lng === 'number'

  useEffect(() => {
    if (!servable) return
    const controller = new AbortController()
    fetchSst(lat as number, lng as number, controller.signal)
      .then(setReading)
      .catch(() => {
        /* leave null — the overlay still renders; number just omitted */
      })
    return () => controller.abort()
  }, [servable, lat, lng])

  return (
    <div className="box">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={eyebrow}>Sea Surface Temperature</h2>
        {reading && (
          <span className="font-mono text-sm text-ink">
            <strong className="text-lg">{Math.round(reading.tempF)}°F</strong>
            {reading.tempC != null && (
              <span className="text-header/70"> · {Math.round(reading.tempC)}°C</span>
            )}
            <span className="text-header/60"> at this spot</span>
          </span>
        )}
      </div>
      <hr className="my-3 border-body" />

      {!servable ? (
        <p className="text-sm text-[#535c71]">
          Sea surface temperature unavailable — this spot has no coordinates.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-[5px] border border-body">
            <SpotMapLoader
              lat={lat}
              lng={lng}
              name={name}
              zoom={zoom}
              sstOverlay
            />
          </div>

          {/* Color legend */}
          <div className="mt-3">
            <div
              className="h-3 w-full rounded-full"
              style={{ background: LEGEND_GRADIENT }}
              aria-hidden
            />
            <div className="mt-1 flex justify-between font-mono text-[0.65rem] text-header/70">
              {LEGEND_TICKS.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-wide text-header/60">
        SST from XWeather · basemap © CARTO / OpenStreetMap
      </p>
    </div>
  )
}
