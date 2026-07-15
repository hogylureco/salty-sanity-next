import {defineField, defineType} from 'sanity'

import {identityFields, identityPreview, referenceList} from '../shared/fields'

export const lureCatalog = defineType({
  name: 'lureCatalog',
  title: 'Lure Catalog (lureCatalog)',
  type: 'document',
  fields: [
    ...identityFields,
    defineField({name: 'imageURL', title: 'Image URL', type: 'url'}),
    defineField({name: 'websiteLink', title: 'Website Link', type: 'url'}),
    referenceList({name: 'lureCategory', title: 'Lure Category', to: 'lureGearCategory'}),
    referenceList({name: 'method', title: 'Method', to: 'method'}),
    referenceList({name: 'parentLureReference', title: 'Parent Lure', to: 'parentLure'}),
    referenceList({name: 'targetSpecies', title: 'Target Species', to: 'targetSpecies'}),
    referenceList({name: 'techniqueRetrieve', title: 'Technique / Retrieve', to: 'techniqueRetrieve'}),
    referenceList({name: 'zone', title: 'Zone', to: 'zone'}),
  ],
  preview: identityPreview,
})
