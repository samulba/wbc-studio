'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import OnboardingUploadFeld from '@/components/onboarding/OnboardingUploadFeld'
import OnboardingLinkListeFeld from '@/components/onboarding/OnboardingLinkListeFeld'
import type {
  OnboardingFrage,
  OnboardingDatei,
  OnboardingLinkEintrag,
} from '@/lib/supabase/types'

// ── Shared Helpers (auch in OnboardingFormular.tsx + Modal-Komponenten genutzt)

export function inputCls(hatFehler: boolean) {
  return `w-full px-4 py-3 text-sm border rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 transition bg-gray-50 ${
    hatFehler
      ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
      : 'border-gray-200 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light'
  }`
}

export function FormFeld({
  label, fehler, hilfe, children,
}: {
  label: string
  fehler?: string
  hilfe?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {hilfe && <p className="text-xs text-gray-500 mb-2">{hilfe}</p>}
      {children}
      {fehler && <p className="text-xs text-red-500 mt-1">{fehler}</p>}
    </div>
  )
}

function EintragHinzufuegen({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState('')
  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder={placeholder}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onAdd(v); setV('') }
        }}
        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
      />
      <button
        type="button"
        onClick={() => { onAdd(v); setV('') }}
        className="px-3 py-2 text-sm font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-lg inline-flex items-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> Hinzufügen
      </button>
    </div>
  )
}

interface Props {
  token: string
  frage: OnboardingFrage
  wert: unknown
  fehler?: string
  onChange: (v: unknown) => void
  onToggle: (opt: string) => void
}

