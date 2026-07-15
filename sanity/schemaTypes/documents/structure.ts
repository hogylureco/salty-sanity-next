import {defineType} from 'sanity'

import {
  descriptionField,
  identityFields,
  identityPreview,
  referenceList,
} from '../shared/fields'

export const structure = defineType({
  name: 'structure',
  title: 'Structure',
  type: 'document',
  fields: [
    ...identityFields,
    descriptionField,
    referenceList({name: 'method', title: 'Method', to: 'method'}),
    referenceList({name: 'targetSpecies', title: 'Target Species', to: 'targetSpecies'}),
    referenceList({name: 'zone', title: 'Zone', to: 'zone'}),
  ],
  preview: identityPreview,
})
