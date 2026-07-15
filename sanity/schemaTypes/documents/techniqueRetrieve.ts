import {defineField, defineType} from 'sanity'

import {
  descriptionField,
  identityFields,
  identityPreview,
  referenceList,
} from '../shared/fields'

export const techniqueRetrieve = defineType({
  name: 'techniqueRetrieve',
  title: 'Technique Retrieve (techniqueRetrieve)',
  type: 'document',
  fields: [
    ...identityFields,
    descriptionField,
    // Plain ImageKit URL, not a Sanity image asset.
    defineField({name: 'featuredDiagramUrl', title: 'Featured Diagram URL', type: 'url'}),
    referenceList({name: 'approach', title: 'Approach', to: 'approach'}),
    referenceList({name: 'method', title: 'Method', to: 'method'}),
    referenceList({name: 'parentlure', title: 'Parent Lure', to: 'parentLure'}),
    referenceList({name: 'platform', title: 'Platform', to: 'platform'}),
    referenceList({name: 'structure', title: 'Structure', to: 'structure'}),
    referenceList({name: 'targetspecies', title: 'Target Species', to: 'targetSpecies'}),
    referenceList({name: 'zone', title: 'Zone', to: 'zone'}),
  ],
  preview: identityPreview,
})
