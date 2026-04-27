'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, AlertTriangle, Check, ChevronUp, ChevronDown, FolderOpen } from 'lucide-react'
import { aufgabeStatusAendern } from '@/app/actions/aufgaben'
import AufgabeDetailModal from '@/components/AufgabeDetailModal'
import type { AufgabeMitDetails, AufgabeStatus, AufgabePrioritaet } from '@/lib/supabase/types'
import type { AufgabePickerOptionen } from '@/app/actions/aufgaben'

const STATUS_LABEL: Record<AufgabeStatus, string> = {
  backlog: 'Offen', in_arbeit: 'In Arbeit', review: 'Review', erledigt: 'Erledigt',
}
const STATUS_FARBE: Record<AufgabeStatus, string> = {
  backlog: 'bg-gray-100 text-gray-700',
  in_arbeit: 'bg-blue-50 text-blue-700',
  review: 'bg-amber-50 text-amber-700',
  erledigt: 'bg-emerald-50 text-emerald-700',
}
const PRIO_PUNKT: Record<AufgabePrioritaet, string> = {
  niedrig: 'bg-gray-300', normal: 'bg-blue-400',
  hoch: 'bg-amber-500', dringend: 'bg-red-500',
}
const PRIO_RANG: Record<AufgabePrioritaet, number> = {
  dringend: 4, hoch: 3, normal: 2, niedrig: 1,
}

type SortKey = 'titel' | 'status' | 'prioritaet' | 'faellig_am' | 'projekt'
type SortDir = 'asc' | 'desc'

export default function AufgabenListe({
  aufgaben,
  pickerOptionen,
}: {
  aufgaben: AufgabeMitDetails[]
  pickerOptionen?: AufgabePickerOptionen
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [sort, setSort] = useState<SortKey>('faellig_am')
  const [dir, setDir] = useState<SortDir>('asc')
  const [detailId, setDetailId] = useState<string | null>(null)

  function toggleSort(k: SortKey) {
    if (sort === k) setDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(k); setDir('asc') }
  }

  const sortiert = useMemo(() => {
    const liste = [...aufgaben]
    liste.sort((a, b) => {
      let v = 0
      switch (sort) {
        case 'titel': v = a.titel.localeCompare(b.titel); break
        case 'status': v = a.status.localeCompare(b.status); break
        case 'prioritaet': v = PRIO_RANG[a.prioritaet] - PRIO_RANG[b.prioritaet]; break
        case 'faellig_am':
          if (!a.faellig_am && !b.faellig_am) v = 0
          else if (!a.faellig_am) v = 1
          else if (!b.faellig_am) v = -1
          else v = a.faellig_am.localeCompare(b.faellig_am)
          break
        case 'projekt': v = (a.projekt?.name ?? '').localeCompare(b.projekt?.name ?? ''); break
      }
      return dir === 'asc' ? v : -v
    })
    return liste
  }, [aufgaben, sort, dir])

  function handleErledigen(a: AufgabeMitDetails) {
    if (a.status === 'erledigt') return
    startTransition(async () => {
      await aufgabeStatusAendern(a.id, 'erledigt')
      router.refresh()
    })
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/40 text-xs uppercase text-gray-500">
              <th className="px-4 py-3 w-10"></th>
              <SortHeader k="titel"      label="Titel"      sort={sort} dir={dir} onClick={toggleSort} />
              <SortHeader k="status"     label="Status"     sort={sort} dir={dir} onClick={toggleSort} />
              <SortHeader k="prioritaet" label="Priorität"  sort={sort} dir={dir} onClick={toggleSort} />
              <SortHeader k="faellig_am" label="Fällig"     sort={sort} dir={dir} onClick={toggleSort} />
              <SortHeader k="projekt"    label="Projekt"    sort={sort} dir={dir} onClick={toggleSort} />
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortiert.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                  Keine Aufgaben gefunden.
                </td>
              </tr>
            )}
            {sortiert.map((a) => {
              const heute = new Date().toISOString().slice(0, 10)
              const ueberfaellig = !!a.faellig_am && a.faellig_am < heute && a.status !== 'erledigt'
              const erledigt = a.status === 'erledigt'
              return (
                <tr
                  key={a.id}
                  className="group border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer"
                  onClick={() => setDetailId(a.id)}
                >
                  <td className="px-4 py-2.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleErledigen(a) }}
                      aria-label="Erledigen"
                      disabled={erledigt}
                      className={
                        'w-5 h-5 rounded border flex items-center justify-center transition-colors ' +
                        (erledigt
                          ? 'bg-wellbeing-green border-wellbeing-green text-white'
                          : 'border-gray-300 hover:border-wellbeing-green text-transparent hover:text-wellbeing-green')
                      }
                    >
                      <Check size={12} />
                    </button>
                  </td>
                  <td className={'px-4 py-2.5 ' + (erledigt ? 'line-through text-gray-400' : 'text-gray-900')}>
                    <div className="font-medium truncate max-w-md">{a.titel}</div>
                    {a.kunde && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{a.kunde.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_FARBE[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 capitalize">
                      <span className={`w-1.5 h-1.5 rounded-full ${PRIO_PUNKT[a.prioritaet]}`} />
                      {a.prioritaet}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {a.faellig_am ? (
                      <span className={
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ' +
                        (ueberfaellig ? 'text-red-600 bg-red-50'
                          : a.faellig_am === heute ? 'text-amber-700 bg-amber-50'
                          : 'text-gray-600')
                      }>
                        {ueberfaellig ? <AlertTriangle size={11} /> : <Calendar size={11} />}
                        {new Date(a.faellig_am + 'T00:00:00Z').toLocaleDateString('de-DE')}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {a.projekt ? (
                      <span className="inline-flex items-center gap-1.5 truncate max-w-[200px]">
                        <FolderOpen size={11} className="text-gray-400 shrink-0" />
                        <span className="truncate">{a.projekt.name}</span>
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-gray-300 group-hover:text-wellbeing-green text-xs">→</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <AufgabeDetailModal
        aufgabe={aufgaben.find((a) => a.id === detailId) ?? null}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        pickerOptionen={pickerOptionen}
      />
    </>
  )
}

function SortHeader({
  k, label, sort, dir, onClick,
}: {
  k: SortKey
  label: string
  sort: SortKey
  dir: SortDir
  onClick: (k: SortKey) => void
}) {
  const aktiv = sort === k
  return (
    <th className="px-4 py-3 text-left">
      <button
        onClick={() => onClick(k)}
        className={'inline-flex items-center gap-1 hover:text-gray-900 ' + (aktiv ? 'text-gray-900' : '')}
      >
        {label}
        {aktiv && (dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
      </button>
    </th>
  )
}
