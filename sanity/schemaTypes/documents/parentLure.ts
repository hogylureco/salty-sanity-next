import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

export const parentLure = defineType({
  name: 'parentLure',
  title: 'Parent Lure (parentLure)',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
