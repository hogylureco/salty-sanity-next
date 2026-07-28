import { ImageResponse } from 'next/og'

/**
 * Social share card. A branded TEXT card (no fabricated product screenshots) —
 * message-matches the default hero headline so an ad/social click feels
 * continuous. 1200×630.
 */
export const alt = 'Spot Loc — show up already knowing where to be.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#f9f9f9',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
          <span style={{ color: '#535c71' }}>SPOT</span>
          <span style={{ color: '#0a7c5f' }}>&nbsp;LOC</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 96, height: 8, background: '#64ffda', borderRadius: 4, marginBottom: 32 }} />
          <div style={{ fontSize: 72, fontWeight: 700, color: '#535c71', lineHeight: 1.05, maxWidth: 900 }}>
            Show up already knowing where to be.
          </div>
          <div style={{ fontSize: 30, color: '#333', marginTop: 28, maxWidth: 860, lineHeight: 1.3 }}>
            All the data in one place, run through forty years of local knowledge. The companion app to Salty Cape.
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
