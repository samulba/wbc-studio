'use client'

import { useFormState, useFormStatus } from 'react-dom'
import type { ProjektActionState } from '@/app/actions/projekte'
import type { Kunde, Projekt } from '@/lib/supabase/types'

export const PROJEKTARTEN = [
  'Hotel',
  'Büro / Office',
  'Restaurant / Gastronomie',
  'Wohnprojekt / Residential',
  'Spa / Wellness',
  'Einzelhandel / Retail',
  'Sonstige',
]

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
      className="px-5 py-2.5 bg-wbc-gruen hover:bg-wbc-gruen-dark disabled:opacity-50 text-white text-xs font-medium tracking-[0.12em] uppercase rounded-lg transition-colors"
    >
      {pending ? 'Wird gespeichert…' : 'Speichern'}
    </button>
  )
}

interface Props {
  aktion: (prevState: ProjektActionState, formData: FormData) => Promise<ProjektActionState>
  kunden: Pick<Kunde, 'id' | 'name'>[]
  initialData?: Projekt
  abbrechen: string
  istBearbeiten?: boolean
  vorausgewaehlterKundeId?: string
}

export default function ProjektFormular({
  aktion,
  kunden,
  initialData,
  abbrechen,
  istBearbeiten = false,
  vorausgewaehlterKundeId,
}: Props) {
  const [state, formAction] = useFormState(aktion, null)

  return (
    <form action={formAction} className="space-y-5">
      {state?.fehler && (
        <div className="text-sm text-wbc-terra bg-wbc-terra/5 border border-wbc-terra/20 rounded-lg px-4 py-3">
          {state.fehler}
        </div>
      )}

      {/* Projektname */}
      <div>
        <label htmlFor="name" className={labelKlasse}>
          Projektname <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initialData?.name ?? ''}
          className={inputKlasse}
          placeholder="z. B. Hotel Seeblick – Zimmer 101–120"
        />
      </div>

      {/* Kunde */}
      <div>
        <label htmlFor="kunde_id" className={labelKlasse}>
          Kunde <span className="text-red-400">*</span>
        </label>
        <select
          id="kunde_id"
          name="kunde_id"
          required
          defaultValue={initialData?.kunde_id ?? vorausgewaehlterKundeId ?? ''}
          className={inputKlasse}
        >
          <option value="" disabled>
            Kunde auswählen…
          </option>
          {kunden.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </div>

      {/* Standort & Projektart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="standort" className={labelKlasse}>
            Standort
          </label>
          <input
            id="standort"
            name="standort"
            type="text"
            defaultValue={initialData?.standort ?? ''}
            className={inputKlasse}
            placeholder="z. B. München, Berlin…"
          />
        </div>
        <div>
          <label htmlFor="projektart" className={labelKlasse}>
            Projektart
          </label>
          <select
            id="projektart"
            name="projektart"
            defaultValue={initialData?.projektart ?? ''}
            className={inputKlasse}
          >
            <option value="">Bitte wählen…</option>
            {PROJEKTARTEN.map((art) => (
              <option key={art} value={art}>
                {art}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gesamtbudget */}
      <div>
        <label htmlFor="gesamtbudget" className={labelKlasse}>
          Gesamtbudget (€)
        </label>
        <input
          id="gesamtbudget"
          name="gesamtbudget"
          type="number"
          min="0"
          step="0.01"
          defaultValue={initialData?.gesamtbudget ?? ''}
          className={inputKlasse}
          placeholder="0.00"
        />
      </div>

      {/* Status (nur beim Bearbeiten) */}
      {istBearbeiten && (
        <div>
          <label htmlFor="status" className={labelKlasse}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initialData?.status ?? 'offen'}
            className={inputKlasse}
          >
            {PROJEKT_STATUS.map((s) => (
              <option key={s.wert} value={s.wert}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Notizen */}
      <div>
        <label htmlFor="beschreibung" className={labelKlasse}>
          Notizen
        </label>
        <textarea
          id="beschreibung"
          name="beschreibung"
          rows={4}
          defaultValue={initialData?.beschreibung ?? ''}
          className={`${inputKlasse} resize-none`}
          placeholder="Interne Notizen zum Projekt…"
        />
      </div>

      {/* Aktionen */}
      <div className="flex items-center gap-3 pt-2">
        <SpeichernButton />
        <a
          href={abbrechen}
          className="px-5 py-2.5 text-sm text-wbc-grau/60 hover:text-wbc-grau transition-colors"
        >
          Abbrechen
        </a>
      </div>
    </form>
  )
}

const labelKlasse =
  'block text-xs font-medium text-wbc-grau/70 uppercase tracking-widest mb-1.5'

const inputKlasse =
  'w-full px-3 py-2.5 text-sm bg-white border border-[#e8ddd3] rounded-lg text-wbc-gruen placeholder:text-[#c5b8ab] focus:outline-none focus:ring-2 focus:ring-wbc-gruen/20 focus:border-wbc-gruen/40 transition'
