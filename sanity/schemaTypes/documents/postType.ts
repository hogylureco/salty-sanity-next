import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

export const postType = defineType({
  name: 'post-type',
  title: 'Post Type',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
