'use client'

import { useState, useTransition } from 'react'
import { Plus, Truck, Hammer, Paintbrush, Wrench, MoreHorizontal, Trash2 } from 'lucide-react'
import {
  zusatzkostenAnlegen,
  zusatzkostenLoeschen,
} from '@/app/actions/raum-zusatzkosten'
import { parseGeldwert, formatEuro } from '@/lib/geld'
import type { RaumZusatzkosten, RaumZusatzkostenKategorie } from '@/lib/supabase/types'

const KATEGORIE_LABELS: Record<RaumZusatzkostenKategorie, { label: string; icon: typeof Truck }> = {
  lieferung:     { label: 'Lieferung',      icon: Truck },
  handwerker:    { label: 'Handwerker',     icon: Hammer },
  malerarbeiten: { label: 'Malerarbeiten',  icon: Paintbrush },
  montage:       { label: 'Montage',        icon: Wrench },
  sonstiges:     { label: 'Sonstiges',      icon: MoreHorizontal },
}

interface Props {
  raumId:    string
  projektId: string
  mwstSatz:  number  // 0.19 = 19%
  initial:   RaumZusatzkosten[]
}

export default function RaumZusatzkostenBlock({ raumId, projektId, mwstSatz, initial }: Props) {
  const [eintraege, setEintraege]   = useState<RaumZusatzkosten[]>(initial)
  const [formOffen, setFormOffen]   = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fehler, setFehler]         = useState<string | null>(null)

  // Form-State
  const [titel, setTitel]           = useState('')
  const [kategorie, setKategorie]   = useState<RaumZusatzkostenKategorie>('lieferung')
  const [betragInput, setBetragInput] = useState('')
  const [notiz, setNotiz]           = useState('')

  function reset() {
    setTitel(''); setKategorie('lieferung'); setBetragInput(''); setNotiz('')
    setFehler(null); setFormOffen(false)
  }

  function anlegen() {
    setFehler(null)
    const betrag = parseGeldwert(betragInput)
    if (!titel.trim())            { setFehler('Titel ist erforderlich.'); return }
    if (betrag == null || betrag < 0) { setFehler('Bitte einen gültigen Netto-Betrag eingeben.'); return }
    startTransition(async () => {
      const res = await zusatzkostenAnlegen(raumId, projektId, {
        titel, kategorie, betrag_netto: betrag, notiz,
      })
      if (!res.erfolg || !res.eintrag) { setFehler(res.fehler ?? 'Fehler beim Speichern.'); return }
      setEintraege((prev) => [...prev, res.eintrag!])
      reset()
    })
  }

  function loeschen(id: string) {
    const vorher = eintraege
    setEintraege((prev) => prev.filter((e) => e.id !== id))
    startTransition(async () => {
      const res = await zusatzkostenLoeschen(id, raumId, projektId)
      if (!res.erfolg) {
        setEintraege(vorher)  // Rollback
        setFehler(res.fehler ?? 'Konnte nicht gelöscht werden.')
      }
    })
  }

  const summeNetto  = eintraege.reduce((s, e) => s + e.betrag_netto, 0)
  const summeBrutto = summeNetto * (1 + mwstSatz)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Zusatzkosten</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Lieferung, Handwerker, Montage — fließen in die Budget-Auslastung ein.
          </p>
        </div>
        {!formOffen && (
          <button
            type="button"
            onClick={() => setFormOffen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 hover:bg-wellbeing-green/5 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            Hinzufügen
          </button>
        )}
      </div>

      {/* Formular */}
      {formOffen && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Titel (z. B. Spedition Sofa)"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              className="sm:col-span-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
            />
            <select
              value={kategorie}
              onChange={(e) => setKategorie(e.target.value as RaumZusatzkostenKategorie)}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
            >
              {(Object.keys(KATEGORIE_LABELS) as RaumZusatzkostenKategorie[]).map((k) => (
                <option key={k} value={k}>{KATEGORIE_LABELS[k].label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                placeholder="Netto (z. B. 250)"
                value={betragInput}
                onChange={(e) => setBetragInput(e.target.value)}
                className="w-full px-3 py-2 pr-8 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
            </div>
            <input
              type="text"
              placeholder="Notiz (optional)"
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              className="sm:col-span-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
            />
          </div>
          {fehler && <p className="text-xs text-red-600">{fehler}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={anlegen}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-lg transition-colors"
            >
              {isPending ? 'Speichern…' : 'Speichern'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {eintraege.length === 0 && !formOffen ? (
        <div className="px-4 py-6 text-center text-xs text-gray-400">
          Noch keine Zusatzkosten erfasst.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {eintraege.map((e) => {
            const Icon = KATEGORIE_LABELS[e.kategorie].icon
            const brutto = e.betrag_netto * (1 + mwstSatz)
            return (
              <li key={e.id} className="px-4 py-3 flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{e.titel}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {KATEGORIE_LABELS[e.kategorie].label}
                    {e.notiz && <> · {e.notiz}</>}
                  </p>
                </div>
                <div className="text-right shrink-0" title={`Netto ${formatEuro(e.betrag_netto, { dezimalen: 2 })}`}>
                  <p className="text-sm font-mono font-semibold text-wellbeing-green tabular-nums">
                    {formatEuro(brutto, { dezimalen: 2 })}
                  </p>
                  <p className="text-[10px] text-gray-400 tabular-nums">
                    brutto · {formatEuro(e.betrag_netto, { dezimalen: 2 })} netto
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loeschen(e.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 shrink-0"
                  aria-label="Zusatzkosten loeschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Summe */}
      {eintraege.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <p className="text-xs text-gray-500">Summe Zusatzkosten</p>
          <p className="text-sm font-mono font-semibold text-gray-900 tabular-nums" title={`Netto ${formatEuro(summeNetto, { dezimalen: 2 })}`}>
            {formatEuro(summeBrutto, { dezimalen: 2 })}
            <span className="text-[10px] text-gray-400 ml-1.5 font-normal">brutto</span>
          </p>
        </div>
      )}
    </div>
  )
}
