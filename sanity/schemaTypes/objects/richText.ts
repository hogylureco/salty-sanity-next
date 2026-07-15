import {defineArrayMember, defineType} from 'sanity'

/**
 * Portable text as it actually appears in the dataset: standard blocks plus the
 * custom `richTableBlock`. Styles, lists, decorators and annotations below are
 * exactly the set observed in the existing content.
 */
export const richText = defineType({
  name: 'richText',
  title: 'Rich Text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'Heading 1', value: 'h1'},
        {title: 'Heading 2', value: 'h2'},
        {title: 'Heading 3', value: 'h3'},
        {title: 'Heading 4', value: 'h4'},
        {title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {title: 'Bullet', value: 'bullet'},
        {title: 'Numbered', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Strong', value: 'strong'},
          {title: 'Emphasis', value: 'em'},
          // Present in existing content; without it these spans render as an unknown mark.
          {title: 'Code', value: 'code'},
        ],
        annotations: [
          defineArrayMember({
            name: 'link',
            title: 'Link',
            type: 'object',
            fields: [{name: 'href', title: 'URL', type: 'url'}],
          }),
        ],
      },
    }),
    defineArrayMember({type: 'image', options: {hotspot: true}}),
    defineArrayMember({type: 'richTableBlock'}),
  ],
})
