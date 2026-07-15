import {defineType} from 'sanity'

import {
  descriptionField,
  identityFields,
  identityPreview,
  referenceList,
} from '../shared/fields'

export const speciesPost = defineType({
  name: 'speciesPost',
  title: 'Species Post',
  type: 'document',
  fields: [
    ...identityFields,
    descriptionField,
    referenceList({name: 'targetSpecies', title: 'Target Species', to: 'targetSpecies'}),
    referenceList({name: 'baitfish', title: 'Baitfish', to: 'baitfish'}),
  ],
  preview: identityPreview,
})
