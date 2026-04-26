'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertTriangle, Calendar, MessageCircle, ChevronRight, Send } from 'lucide-react'
import {
  portalAufgabeErledigen, portalAufgabeKommentar,
  type PortalAufgabe,
} from '@/app/actions/portal'

const PRIO_FARBE: Record<PortalAufgabe['prioritaet'], string> = {
  niedrig: 'bg-gray-300', normal: 'bg-blue-400',
  hoch: 'bg-amber-500',  dringend: 'bg-red-500',
}

export default function PortalAufgabenSektion({
  aufgaben, prim,
}: {
  aufgaben: PortalAufgabe[]
  prim: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [erledigtIds, setErledigtIds] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [kommentar, setKommentar] = useState('')
  const [info, setInfo] = useState<string | null>(null)

  const sichtbar = aufgaben.filter((a) => !erledigtIds.has(a.id))

  function toggleErledigen(id: string, currentlyErledigt: boolean) {
    if (!currentlyErledigt) {
      setErledigtIds((prev) => new Set(prev).add(id))
    }
    startTransition(async () => {
      const res = await portalAufgabeErledigen(id)
      if (res.fehler) {
        setErledigtIds((prev) => {
          const n = new Set(prev); n.delete(id); return n
        })
        setInfo(res.fehler)
        setTimeout(() => setInfo(null), 3000)
      } else {
        router.refresh()
      }
    })
  }

  function submitKommentar(id: string) {
    const text = kommentar.trim()
    if (!text) return
    startTransition(async () => {
      const res = await portalAufgabeKommentar(id, text)
      if (res.fehler) {
        setInfo(res.fehler)
        setTimeout(() => setInfo(null), 3000)
      } else {
        setKommentar('')
        setInfo('Kommentar gesendet ✓')
        setTimeout(() => setInfo(null), 2000)
      }
    })
  }

  return (
    <div className="space-y-2">
      {info && (
        <div className="rounded-xl bg-black/[0.04] border border-black/[0.05] px-3 py-2 text-xs">
          {info}
        </div>
      )}
      {sichtbar.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-black/[0.08] p-6 text-center text-xs text-gray-500">
          Alle deine Aufgaben sind erledigt — danke! 🎉
        </div>
      )}
      <ul className="space-y-2">
        {sichtbar.map((a) => {
          const erledigt = a.status === 'erledigt'
          const heute = new Date().toISOString().slice(0, 10)
          const ueberfaellig = !!a.faellig_am && a.faellig_am < heute && !erledigt
          const istExpand = expanded === a.id
          return (
            <li key={a.id} className="rounded-2xl bg-white border border-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-3">
                {a.assignee_kunde ? (
                  <button
                    onClick={() => toggleErledigen(a.id, erledigt)}
                    disabled={pending}
                    aria-label={erledigt ? 'Erledigung zuruecknehmen' : 'Aufgabe erledigen'}
                    className={
                      'shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all ' +
                      (erledigt
                        ? 'border-transparent text-white'
                        : 'border-black/20 hover:border-current text-transparent hover:text-current')
                    }
                    style={erledigt ? { background: prim } : undefined}
                  >
                    <Check size={14} />
                  </button>
                ) : (
                  <div className="shrink-0 w-6 h-6 rounded-full bg-black/[0.06] flex items-center justify-center text-[10px] opacity-50">
                    ℹ️
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIO_FARBE[a.prioritaet]}`} />
                    <p className={
                      'text-sm font-medium ' +
                      (erledigt ? 'line-through opacity-50' : '')
                    }>{a.titel}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] opacity-60 flex-wrap">
                    {a.projekt_name && <span>{a.projekt_name}</span>}
                    {a.raum_name    && <span>· {a.raum_name}</span>}
                    {a.faellig_am && (
                      <span className={'inline-flex items-center gap-1 ' + (ueberfaellig ? 'text-red-600' : '')}>
                        {ueberfaellig ? <AlertTriangle size={11} /> : <Calendar size={11} />}
                        {formatDate(a.faellig_am)}
                      </span>
                    )}
                    {a.checklist_gesamt > 0 && (
                      <span>· {a.checklist_gesamt - a.checklist_offen}/{a.checklist_gesamt}</span>
                    )}
                    {!a.assignee_kunde && (
                      <span className="px-1.5 py-0.5 rounded bg-black/[0.04]">Nur zur Info</span>
                    )}
                  </div>
                  {a.beschreibung && istExpand && (
                    <p className="text-xs text-gray-700 whitespace-pre-wrap mt-2">{a.beschreibung}</p>
                  )}
                </div>
                <button
                  onClick={() => setExpanded(istExpand ? null : a.id)}
                  className="shrink-0 text-gray-400 hover:text-current p-1"
                  aria-label={istExpand ? 'Einklappen' : 'Mehr'}
                >
                  <ChevronRight size={16} className={istExpand ? 'rotate-90 transition' : 'transition'} />
                </button>
              </div>
              {istExpand && (
                <div className="border-t border-black/[0.05] px-4 py-3 bg-black/[0.015]">
                  <label className="block text-[11px] font-medium opacity-50 uppercase mb-2 flex items-center gap-1">
                    <MessageCircle size={10} /> Frage / Antwort hinzufuegen
                  </label>
                  <div className="flex items-end gap-2">
                    <textarea
                      rows={2}
                      value={kommentar}
                      onChange={(e) => setKommentar(e.target.value)}
                      placeholder="Notiz oder Frage…"
                      className="flex-1 text-sm border border-black/10 rounded-xl px-3 py-2 outline-none focus:border-current resize-none bg-white"
                    />
                    <button
                      onClick={() => submitKommentar(a.id)}
                      disabled={pending || !kommentar.trim()}
                      aria-label="Kommentar senden"
                      className="px-3 py-2 rounded-xl text-white disabled:opacity-50 inline-flex items-center gap-1.5 text-sm"
                      style={{ background: prim }}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}
