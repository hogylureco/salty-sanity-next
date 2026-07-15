import {defineType} from 'sanity'

import {idField, identityPreview, nameField, slugField} from '../shared/fields'

/**
 * Coded gear categories (`LGC-300 - Inshore Swimbait Paddle Tails`).
 * Only one document carries a slug, but it is declared so that value stays visible.
 */
export const lureGearCategory = defineType({
  name: 'lureGearCategory',
  title: 'Lure Gear Category (lureGearCategory)',
  type: 'document',
  fields: [nameField, idField, slugField],
  preview: identityPreview,
})
