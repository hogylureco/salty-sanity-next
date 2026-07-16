import {
  TaxonomyIndex,
  generateTaxonomyIndexMetadata,
} from '@/components/taxonomy/TaxonomyIndex'

const TYPES = ['lureCatalog']
const SEGMENT = 'lures'
const LABEL = 'Lures'

export const revalidate = 3600

export function generateMetadata() {
  return generateTaxonomyIndexMetadata(LABEL)
}

export default function Page() {
  return <TaxonomyIndex types={TYPES} segment={SEGMENT} label={LABEL} />
}
