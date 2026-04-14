import { notFound } from 'next/navigation'
import { getRaumplanOeffentlich } from '@/app/actions/raumplaner'
import RaumplanPraesentation from '@/components/raumplaner/RaumplanPraesentation'

interface Props { params: { token: string } }

export default async function RaumplanPage({ params }: Props) {
  const data = await getRaumplanOeffentlich(params.token)
  if (!data) notFound()

  return (
    <RaumplanPraesentation
      token={params.token}
      raumName={data.raumName}
      projektName={data.projektName}
      canvasJson={data.canvasJson}
      breiteM={data.breiteM}
      laengeM={data.laengeM}
      hoeheM={data.hoeheM}
    />
  )
}
