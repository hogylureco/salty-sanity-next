/**
 * A considered placeholder region for REAL Spot Loc captures that don't exist
 * yet (Step 0, Q4). This deliberately renders NO fake UI and NO mocked screens —
 * just a device/panel frame with a caption naming what capture belongs here, so
 * real assets can be dropped in later. Pure/static; reserves its aspect ratio so
 * swapping in an image later causes no layout shift.
 */
export function AppShotPlaceholder({
  caption,
  phone = false,
  className = '',
}: {
  /** What real capture goes here (also the accessible description). */
  caption: string
  /** Tall phone frame (hero) vs. a landscape panel (feature blocks). */
  phone?: boolean
  className?: string
}) {
  return (
    <div
      role="img"
      aria-label={`Placeholder for Spot Loc app capture: ${caption}`}
      className={`relative overflow-hidden bg-box ${
        phone
          ? 'mx-auto w-full max-w-[280px] rounded-[36px] border-[6px] border-header/80 shadow-[0_2px_4px_rgba(0,0,0,0.06)]'
          : 'w-full rounded-[5px] border border-body shadow-[0_2px_4px_rgba(0,0,0,0.06)]'
      } ${className}`}
      style={{ aspectRatio: phone ? '9 / 19' : '4 / 3' }}
    >
      {/* Accent wash behind dark text — #64ffda is only ever a background. */}
      <div className="absolute inset-0 bg-green-light/25" aria-hidden="true" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-header">
          App preview
        </span>
        <span className="text-sm leading-snug text-header">{caption}</span>
      </div>
      {phone && (
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-header/40"
        />
      )}
    </div>
  )
}
