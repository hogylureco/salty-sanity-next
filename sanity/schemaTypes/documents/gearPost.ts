import {defineType} from 'sanity'

import {descriptionField, identityFields, identityPreview} from '../shared/fields'

export const gearPost = defineType({
  name: 'gearPost',
  title: 'Gear Post',
  type: 'document',
  fields: [...identityFields, descriptionField],
  preview: identityPreview,
})
