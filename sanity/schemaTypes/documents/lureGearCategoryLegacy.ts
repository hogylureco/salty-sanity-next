import {defineType} from 'sanity'

import {identityFields, identityPreview} from '../shared/fields'

/** Flat twin of `lureGearCategory`; unlike that type these documents do carry a slug. */
export const lureGearCategoryLegacy = defineType({
  name: 'lure-gear-category',
  title: 'Lure Gear Category (lure-gear-category)',
  type: 'document',
  fields: identityFields,
  preview: identityPreview,
})
