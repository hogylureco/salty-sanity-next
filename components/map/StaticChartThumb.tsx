/* eslint-disable @next/next/no-img-element */
import { WORKER_URL } from '@/lib/worker'

/**
 * A STATIC (non-interactive) NOAA-chart thumbnail centered on a spot's
 * coordinates — plain <img> tiles, no Leaflet, so a grid of these stays cheap.
 *
 * It stitches a 3×3 block of Worker-served chart tiles at `THUMB_ZOOM` and
 * shifts the block (via a transform) so the spot's exact pixel lands at the box
 * center, then clips with `overflow-hidden`. `loading="lazy"` keeps off-screen
 * cards from fetching until scrolled. A spot with no coordinates renders a
 * neutral placeholder rather than broken tiles.
 */
const TILE = 256
// Detailed inshore band — matches the single-spot chart's default framing.
const THUMB_ZOOM = 14

const paperTile = (z: number, x: number, y: number) =>
  `${WORKER_URL}/noaa-chart/paper/${z}/${x}/${y}`

/** Web-Mercator global pixel coords for a lat/lng at a zoom. */
function projectPx(lat: number, lng: number, z: number) {
  const n = TILE * 2 ** z
  const x = ((lng + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  return { x, y }
}

export function StaticChartThumb({
  lat,
  lng,
}: {
  lat: number | null
  lng: number | null
}) {
  const hasCoords =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)

  if (!hasCoords) {
    return (
      <div
        className="relative w-full bg-[#dbe7ef]"
        style={{ aspectRatio: '3 / 2' }}
        aria-hidden
      >
        <span className="absolute inset-0 flex items-center justify-center font-mono text-xs text-header/60">
          No location
        </span>
      </div>
    )
  }

  const { x, y } = projectPx(lat, lng, THUMB_ZOOM)
  const cx = Math.floor(x / TILE)
  const cy = Math.floor(y / TILE)
  // Spot's pixel position inside the 3×3 block (center tile occupies [256,512)).
  const gx = TILE + (x - cx * TILE)
  const gy = TILE + (y - cy * TILE)
  const offsets = [-1, 0, 1]

  return (
    <div
      className="relative w-full overflow-hidden bg-[#dbe7ef]"
      style={{ aspectRatio: '3 / 2' }}
      aria-hidden
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: TILE * 3,
          height: TILE * 3,
          transform: `translate(${-gx}px, ${-gy}px)`,
        }}
      >
        {offsets.flatMap((dy) =>
          offsets.map((dx) => (
            <img
              key={`${dx}_${dy}`}
              src={paperTile(THUMB_ZOOM, cx + dx, cy + dy)}
              alt=""
              loading="lazy"
              width={TILE}
              height={TILE}
              style={{
                position: 'absolute',
                left: (dx + 1) * TILE,
                top: (dy + 1) * TILE,
              }}
            />
          )),
        )}
      </div>
    </div>
  )
}
