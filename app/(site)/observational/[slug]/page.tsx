import {
  FactorDetail,
  generateFactorMetadata,
  generateFactorStaticParams,
} from '@/components/system/FactorDetail'

const TYPE = 'observational'
const SEGMENT = 'observational'
const LABEL = 'Observational Factors'

export const revalidate = 3600
export const dynamicParams = true

export function generateStaticParams() {
  return generateFactorStaticParams(TYPE)
}

export function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  return generateFactorMetadata(TYPE, SEGMENT, props.params)
}

export default function Page(props: { params: Promise<{ slug: string }> }) {
  return (
    <FactorDetail type={TYPE} label={LABEL} params={props.params} />
  )
}
