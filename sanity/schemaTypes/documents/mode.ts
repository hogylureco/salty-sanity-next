import {defineType} from 'sanity'

import {idField, identityPreview, nameField} from '../shared/fields'

/** Feeding mode. Unlike the other lookup types, `mode` documents carry no slug. */
export const mode = defineType({
  name: 'mode',
  title: 'Mode',
  type: 'document',
  fields: [nameField, idField],
  preview: identityPreview,
})
