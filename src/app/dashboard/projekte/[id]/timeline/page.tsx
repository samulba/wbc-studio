import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { eventsAbrufen } from '@/app/actions/timeline'
import TimelineView from './TimelineView'

interface Props {
  params: { id: string }
}

export default async function TimelinePage({ params }: Props) {
  const supabase = await createClient()

  const [{ data: projekt }, { data: raeume }, events] = await Promise.all([
    supabase
      .from('projekte')
      .select('id, name, kunden(name)')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('raeume')
      .select('id, name')
      .eq('projekt_id', params.id)
      .is('deleted_at', null)
      .order('reihenfolge')
      .order('name'),
    eventsAbrufen(params.id),
  ])

  if (!projekt) notFound()

  return (
    <div className="flex-1 overflow-hidden flex flex-col animate-fadeIn">
      <TimelineView
        projektId={params.id}
        projektName={projekt.name}
        initialEvents={events}
        raeume={(raeume ?? []) as { id: string; name: string }[]}
      />
    </div>
  )
}
