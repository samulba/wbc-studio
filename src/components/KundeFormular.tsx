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
      className="px-5 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {pending ? 'Wird gespeichert…' : 'Speichern'}
    </button>
  )
}

interface Props {
  aktion: (prevState: KundeActionState, formData: FormData) => Promise<KundeActionState>
  initialData?: Kunde
  abbrechen: string
}

export default function KundeFormular({ aktion, initialData, abbrechen }: Props) {
  const [state, formAction] = useFormState(aktion, null)

  return (
    <form action={formAction} className="space-y-5">
      {state?.fehler && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.fehler}
        </div>
      )}

      {/* Firmenname */}
      <div>
        <label htmlFor="name" className={lbl}>
          Firmenname <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initialData?.name ?? ''}
          className={inp}
          placeholder="Musterfirma GmbH"
        />
      </div>

      {/* Hinweis: Ansprechpartner pflegt man jetzt im Kontakte-Block */}
      <div className="rounded-lg bg-wellbeing-cream/50 border border-wellbeing-green/20 px-3 py-2.5">
        <p className="text-[12px] text-wellbeing-green-dark">
          <span className="font-medium">Ansprechpartner</span> pflegst du nach dem Speichern auf der Detailseite — pro Person mit eigener E-Mail, Telefon und Mobilnummer.
        </p>
      </div>

      {/* Website */}
      <div>
        <label htmlFor="website" className={lbl}>Website</label>
        <input
          id="website"
          name="website"
          type="url"
          defaultValue={initialData?.website ?? ''}
          className={inp}
          placeholder="https://musterfirma.de"
        />
        <p className="mt-1 text-[11px] text-gray-400">
          Wenn ein Logo noch fehlt, wird automatisch das Favicon der Domain übernommen.
        </p>
      </div>

      {/* Adresse */}
      <div>
        <label htmlFor="adresse" className={lbl}>Adresse</label>
        <input
          id="adresse"
          name="adresse"
          type="text"
          defaultValue={initialData?.adresse ?? ''}
          className={inp}
          placeholder="Musterstraße 1, 12345 Berlin"
        />
      </div>

      {/* Notizen */}
      <div>
        <label htmlFor="notizen" className={lbl}>Notizen</label>
        <textarea
          id="notizen"
          name="notizen"
          rows={4}
          defaultValue={initialData?.notizen ?? ''}
          className={`${inp} resize-none`}
          placeholder="Interne Notizen zum Kunden…"
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
