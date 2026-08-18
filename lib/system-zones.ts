/**
 * The three "hats" of Capt. Mike's System (`/system`). Each maps a URL segment
 * (`/system/<slug>`) to the Sanity `zone` document that tags its taxonomy
 * content. `zoneId` is the PUBLISHED zone id that the weak `zone` refs actually
 * store on approach/structure/parentLure/technique/observational/environmental
 * docs (see `systemByZoneQuery`); pair it with `bothIdForms` to also match a
 * draft-prefixed ref.
 *
 * Shared by the system pages (`/system/[zone]`) and the individual factor
 * templates (`/environmental/[slug]`, `/observational/[slug]`), which resolve a
 * doc's zone refs back into "appears in" links.
 */
export interface SystemZone {
  slug: string
  zoneId: string
  title: string
  tagline: string
}

export const SYSTEM_ZONES: SystemZone[] = [
  {
    slug: 'boat-inshore',
    zoneId: 'c2ab9d2f-ea97-4928-98e0-3aa8628fc087',
    title: 'Boat Inshore System',
    tagline:
      'Fishing from a boat inside the rips, flats, and structure of the sounds and bays — the structure, gear, and reads that matter when you can pick your angle.',
  },
  {
    slug: 'boat-offshore',
    zoneId: 'dd9668e0-f02a-44be-8cb2-163b85c3949b',
    title: 'Boat Offshore System',
    tagline:
      'Fishing from a boat out on the open water — the structure, gear, and reads that matter when you are running to the fish rather than working a shoreline.',
  },
  {
    slug: 'shore',
    zoneId: '25bf1270-ff59-4b7c-b86d-783dbad57ac3',
    title: 'Shore System',
    tagline:
      'Fishing from the beach, jetties, and banks — the structure, gear, and reads that matter when your feet are on the ground and the fish come to you.',
  },
]

export const SYSTEM_ZONE_BY_SLUG: Record<string, SystemZone> =
  Object.fromEntries(SYSTEM_ZONES.map((z) => [z.slug, z]))

const SYSTEM_ZONE_BY_ID: Record<string, SystemZone> = Object.fromEntries(
  SYSTEM_ZONES.map((z) => [z.zoneId, z]),
)

/**
 * Resolve a stored zone `_ref` (plain or `drafts.`-prefixed) to its system zone,
 * or `undefined` when the ref points at a zone with no system page (Kayak, CC
 * Canal, the placeholder "X").
 */
export function systemZoneByRef(ref: string | null | undefined): SystemZone | undefined {
  if (!ref) return undefined
  const id = ref.startsWith('drafts.') ? ref.slice('drafts.'.length) : ref
  return SYSTEM_ZONE_BY_ID[id]
}
