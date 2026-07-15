import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

export const structureType = defineType({
  name: 'structureType',
  title: 'Structure Type',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
