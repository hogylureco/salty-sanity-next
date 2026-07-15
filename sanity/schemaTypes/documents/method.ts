import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

export const method = defineType({
  name: 'method',
  title: 'Method',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
