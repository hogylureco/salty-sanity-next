import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

export const zone = defineType({
  name: 'zone',
  title: 'Zone',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
