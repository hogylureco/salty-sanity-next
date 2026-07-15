import {defineArrayMember, defineField} from 'sanity'

/**
 * These schema types were reverse-engineered from the content already in the
 * `production` dataset — no schema had ever been deployed, so the documents
 * themselves are the only source of truth.
 */

/** Human-readable identifier carried over from the source data, e.g. `S102 - Protected Shoreline`. */
export const idField = defineField({
  name: 'id',
  title: 'ID',
  type: 'string',
})

export const nameField = defineField({
  name: 'name',
  title: 'Name',
  type: 'string',
  validation: (rule) => rule.required(),
})

export const slugField = defineField({
  name: 'slug',
  title: 'Slug',
  type: 'slug',
  options: {source: 'name', maxLength: 96},
})

export const descriptionField = defineField({
  name: 'description',
  title: 'Description',
  type: 'richText',
})

/** Shared `name` / `id` / `slug` trio used by nearly every document type here. */
export const identityFields = [nameField, idField, slugField]

/** Standard Studio preview for the identity trio. */
export const identityPreview = {
  select: {title: 'name', subtitle: 'id'},
} as const

/**
 * Every relationship in this dataset is stored as a weak reference, and many of
 * them point at draft ids. Sanity forbids mixing primitive and object members in
 * one array, so these arrays are reference-only; the stray plain strings left
 * behind by the original import will show up in the Studio as invalid items that
 * an editor can convert or remove.
 */
export function referenceList(options: {name: string; title: string; to: string}) {
  return defineField({
    name: options.name,
    title: options.title,
    type: 'array',
    of: [defineArrayMember({type: 'reference', weak: true, to: [{type: options.to}]})],
  })
}
