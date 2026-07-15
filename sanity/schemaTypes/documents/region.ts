import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

export const region = defineType({
  name: 'region',
  title: 'Region',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
