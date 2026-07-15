import {defineType} from 'sanity'

import {descriptionField, identityFields, identityPreview} from '../shared/fields'

export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  fields: [...identityFields, descriptionField],
  preview: identityPreview,
})
