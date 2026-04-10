'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import type { RaumActionState } from '@/app/actions/raeume'

function HinzufuegenButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-wbc-gruen hover:bg-wbc-gruen-dark disabled:opacity-50 text-white text-xs font-medium tracking-[0.12em] uppercase rounded-lg transition-colors whitespace-nowrap"
    >
      {pending ? '…' : 'Hinzufügen'}
    </button>
  )
}

interface Props {
  aktion: (prevState: RaumActionState, formData: FormData) => Promise<RaumActionState>
}

export default function RaumHinzufuegen({ aktion }: Props) {
  const [offen, setOffen] = useState(false)
  const [state, formAction] = useFormState(aktion, null)

  return (
    <div>
      {!offen ? (
        <button
          onClick={() => setOffen(true)}
          className="text-xs text-wbc-grau/50 hover:text-wbc-gruen transition-colors"
        >
          + Raum hinzufügen
        </button>
      ) : (
        <form
          action={async (formData) => {
            await formAction(formData)
            if (!state?.fehler) setOffen(false)
          }}
          className="flex items-start gap-2 flex-wrap"
        >
          <div className="flex-1 min-w-48">
            <input
              name="name"
              type="text"
              required
              autoFocus
              placeholder="Raumname, z. B. Lobby"
              className="w-full px-3 py-2 text-sm bg-white border border-[#e8ddd3] rounded-lg text-wbc-gruen placeholder:text-[#c5b8ab] focus:outline-none focus:ring-2 focus:ring-wbc-gruen/20 focus:border-wbc-gruen/40 transition"
            />
            {state?.fehler && (
              <p className="text-xs text-wbc-terra mt-1">{state.fehler}</p>
            )}
          </div>
          <HinzufuegenButton />
          <button
            type="button"
            onClick={() => setOffen(false)}
            className="px-4 py-2 text-xs text-wbc-grau/50 hover:text-wbc-grau transition-colors"
          >
            Abbrechen
          </button>
        </form>
      )}
    </div>
  )
}
