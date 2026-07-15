import {defineType} from 'sanity'

import {descriptionField, identityFields, identityPreview} from '../shared/fields'

/**
 * Flat stub twin of `techniqueRetrieve`. Most of these documents are just
 * id/name/slug; `description` is present on a handful.
 */
export const techniqueRetrieveLegacy = defineType({
  name: 'technique-retrieve',
  title: 'Technique Retrieve (technique-retrieve)',
  type: 'document',
  fields: [...identityFields, descriptionField],
  preview: identityPreview,
})
