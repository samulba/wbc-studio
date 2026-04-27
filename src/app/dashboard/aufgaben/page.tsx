import { getAufgaben, getAufgabePickerOptionen } from '@/app/actions/aufgaben'
import AufgabenBoardClient from './AufgabenBoardClient'

export const dynamic = 'force-dynamic'

export default async function AufgabenPage({
  searchParams,
}: {
  searchParams: Promise<{ archiviert?: string }>
}) {
  const params = await searchParams
  const istArchiv = params.archiviert === '1'
  const [aufgaben, pickerOptionen] = await Promise.all([
    getAufgaben({ archiviert: istArchiv }),
    getAufgabePickerOptionen(),
  ])

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn bg-gray-50">
      <AufgabenBoardClient
        initialeAufgaben={aufgaben}
        pickerOptionen={pickerOptionen}
        zeigeArchiv={istArchiv}
      />
    </div>
  )
}
