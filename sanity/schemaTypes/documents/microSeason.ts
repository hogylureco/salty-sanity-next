import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

export const microSeason = defineType({
  name: 'microSeason',
  title: 'Micro Season',
  type: 'document',
  // Some drafts have no slug yet, so it is left optional.
  fields: identityFields,
  preview: identityPreview,
})
