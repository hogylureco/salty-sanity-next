import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

export const platform = defineType({
  name: 'platform',
  title: 'Platform',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