export default function DynamischesFeld({
  token, frage, wert, fehler, onChange, onToggle,
}: Props) {
  const label = frage.titel + (frage.pflichtfeld ? ' *' : '')
  const hilfe = frage.beschreibung

  if (frage.typ === 'text' || frage.typ === 'datum' || frage.typ === 'email' || frage.typ === 'telefon' || frage.typ === 'url') {
    const htmlType = frage.typ === 'datum' ? 'date'
      : frage.typ === 'email' ? 'email'
      : frage.typ === 'telefon' ? 'tel'
      : frage.typ === 'url' ? 'url'
      : 'text'
    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe}>
        <input
          type={htmlType}
          placeholder={frage.placeholder ?? ''}
          value={(wert as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls(!!fehler)}
        />
      </FormFeld>
    )
  }

  if (frage.typ === 'zahl') {
    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe}>
        <input
          type="number"
          placeholder={frage.placeholder ?? ''}
          value={(wert as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls(!!fehler)}
        />
      </FormFeld>
    )
  }

  if (frage.typ === 'textarea') {
    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe}>
        <textarea
          rows={4}
          placeholder={frage.placeholder ?? ''}
          value={(wert as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-3 text-sm border rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 transition bg-gray-50 resize-none ${
            fehler
              ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
              : 'border-gray-200 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light'
          }`}
        />
      </FormFeld>
    )
  }

  if (frage.typ === 'ja_nein') {
    const val = wert as string | undefined
    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe}>
        <div className="flex gap-2">
          {['Ja', 'Nein'].map((opt) => {
            const aktiv = val === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(aktiv ? '' : opt)}
                className={`flex-1 px-4 py-2.5 text-sm rounded-xl border font-medium transition-all ${
                  aktiv
                    ? 'bg-wellbeing-green/10 border-wellbeing-green text-wellbeing-green-dark'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {aktiv && '✓ '}{opt}
              </button>
            )
          })}
        </div>
      </FormFeld>
    )
  }

  if (frage.typ === 'bewertung') {
    const val = Number(wert) || 0
    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe}>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(val === n ? 0 : n)}
              className={`w-10 h-10 rounded-xl text-lg transition-all ${
                n <= val ? 'bg-wellbeing-green text-white' : 'bg-gray-50 border border-gray-200 text-gray-300 hover:border-gray-300'
              }`}
              aria-label={`${n} von 5`}
            >
              ★
            </button>
          ))}
        </div>
      </FormFeld>
    )
  }

  if (frage.typ === 'skala' || frage.typ === 'slider') {
    const min  = frage.typ === 'slider' ? (frage.slider_min ?? 0) : 1
    const max  = frage.typ === 'slider' ? (frage.slider_max ?? 100) : 10
    const step = frage.typ === 'slider' ? (frage.slider_schritt ?? 1) : 1
    const einheit = frage.slider_einheit ?? ''
    const val = Number(wert)
    const anzeige = Number.isFinite(val) ? val : Math.round((min + max) / 2)
    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe}>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{min}{einheit}</span>
            <span className="text-sm font-semibold text-wellbeing-green-dark">{anzeige}{einheit}</span>
            <span>{max}{einheit}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={anzeige}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-wellbeing-green"
          />
        </div>
      </FormFeld>
    )
  }

  if (frage.typ === 'auswahl' || frage.typ === 'mehrfachauswahl') {
    const mehrfach = frage.typ === 'mehrfachauswahl'
    const maxAuswahl = frage.max_auswahl
    const ausgewaehlt = mehrfach
      ? ((wert as string[]) ?? [])
      : wert as string | undefined

    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe}>
        <div className="flex flex-wrap gap-2">
          {(frage.optionen ?? []).map((opt) => {
            const aktiv = mehrfach
              ? (ausgewaehlt as string[]).includes(opt)
              : ausgewaehlt === opt
            const limitErreicht = mehrfach
              && !aktiv
              && maxAuswahl != null
              && (ausgewaehlt as string[]).length >= maxAuswahl
            return (
              <button
                key={opt}
                type="button"
                disabled={limitErreicht}
                onClick={() => onToggle(opt)}
                className={`px-4 py-2 text-sm rounded-full border font-medium transition-all ${
                  aktiv
                    ? 'bg-wellbeing-green/10 border-wellbeing-green text-wellbeing-green-dark'
                    : limitErreicht
                    ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {aktiv && '✓ '}{opt}
              </button>
            )
          })}
        </div>
        {mehrfach && maxAuswahl != null && (
          <p className="text-[11px] text-gray-400 mt-1.5">
            Maximal {maxAuswahl} Auswahl{maxAuswahl === 1 ? '' : 'en'} ({(ausgewaehlt as string[]).length}/{maxAuswahl})
          </p>
        )}
      </FormFeld>
    )
  }

  if (frage.typ === 'upload') {
    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe}>
        <OnboardingUploadFeld
          token={token}
          frageId={frage.id}
          wert={(wert as OnboardingDatei[]) ?? []}
          onChange={(next) => onChange(next)}
          erlaubteTypen={frage.upload_typen}
          maxMb={frage.upload_max_mb ?? 50}
          maxDateien={frage.upload_max_dateien ?? 10}
        />
      </FormFeld>
    )
  }

  if (frage.typ === 'link_liste') {
    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe}>
        <OnboardingLinkListeFeld
          wert={(wert as OnboardingLinkEintrag[]) ?? []}
          onChange={(next) => onChange(next)}
        />
      </FormFeld>
    )
  }

  if (frage.typ === 'checkliste') {
    const optionen = frage.optionen ?? []
    const aktiv = (wert as string[]) ?? []
    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe}>
        <div className="space-y-1.5">
          {optionen.map((opt) => {
            const checked = aktiv.includes(opt)
            return (
              <label
                key={opt}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(opt)}
                  className="accent-wellbeing-green"
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            )
          })}
        </div>
      </FormFeld>
    )
  }

  if (frage.typ === 'rangfolge' || frage.typ === 'prioritaeten') {
    const optionen = frage.optionen ?? []
    const reihenfolge = (wert as string[] | undefined) ?? optionen
    const move = (i: number, delta: number) => {
      const next = [...reihenfolge]
      const j = i + delta
      if (j < 0 || j >= next.length) return
      ;[next[i], next[j]] = [next[j], next[i]]
      onChange(next)
    }
    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe ?? 'Sortieren Sie nach Wichtigkeit (oben = wichtigster).'}>
        <ul className="space-y-1.5">
          {reihenfolge.map((opt, i) => (
            <li
              key={`${i}-${opt}`}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
              <span className="flex-1 text-sm text-gray-700">{opt}</span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-gray-400 hover:text-wellbeing-green disabled:opacity-30"
                aria-label="Nach oben"
              >▲</button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === reihenfolge.length - 1}
                className="text-gray-400 hover:text-wellbeing-green disabled:opacity-30"
                aria-label="Nach unten"
              >▼</button>
            </li>
          ))}
        </ul>
      </FormFeld>
    )
  }

  if (frage.typ === 'budget_verteilung') {
    const kategorien = frage.budget_kategorien ?? []
    const verteilung = (wert as Record<string, number> | undefined) ?? {}
    const summe = Object.values(verteilung).reduce((s, v) => s + (Number(v) || 0), 0)
    const update = (kat: string, v: string) => {
      const num = Number(v) || 0
      onChange({ ...verteilung, [kat]: num })
    }
    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe ?? 'Verteilung in % — Summe sollte 100 ergeben.'}>
        <div className="space-y-2">
          {kategorien.map((kat) => (
            <div key={kat} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-gray-700">{kat}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={verteilung[kat] ?? ''}
                onChange={(e) => update(kat, e.target.value)}
                className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-right"
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
          ))}
          <div className={`text-xs text-right ${summe === 100 ? 'text-wellbeing-green' : 'text-gray-500'}`}>
            Summe: {summe}%
          </div>
        </div>
      </FormFeld>
    )
  }

  if (frage.typ === 'datum_rechner') {
    const v = (wert as { startdatum?: string; tage?: number } | undefined) ?? {}
    return (
      <FormFeld label={label} fehler={fehler} hilfe={hilfe ?? 'Startdatum + gewünschte Frist in Tagen.'}>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={v.startdatum ?? ''}
            onChange={(e) => onChange({ ...v, startdatum: e.target.value })}
            className={inputCls(false)}
          />
          <input
            type="number"
            min={1}
            placeholder="Tage"
            value={v.tage ?? ''}
            onChange={(e) => onChange({ ...v, tage: Number(e.target.value) || 0 })}
            className={inputCls(false)}
          />
        </div>
      </FormFeld>
    )
  }

  if (frage.typ === 'inventar' || frage.typ === 'entscheider_matrix') {
    const eintraege = (wert as string[]) ?? []
    const add = (v: string) => {
      if (!v.trim()) return
      onChange([...eintraege, v.trim()])
    }
    const remove = (i: number) => {
      onChange(eintraege.filter((_, idx) => idx !== i))
    }
    return (
      <FormFeld
        label={label}
        fehler={fehler}
        hilfe={hilfe ?? (frage.typ === 'inventar'
          ? 'Listen Sie Ihre Bestands-Möbel auf (eine Zeile pro Eintrag).'
          : 'Listen Sie auf, wer welche Entscheidung trifft.')}
      >
        <ul className="space-y-1.5 mb-2">
          {eintraege.map((eintrag, i) => (
            <li key={`${i}-${eintrag}`} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
              <span className="flex-1 text-sm text-gray-700">{eintrag}</span>
              <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500" aria-label="Entfernen">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <EintragHinzufuegen onAdd={add} placeholder={frage.placeholder ?? 'Eintrag hinzufügen'} />
      </FormFeld>
    )
  }

  return (
    <FormFeld label={label} fehler={fehler} hilfe="Dieser Fragetyp wird nicht unterstützt.">
      <div className="px-3 py-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg">
        Unbekannter Fragetyp: {frage.typ}
      </div>
    </FormFeld>
  )
}
