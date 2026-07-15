import {defineArrayMember, defineField, defineType} from 'sanity'

import {identityFields, referenceList} from '../shared/fields'

/** Portable-text field, of which `spot` has several. */
function richTextField(name: string, title: string) {
  return defineField({name, title, type: 'richText'})
}

/** Array of plain strings (kept as strings — these are not references in the data). */
function stringList(name: string, title: string) {
  return defineField({
    name,
    title,
    type: 'array',
    of: [defineArrayMember({type: 'string'})],
  })
}

export const spot = defineType({
  name: 'spot',
  title: 'Spot',
  type: 'document',
  groups: [
    {name: 'details', title: 'Details', default: true},
    {name: 'location', title: 'Location'},
    {name: 'content', title: 'Content'},
    {name: 'relationships', title: 'Relationships'},
  ],
  fields: [
    ...identityFields.map((field) => ({...field, group: 'details'})),
    defineField({name: 'spotId', title: 'Spot ID', type: 'string', group: 'details'}),
    defineField({name: 'postType', title: 'Post Type', type: 'string', group: 'details'}),
    defineField({name: 'spotType', title: 'Spot Type', type: 'string', group: 'details'}),
    // Inconsistent casing in the data (`v1.0`, `V2.6`, `v3.0`, `v3.1`).
    defineField({name: 'version', title: 'Version', type: 'string', group: 'details'}),
    defineField({name: 'publishDate', title: 'Publish Date', type: 'datetime', group: 'details'}),
    defineField({name: 'depthRange', title: 'Depth Range', type: 'string', group: 'details'}),
    defineField({name: 'hazards', title: 'Hazards', type: 'text', rows: 3, group: 'details'}),
    defineField({
      name: 'approachCodePrefix',
      title: 'Approach Code Prefix',
      type: 'string',
      group: 'details',
    }),
    defineField({name: 'approachCount', title: 'Approach Count', type: 'number', group: 'details'}),
    // Free text, not the `microSeason` reference array below.
    defineField({name: 'microSeasons', title: 'Micro Seasons (text)', type: 'text', rows: 3, group: 'details'}),

    // Latitude/longitude are stored as separate numbers rather than a geopoint.
    defineField({name: 'latitude', title: 'Latitude', type: 'number', group: 'location'}),
    defineField({name: 'longitude', title: 'Longitude', type: 'number', group: 'location'}),
    defineField({name: 'zoomLevel', title: 'Zoom Level', type: 'number', group: 'location'}),
    {...stringList('macroRegion', 'Macro Region'), group: 'location'},
    {...stringList('platform', 'Platform'), group: 'location'},
    defineField({name: 'tideStationId', title: 'Tide Station ID', type: 'string', group: 'location'}),
    defineField({name: 'currentStationId', title: 'Current Station ID', type: 'string', group: 'location'}),
    defineField({name: 'tideVariance', title: 'Tide Variance', type: 'number', group: 'location'}),
    defineField({name: 'gpxFile', title: 'GPX File', type: 'url', group: 'location'}),

    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      options: {hotspot: true},
      group: 'content',
      fields: [
        defineField({name: 'alt', title: 'Alt Text', type: 'string'}),
        defineField({name: 'caption', title: 'Caption', type: 'string'}),
      ],
    }),

    {...richTextField('spotCard', 'Spot Card'), group: 'content'},
    {...richTextField('captMikeNotes', "Capt. Mike's Notes"), group: 'content'},
    {...richTextField('QAcaptMike', 'Q&A with Capt. Mike'), group: 'content'},
    {...richTextField('structureApproach', 'Structure Approach'), group: 'content'},
    {...richTextField('gearTechnique', 'Gear & Technique'), group: 'content'},
    {...richTextField('environmentalFactors', 'Environmental Factors'), group: 'content'},
    {...richTextField('observationalFactors', 'Observational Factors'), group: 'content'},
    {...richTextField('historicalAnalysis', 'Historical Analysis'), group: 'content'},

    {...referenceList({name: 'approaches', title: 'Approaches', to: 'approach'}), group: 'relationships'},
    {...referenceList({name: 'baitfish', title: 'Baitfish', to: 'baitfish'}), group: 'relationships'},
    {...referenceList({name: 'lureCatalog', title: 'Lure Catalog', to: 'lureCatalog'}), group: 'relationships'},
    {...referenceList({name: 'lureGearCategory', title: 'Lure Gear Category', to: 'lureGearCategory'}), group: 'relationships'},
    {...referenceList({name: 'microSeason', title: 'Micro Season', to: 'microSeason'}), group: 'relationships'},
    {...referenceList({name: 'mode', title: 'Mode', to: 'mode'}), group: 'relationships'},
    {...referenceList({name: 'parentLure', title: 'Parent Lure', to: 'parentLure'}), group: 'relationships'},
    {...referenceList({name: 'region', title: 'Region', to: 'region'}), group: 'relationships'},
    {...referenceList({name: 'seasons', title: 'Seasons', to: 'season'}), group: 'relationships'},
    {...referenceList({name: 'structure', title: 'Structure', to: 'structure'}), group: 'relationships'},
    // Published documents use `structureTypes`; drafts use `structure` above.
    {...referenceList({name: 'structureTypes', title: 'Structure Types', to: 'structureType'}), group: 'relationships'},
    {...referenceList({name: 'targetSpecies', title: 'Target Species', to: 'targetSpecies'}), group: 'relationships'},
    {...referenceList({name: 'techniqueRetrieve', title: 'Technique / Retrieve', to: 'techniqueRetrieve'}), group: 'relationships'},
    {...referenceList({name: 'zone', title: 'Zone', to: 'zone'}), group: 'relationships'},
    {...referenceList({name: 'relatedVideos', title: 'Related Videos', to: 'video'}), group: 'relationships'},

    // Spot-to-spot relationships.
    {...referenceList({name: 'boatRamps', title: 'Boat Ramps', to: 'spot'}), group: 'relationships'},
    {...referenceList({name: 'nearbySpots', title: 'Nearby Spots', to: 'spot'}), group: 'relationships'},
    {...referenceList({name: 'subSpotsFXApproaches', title: 'Sub-spots / FX Approaches', to: 'spot'}), group: 'relationships'},
  ],
  preview: {
    select: {title: 'name', subtitle: 'spotId', media: 'featuredImage'},
  },
})
