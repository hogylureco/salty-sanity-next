import {defineField, defineType} from 'sanity'

import {
  descriptionField,
  identityFields,
  referenceList,
} from '../shared/fields'

export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'document',
  fields: [
    ...identityFields,
    descriptionField,
    defineField({name: 'videoID', title: 'YouTube Video ID', type: 'string'}),
    defineField({name: 'youtubeTitle', title: 'YouTube Title', type: 'string'}),
    defineField({name: 'watchURL', title: 'Watch URL', type: 'url'}),
    defineField({name: 'videoFilmDate', title: 'Film Date', type: 'date'}),
    // Free-form in the data: `saltycapetv`, `howtovideo`, and both
    // `hogylurecompany` and `hogy-lure-company`. Left as a string so no
    // existing value is hidden behind a dropdown.
    defineField({name: 'videoCategory', title: 'Video Category', type: 'string'}),
    defineField({name: 'boat', title: 'Boat', type: 'string'}),
    defineField({name: 'hosts', title: 'Hosts', type: 'string'}),
    defineField({
      name: 'mode',
      title: 'Mode',
      type: 'reference',
      weak: true,
      to: [{type: 'mode'}],
    }),
    defineField({
      name: 'region',
      title: 'Region',
      type: 'reference',
      weak: true,
      to: [{type: 'region'}],
    }),
    referenceList({name: 'approach', title: 'Approach', to: 'approach'}),
    referenceList({name: 'baitfish', title: 'Baitfish', to: 'baitfish'}),
    referenceList({name: 'lureCatalog', title: 'Lure Catalog', to: 'lureCatalog'}),
    referenceList({name: 'lureGearCategory', title: 'Lure Gear Category', to: 'lureGearCategory'}),
    referenceList({name: 'method', title: 'Method', to: 'method'}),
    referenceList({name: 'microSeason', title: 'Micro Season', to: 'microSeason'}),
    referenceList({name: 'parentLure', title: 'Parent Lure', to: 'parentLure'}),
    referenceList({name: 'platform', title: 'Platform', to: 'platform'}),
    referenceList({name: 'season', title: 'Season', to: 'season'}),
    referenceList({name: 'spot', title: 'Spot', to: 'spot'}),
    referenceList({name: 'structure', title: 'Structure', to: 'structure'}),
    referenceList({name: 'targetspecies', title: 'Target Species', to: 'targetSpecies'}),
    referenceList({name: 'techniqueretrieve', title: 'Technique / Retrieve', to: 'techniqueRetrieve'}),
    referenceList({name: 'zone', title: 'Zone', to: 'zone'}),
  ],
  preview: {
    select: {title: 'name', subtitle: 'youtubeTitle'},
  },
})
