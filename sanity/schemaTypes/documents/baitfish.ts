import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

export const baitfish = defineType({
  name: 'baitfish',
  title: 'Baitfish',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
