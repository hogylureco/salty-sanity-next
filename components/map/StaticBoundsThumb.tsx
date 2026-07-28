/* eslint-disable @next/next/no-img-element */
import { WORKER_URL } from '@/lib/worker'

/**
 * A STATIC (non-interactive) NOAA-chart thumbnail framed to the BOUNDING BOX of
 * a set of spots, with each spot overlaid as a coloured dot. No Leaflet — plain
 * <img> tiles positioned in a fixed 3:2 coordinate space and expressed in
 * percentages so the whole mosaic scales to whatever width the card renders at.
 *
 * Sibling of `StaticChartThumb` (which centres a single spot at a fixed zoom);
 * this one picks the deepest zoom at which the bbox fits the padded canvas, then
 * tiles the viewport and drops a marker per spot. Used for the /regions grid.
 */
const TILE = 256
// Fixed internal canvas (3:2). All tile/marker geometry is computed here, then
// emitted as percentages, so the actual render width is irrelevant.
const CW = 384
const CH = 256
const PAD = 30 // keep markers off the very edge
const MIN_Z = 6
const MAX_Z = 15
const SINGLE_Z = 13 // one spot (or coincident spots) → a sensible inshore framing

const paperTile = (z: number, x: number, y: number) =>
  `${WORKER_URL}/noaa-chart/paper/${z}/${x}/${y}`

/** Web-Mercator global pixel coords for a lat/lng at a zoom (matches StaticChartThumb). */
function projectPx(lat: number, lng: number, z: number) {
  const n = TILE * 2 ** z
  const x = ((lng + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  return { x, y }
}

export interface ThumbSpot {
  lat: number
  lng: number
}

export function StaticBoundsThumb({
  spots,
  color,
}: {
  spots: ThumbSpot[]
  color: string
}) {
  const pts = spots.filter(
    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng),
  )

  if (pts.length === 0) {
    return (
      <div
        className="relative w-full bg-[#dbe7ef]"
        style={{ aspectRatio: '3 / 2' }}
        aria-hidden
      >
        <span className="absolute inset-0 flex items-center justify-center font-mono text-xs text-header/60">
          No mapped spots
        </span>
      </div>
    )
  }

  const lats = pts.map((p) => p.lat)
  const lngs = pts.map((p) => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  // Deepest zoom whose projected bbox fits the padded canvas.
  let z = SINGLE_Z
  if (maxLat !== minLat || maxLng !== minLng) {
    for (let cand = MAX_Z; cand >= MIN_Z; cand--) {
      const tl = projectPx(maxLat, minLng, cand)
      const br = projectPx(minLat, maxLng, cand)
      z = cand
      if (
        Math.abs(br.x - tl.x) <= CW - 2 * PAD &&
        Math.abs(br.y - tl.y) <= CH - 2 * PAD
      ) {
        break
      }
    }
  }

  // Centre the bbox in pixel space at the chosen zoom.
  const a = projectPx(maxLat, minLng, z)
  const b = projectPx(minLat, maxLng, z)
  const centerX = (Math.min(a.x, b.x) + Math.max(a.x, b.x)) / 2
  const centerY = (Math.min(a.y, b.y) + Math.max(a.y, b.y)) / 2
  const originX = centerX - CW / 2
  const originY = centerY - CH / 2

  const txStart = Math.floor(originX / TILE)
  const txEnd = Math.floor((originX + CW) / TILE)
  const tyStart = Math.floor(originY / TILE)
  const tyEnd = Math.floor((originY + CH) / TILE)

  const tiles: Array<{ tx: number; ty: number; left: number; top: number }> = []
  for (let ty = tyStart; ty <= tyEnd; ty++) {
    for (let tx = txStart; tx <= txEnd; tx++) {
      tiles.push({
        tx,
        ty,
        left: ((tx * TILE - originX) / CW) * 100,
        top: ((ty * TILE - originY) / CH) * 100,
      })
    }
  }
  const tileWpct = (TILE / CW) * 100
  const tileHpct = (TILE / CH) * 100

  const dots = pts
    .map((p, i) => {
      const q = projectPx(p.lat, p.lng, z)
      return { i, x: ((q.x - originX) / CW) * 100, y: ((q.y - originY) / CH) * 100 }
    })
    .filter((d) => d.x >= -2 && d.x <= 102 && d.y >= -2 && d.y <= 102)

  return (
    <div
      className="relative w-full overflow-hidden bg-[#dbe7ef]"
      style={{ aspectRatio: '3 / 2' }}
      aria-hidden
    >
      {tiles.map((t) => (
        <img
          key={`${t.tx}_${t.ty}`}
          src={paperTile(z, t.tx, t.ty)}
          alt=""
          loading="lazy"
          style={{
            position: 'absolute',
            left: `${t.left}%`,
            top: `${t.top}%`,
            width: `${tileWpct}%`,
            height: `${tileHpct}%`,
          }}
        />
      ))}
      {dots.map((d) => (
        <span
          key={d.i}
          style={{
            position: 'absolute',
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: 9,
            height: 9,
            marginLeft: -4.5,
            marginTop: -4.5,
            borderRadius: '50%',
            background: color,
            border: '1.5px solid #fff',
            boxShadow: '0 0 2px rgba(0,0,0,.55)',
          }}
        />
      ))}
    </div>
  )
}
