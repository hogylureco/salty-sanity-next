import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/JsonLd'
import {
  SpotPortableText,
  type PortableTextValue,
} from '@/components/portable-text/SpotPortableText'
import { breadcrumbList } from '@/lib/jsonld'
import { sanityFetch } from '@/lib/sanity/client'
import {
  speciesPostBySlugQuery,
  speciesPostSlugsQuery,
} from '@/lib/sanity/queries'
import type {
  SpeciesPostBySlugQueryResult,
  SpeciesPostSlugsQueryResult,
} from '@/sanity.types'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const slugs = (await sanityFetch({
    query: speciesPostSlugsQuery,
    tags: ['speciesPost'],
  })) as SpeciesPostSlugsQueryResult
  return slugs
    .filter((s): s is { slug: string } => Boolean(s.slug))
    .map((s) => ({ slug: s.slug }))
}

async function getPost(slug: string): Promise<SpeciesPostBySlugQueryResult> {
  return (await sanityFetch({
    query: speciesPostBySlugQuery,
    params: { slug },
    tags: ['speciesPost', `speciesPost:${slug}`],
  })) as SpeciesPostBySlugQueryResult
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await props.params
  const post = await getPost(slug)
  if (!post) return {}
  const description = post.descriptionText
    ? post.descriptionText.replace(/\s+/g, ' ').trim().slice(0, 155)
    : undefined
  return { title: post.name ?? 'Species Post', description }
}

export default async function SpeciesPostPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const post = await getPost(slug)
  if (!post) notFound()

  const title = post.name ?? post.id ?? post._id
  const species = (post.species ?? []).filter(
    (s): s is { name: string | null; slug: string | null } => Boolean(s?.name),
  )

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <nav
        aria-label="Breadcrumb"
        className="font-mono text-xs uppercase tracking-wider text-header"
      >
        <Link href="/" className="hover:text-green-dark">
          Home
        </Link>{' '}
        {'›'}{' '}
        <Link href="/species" className="hover:text-green-dark">
          Species
        </Link>{' '}
        {'›'} {title}
      </nav>

      <header className="space-y-3">
        <h1 className="font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          {title}
        </h1>
        {species.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {species.map((s) =>
              s.slug ? (
                <Link
                  key={s.name}
                  href={`/species/${s.slug}`}
                  className="rounded-[3px] bg-green-dark/15 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-green-dark hover:bg-green-dark/25"
                >
                  {s.name}
                </Link>
              ) : (
                <span
                  key={s.name}
                  className="rounded-[3px] bg-body px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-header/70"
                >
                  {s.name}
                </span>
              ),
            )}
          </div>
        )}
      </header>

      {post.description && (
        <div className="box">
          <SpotPortableText value={post.description as PortableTextValue} />
        </div>
      )}

      <JsonLd
        data={breadcrumbList([
          { name: 'Home', path: '/' },
          { name: 'Species', path: '/species' },
          { name: title },
        ])}
      />
    </main>
  )
}
