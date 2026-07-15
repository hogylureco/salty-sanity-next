import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

/** Same shape as `parentLure`; a parallel set of documents under a hyphenated type name. */
export const parentLureLegacy = defineType({
  name: 'parent-lure',
  title: 'Parent Lure (parent-lure)',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
