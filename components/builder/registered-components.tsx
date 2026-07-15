import type { RegisteredComponent } from '@builder.io/sdk-react'

import { SpotConditions } from '@/components/conditions/SpotConditions'
import { SpotMapLoader } from '@/components/map/SpotMapLoader'

import { RegionSpotGrid } from './RegionSpotGrid'
import { SpotCardBlock } from './SpotCardBlock'

/**
 * Sanity-driven blocks available to Builder editors. Every input is an
 * IDENTIFIER or display option — never content Sanity owns (no rich text, no
 * narrative, no image overrides). Existing components are reused/wrapped, never
 * forked: ConditionsWidget and SpotMapBlock register the existing
 * <SpotConditions> / <SpotMapLoader> directly.
 *
 * Note: ConditionsWidget takes station-id inputs (what <SpotConditions>
 * consumes), NOT lat/lng — see docs/builder-setup.md for why.
 */
export const customComponents: RegisteredComponent[] = [
  {
    component: SpotCardBlock,
    name: 'SpotCardBlock',
    inputs: [
      {
        name: 'spotSlug',
        type: 'string',
        helperText: 'Sanity spot slug, e.g. buzzards-bay-west-end-of-the-canal',
      },
    ],
  },
  {
    component: RegionSpotGrid,
    name: 'RegionSpotGrid',
    inputs: [
      {
        name: 'regionCode',
        type: 'string',
        helperText: 'Region id prefix, e.g. BB, CCB, NS',
      },
    ],
  },
  {
    component: SpotConditions,
    name: 'ConditionsWidget',
    inputs: [
      { name: 'spotId', type: 'string', helperText: 'Sanity spot _id (cache key)' },
      {
        name: 'tideStationId',
        type: 'string',
        helperText: 'NOAA tide station, e.g. "Boston HW/LW (8443970)"',
      },
      {
        name: 'currentStationId',
        type: 'string',
        helperText: 'NOAA current station, e.g. COD0905',
      },
    ],
  },
  {
    component: SpotMapLoader,
    name: 'SpotMapBlock',
    inputs: [
      { name: 'lat', type: 'number' },
      { name: 'lng', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'zoom', type: 'number', defaultValue: 13 },
    ],
  },
]
