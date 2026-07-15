import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

export const targetSpecies = defineType({
  name: 'targetSpecies',
  title: 'Target Species',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
