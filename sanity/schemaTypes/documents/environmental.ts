import {defineType} from 'sanity'

import {descriptionField, identityFields, identityPreview} from '../shared/fields'

export const environmental = defineType({
  name: 'environmental',
  title: 'Environmental',
  type: 'document',
  fields: [...identityFields, descriptionField],
  preview: identityPreview,
})
