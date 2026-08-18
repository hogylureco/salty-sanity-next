import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  fetchOneEntry,
  getBuilderSearchParams,
  isPreviewing,
} from '@builder.io/sdk-react'

import { BuilderPageContent } from '@/components/builder/BuilderPageContent'

// Builder publish → live has up to 1h latency (this ISR window). A Builder
// webhook into a revalidate endpoint is a follow-up if that latency annoys us.
export const revalidate = 3600
// Reading searchParams (for the editor/preview) renders this route dynamically;
// that's fine — only spot/taxonomy routes must stay statically generated.
export const dynamicParams = true

const MODEL = 'page'
const API_KEY = process.env.NEXT_PUBLIC_BUILDER_API_KEY

type SearchParams = Record<string, string | string[] | undefined>

function urlPathFrom(page: string[] | undefined): string {
  return `/${page?.join('/') ?? ''}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page?: string[] }>
}): Promise<Metadata> {
  if (!API_KEY) return {}
  const { page } = await params
  const content = await fetchOneEntry({
    model: MODEL,
    apiKey: API_KEY,
    userAttributes: { urlPath: urlPathFrom(page) },
  })
  const data = content?.data as { title?: string; description?: string } | undefined
  return { title: data?.title, description: data?.description }
}

export default async function MarketingPage({
  params,
  searchParams,
}: {
  params: Promise<{ page?: string[] }>
  searchParams: Promise<SearchParams>
}) {
  const { page } = await params

  // Builder's helpers want a Search without `undefined` values, which Next's
  // searchParams can contain — strip them.
  const search: Record<string, string | string[]> = {}
  for (const [key, value] of Object.entries(await searchParams)) {
    if (value !== undefined) search[key] = value
  }

  if (!API_KEY) notFound()

  const content = await fetchOneEntry({
    model: MODEL,
    apiKey: API_KEY,
    userAttributes: { urlPath: urlPathFrom(page) },
    // Forwards Builder's preview/editing params so the editor renders drafts.
    options: getBuilderSearchParams(search),
  })

  // Builder must not swallow 404s for genuinely missing pages — only keep
  // rendering when there's content OR we're actively previewing in the editor.
  if (!content && !isPreviewing(search)) notFound()

  return <BuilderPageContent content={content} />
}
