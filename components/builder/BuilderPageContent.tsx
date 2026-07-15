'use client'

import { Content, fetchOneEntry } from '@builder.io/sdk-react'

import { customComponents } from './registered-components'

const API_KEY = process.env.NEXT_PUBLIC_BUILDER_API_KEY ?? ''

type BuilderContent = Awaited<ReturnType<typeof fetchOneEntry>>

/**
 * Client boundary that renders Builder content with our registered components.
 * Kept client-side because `customComponents` holds component references (not
 * serializable across the RSC boundary) and Builder's editor needs interactivity.
 */
export function BuilderPageContent({ content }: { content: BuilderContent }) {
  return (
    <Content
      content={content}
      model="page"
      apiKey={API_KEY}
      customComponents={customComponents}
    />
  )
}
