import {defineField, defineType} from 'sanity'

import {
  descriptionField,
  identityFields,
  identityPreview,
  referenceList,
} from '../shared/fields'

export const approach = defineType({
  name: 'approach',
  title: 'Approach',
  type: 'document',
  fields: [
    ...identityFields,
    descriptionField,
    // Plain ImageKit URL, not a Sanity image asset.
    defineField({name: 'featuredDiagramUrl', title: 'Featured Diagram URL', type: 'url'}),
    referenceList({name: 'method', title: 'Method', to: 'method'}),
    referenceList({name: 'parentLure', title: 'Parent Lure', to: 'parentLure'}),
    referenceList({name: 'platform', title: 'Platform', to: 'platform'}),
    // Stored lowercase in the data even though it points at `targetSpecies`.
    referenceList({name: 'targetspecies', title: 'Target Species', to: 'targetSpecies'}),
    referenceList({name: 'zone', title: 'Zone', to: 'zone'}),
  ],
  preview: identityPreview,
})
