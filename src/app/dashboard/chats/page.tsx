import StickyPageHeader from '@/components/StickyPageHeader'
import { getChatUebersicht, getNachrichtenFuerProjekt } from '@/app/actions/nachrichten'
import ChatsClient from './ChatsClient'

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ projekt?: string }>
}) {
  const { projekt } = await searchParams

  const [uebersicht, aktiveNachrichten] = await Promise.all([
    getChatUebersicht(),
    projekt ? getNachrichtenFuerProjekt(projekt) : Promise.resolve([]),
  ])

  // Wenn kein Projekt-Param gesetzt: automatisch ersten nehmen
  const aktiveProjektId = projekt ?? uebersicht[0]?.projektId ?? null
  const aktiverEintrag  = uebersicht.find((e) => e.projektId === aktiveProjektId) ?? null

  return (
    <div className="flex-1 overflow-hidden flex flex-col animate-fadeIn">
      <StickyPageHeader
        title="Chats"
        count={uebersicht.length}
        subtitle="Direkte Nachrichten mit Portal-Kunden"
      />
      <div className="flex-1 overflow-hidden px-6 py-6">
        <ChatsClient
          uebersicht={uebersicht}
          aktiverEintrag={aktiverEintrag}
          initialNachrichten={aktiveNachrichten}
        />
      </div>
    </div>
  )
}
