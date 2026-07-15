import {defineType} from 'sanity'

import {descriptionField, identityFields, identityPreview} from '../shared/fields'

export const observational = defineType({
  name: 'observational',
  title: 'Observational',
  type: 'document',
  fields: [...identityFields, descriptionField],
  preview: identityPreview,
})
