import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

export const season = defineType({
  name: 'season',
  title: 'Season',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
