'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import EuroBudgetInput from '@/components/EuroBudgetInput'
import type { ProjektActionState } from '@/app/actions/projekte'
import type { Kunde, Projekt } from '@/lib/supabase/types'

export const PROJEKT_STATUS = [
  { wert: 'offen', label: 'Offen' },
  { wert: 'in_bearbeitung', label: 'In Bearbeitung' },
  { wert: 'freigegeben', label: 'Freigegeben' },
  { wert: 'abgeschlossen', label: 'Abgeschlossen' },
]

function SpeichernButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {pending ? 'Wird gespeichert…' : 'Speichern'}
    </button>
  )
}

interface Props {
  aktion: (prevState: ProjektActionState, formData: FormData) => Promise<ProjektActionState>
  kunden: Pick<Kunde, 'id' | 'name'>[]
  projektarten: { name: string }[]
  initialData?: Projekt
  abbrechen: string
  istBearbeiten?: boolean
  vorausgewaehlterKundeId?: string
}

export default function ProjektFormular({
  aktion,
  kunden,
  projektarten,
  initialData,
  abbrechen,
  istBearbeiten = false,
  vorausgewaehlterKundeId,
}: Props) {
  const [state, formAction] = useFormState(aktion, null)
  const [serviceModell, setServiceModell]     = useState<string>(initialData?.service_modell ?? '')
  const [produktBudget, setProduktBudget]     = useState<number | null>(initialData?.produkt_budget ?? null)
  const [servicePauschale, setServicePauschale] = useState<number | null>(initialData?.service_pauschale ?? null)

  // Auto-berechneter Gesamtwert = Produkt-Budget + Service-Pauschale (Netto).
  const autoGesamt = (produktBudget ?? 0) + (servicePauschale ?? 0)
  const eurFmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  return (
    <form action={formAction} className="space-y-5">
      {state?.fehler && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.fehler}
        </div>
      )}

      {/* Projektname */}
      <div>
        <label htmlFor="name" className={lbl}>
          Projektname <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initialData?.name ?? ''}
          className={inp}
          placeholder="z. B. Hotel Seeblick – Zimmer 101–120"
        />
      </div>

      {/* Kunde */}
      <div>
        <label htmlFor="kunde_id" className={lbl}>
          Kunde <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <select
            id="kunde_id"
            name="kunde_id"
            required
            defaultValue={initialData?.kunde_id ?? vorausgewaehlterKundeId ?? ''}
            className={sel}
          >
            <option value="" disabled>Kunde auswählen…</option>
            {kunden.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Standort & Projektart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="standort" className={lbl}>Standort</label>
          <input
            id="standort"
            name="standort"
            type="text"
            defaultValue={initialData?.standort ?? ''}
            className={inp}
            placeholder="z. B. München, Berlin…"
          />
        </div>
        <div>
          <label htmlFor="projektart" className={lbl}>Projektart</label>
          <div className="relative">
            <select
              id="projektart"
              name="projektart"
              defaultValue={initialData?.projektart ?? ''}
              className={sel}
            >
              <option value="">Bitte wählen…</option>
              {projektarten.map((art) => (
                <option key={art.name} value={art.name}>{art.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Status (nur beim Bearbeiten) */}
      {istBearbeiten && (
        <div>
          <label htmlFor="status" className={lbl}>Status</label>
          <div className="relative">
            <select
              id="status"
              name="status"
              defaultValue={initialData?.status ?? 'offen'}
              className={sel}
            >
              {PROJEKT_STATUS.map((s) => (
                <option key={s.wert} value={s.wert}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* ── Budget & Abrechnung ──────────────────────────────── */}
      <div className="border-t border-gray-100 pt-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
          Budget & Abrechnung
        </p>
      </div>

      {/* Produkt-Budget — Hauptfeld, klientenseitig sichtbar */}
      <div>
        <label htmlFor="produkt_budget" className={lbl}>
          Produkt-Budget netto (€){' '}
          <span className="text-wellbeing-green/70 normal-case font-normal">(klientenseitig sichtbar)</span>
        </label>
        <EuroBudgetInput
          id="produkt_budget"
          name="produkt_budget"
          defaultValue={initialData?.produkt_budget ?? null}
          className={`${inp} font-mono`}
          placeholder="z. B. 18.000"
          onValueChange={setProduktBudget}
        />
        <p className="text-xs text-gray-400 mt-1">
          Brutto bei 19 % MwSt: <span className="font-mono">{eurFmt((produktBudget ?? 0) * 1.19)}</span> · Basis für die Budget-Auslastung (ohne Service).
        </p>
      </div>

      {/* Abrechnungsmodell + Wert */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="service_modell" className={lbl}>Abrechnungsmodell</label>
          <div className="relative">
            <select
              id="service_modell"
              name="service_modell"
              value={serviceModell}
              onChange={(e) => setServiceModell(e.target.value)}
              className={sel}
            >
              <option value="">Keins</option>
              <option value="pauschale">Pauschale</option>
              <option value="stundensatz">Stundensatz</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {serviceModell === 'pauschale' && (
          <div>
            <label htmlFor="service_pauschale" className={lbl}>Pauschale netto (€)</label>
            <EuroBudgetInput
              id="service_pauschale"
              name="service_pauschale"
              defaultValue={initialData?.service_pauschale ?? null}
              className={`${inp} font-mono`}
              placeholder="z. B. 5.000"
              onValueChange={setServicePauschale}
            />
          </div>
        )}

        {serviceModell === 'stundensatz' && (
          <div>
            <label htmlFor="service_stundensatz" className={lbl}>Stundensatz netto (€/h)</label>
            <EuroBudgetInput
              id="service_stundensatz"
              name="service_stundensatz"
              defaultValue={initialData?.service_stundensatz ?? null}
              className={`${inp} font-mono`}
              placeholder="z. B. 120"
            />
          </div>
        )}
      </div>

      {/* Auto-berechneter Gesamtwert (read-only, Hint fuer User) */}
      <div className="rounded-lg bg-wellbeing-cream/40 border border-wellbeing-green/15 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-medium text-wellbeing-green-dark">
            Gesamtprojekt-Wert (Produkt + Service)
          </p>
          <p className="font-mono text-base font-semibold text-wellbeing-green-dark tabular-nums">
            {eurFmt(autoGesamt)} <span className="text-[10px] text-gray-500 font-normal">netto</span>
          </p>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          Wird automatisch berechnet — kein manuelles Feld mehr nötig. Brutto bei 19 %: {eurFmt(autoGesamt * 1.19)}.
        </p>
      </div>

      {/* Legacy: manuelles Gesamtbudget (additiv, fuer Sonderfaelle) */}
      <details className="group">
        <summary className="cursor-pointer text-[11px] text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1">
          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
          Manuelles Gesamtbudget eingeben (Legacy)
        </summary>
        <div className="mt-2 pl-4">
          <label htmlFor="gesamtbudget" className={lbl}>
            Gesamtbudget netto (€)
          </label>
          <EuroBudgetInput
            id="gesamtbudget"
            name="gesamtbudget"
            defaultValue={initialData?.gesamtbudget ?? null}
            className={`${inp} font-mono`}
            placeholder="z. B. 25.000"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Optional — überschreibt den auto-berechneten Wert oben. Bei bestehenden Projekten weiter erhalten.
          </p>
        </div>
      </details>

      {/* Notizen */}
      <div>
        <label htmlFor="beschreibung" className={lbl}>Notizen</label>
        <textarea
          id="beschreibung"
          name="beschreibung"
          rows={4}
          defaultValue={initialData?.beschreibung ?? ''}
          className={`${inp} resize-none`}
          placeholder="Interne Notizen zum Projekt…"
        />
      </div>

      {/* Aktionen */}
      <div className="flex items-center gap-3 pt-2">
        <SpeichernButton />
        <a
          href={abbrechen}
          className="px-5 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Abbrechen
        </a>
      </div>
    </form>
  )
}

const lbl = 'block text-xs font-medium text-gray-700 mb-1.5'
const inp = 'w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition'
// Select-specific: hides native arrow, adds right padding for custom chevron
const sel = `${inp} appearance-none pr-10`
