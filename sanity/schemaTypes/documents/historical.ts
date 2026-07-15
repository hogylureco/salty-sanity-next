import {defineType} from 'sanity'

import {descriptionField, identityFields, identityPreview} from '../shared/fields'

export const historical = defineType({
  name: 'historical',
  title: 'Historical',
  type: 'document',
  fields: [...identityFields, descriptionField],
  preview: identityPreview,
})
