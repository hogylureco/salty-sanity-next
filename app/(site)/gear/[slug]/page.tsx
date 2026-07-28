import {
  TaxonomyDetail,
  generateTaxonomyMetadata,
  generateTaxonomyStaticParams,
} from '@/components/taxonomy/TaxonomyDetail'

// The /gear index lists `gearPost` articles, but the detail route also resolves
// `lureGearCategory` slugs so the spot page's "Lure Gear Category" chips (and the
// sitemap) keep working.
const TYPES = ['gearPost', 'lureGearCategory']
const SEGMENT = 'gear'
const LABEL = 'Gear'

export const revalidate = 3600
export const dynamicParams = true

export function generateStaticParams() {
  return generateTaxonomyStaticParams(TYPES)
}

export function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  return generateTaxonomyMetadata(TYPES, SEGMENT, props.params)
}

export default function Page(props: { params: Promise<{ slug: string }> }) {
  return (
    <TaxonomyDetail
      types={TYPES}
      segment={SEGMENT}
      label={LABEL}
      params={props.params}
    />
  )
}
