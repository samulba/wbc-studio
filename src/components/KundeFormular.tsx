'use client'

import { useFormState, useFormStatus } from 'react-dom'
import type { KundeActionState } from '@/app/actions/kunden'
import type { Kunde } from '@/lib/supabase/types'

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
  aktion: (prevState: KundeActionState, formData: FormData) => Promise<KundeActionState>
  initialData?: Kunde
  abbrechen: string // href für Abbrechen-Link
}

export default function KundeFormular({ aktion, initialData, abbrechen }: Props) {
  const [state, formAction] = useFormState(aktion, null)

  return (
    <form action={formAction} className="space-y-5">
      {state?.fehler && (
        <div className="text-sm text-wbc-terra bg-wbc-terra/5 border border-wbc-terra/20 rounded-lg px-4 py-3">
          {state.fehler}
        </div>
      )}

      {/* Firmenname */}
      <div>
        <label htmlFor="name" className={labelKlasse}>
          Firmenname <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initialData?.name ?? ''}
          className={inputKlasse}
          placeholder="Musterfirma GmbH"
        />
      </div>

      {/* Ansprechpartner */}
      <div>
        <label htmlFor="ansprechpartner" className={labelKlasse}>
          Ansprechpartner
        </label>
        <input
          id="ansprechpartner"
          name="ansprechpartner"
          type="text"
          defaultValue={initialData?.ansprechpartner ?? ''}
          className={inputKlasse}
          placeholder="Max Mustermann"
        />
      </div>

      {/* E-Mail & Telefon nebeneinander */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="email" className={labelKlasse}>
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={initialData?.email ?? ''}
            className={inputKlasse}
            placeholder="kontakt@musterfirma.de"
          />
        </div>
        <div>
          <label htmlFor="telefon" className={labelKlasse}>
            Telefon
          </label>
          <input
            id="telefon"
            name="telefon"
            type="tel"
            defaultValue={initialData?.telefon ?? ''}
            className={inputKlasse}
            placeholder="+49 123 456789"
          />
        </div>
      </div>

      {/* Adresse */}
      <div>
        <label htmlFor="adresse" className={labelKlasse}>
          Adresse
        </label>
        <input
          id="adresse"
          name="adresse"
          type="text"
          defaultValue={initialData?.adresse ?? ''}
          className={inputKlasse}
          placeholder="Musterstraße 1, 12345 Berlin"
        />
      </div>

      {/* Notizen */}
      <div>
        <label htmlFor="notizen" className={labelKlasse}>
          Notizen
        </label>
        <textarea
          id="notizen"
          name="notizen"
          rows={4}
          defaultValue={initialData?.notizen ?? ''}
          className={`${inputKlasse} resize-none`}
          placeholder="Interne Notizen zum Kunden…"
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
