import {
  TaxonomyIndex,
  generateTaxonomyIndexMetadata,
} from '@/components/taxonomy/TaxonomyIndex'

const TYPES = ['baitfish']
const SEGMENT = 'baitfish'
const LABEL = 'Baitfish'

export const revalidate = 3600

export function generateMetadata() {
  return generateTaxonomyIndexMetadata(LABEL)
}

export default function Page() {
  return <TaxonomyIndex types={TYPES} segment={SEGMENT} label={LABEL} />
}
