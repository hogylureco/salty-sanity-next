import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

/**
 * Flat stub twin of `lureCatalog`. Holds only id/name/slug — none of the
 * relationship fields. Kept so the existing `lure-catalog` documents render.
 */
export const lureCatalogLegacy = defineType({
  name: 'lure-catalog',
  title: 'Lure Catalog (lure-catalog)',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
