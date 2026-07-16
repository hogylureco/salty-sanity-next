import {
  TaxonomyDetail,
  generateTaxonomyMetadata,
  generateTaxonomyStaticParams,
} from '@/components/taxonomy/TaxonomyDetail'

const TYPES = ['region']
const SEGMENT = 'regions'
const LABEL = 'Regions'

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
