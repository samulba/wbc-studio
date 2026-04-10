'use client'

import { useState, useTransition } from 'react'
import { tokenGenerieren, tokenDeaktivieren } from '@/app/actions/freigabe-token'

interface Props {
  projektId: string
  initialToken: { id: string; token: string } | null
}

export default function FreigabeLinkKarte({ projektId, initialToken }: Props) {
  const [tokenData, setTokenData] = useState(initialToken)
  const [kopiert, setKopiert] = useState(false)
  const [isPending, startTransition] = useTransition()

  const freigabeUrl = tokenData
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/freigabe/${tokenData.token}`
    : null

  function handleGenerieren() {
    startTransition(async () => {
      const result = await tokenGenerieren(projektId)
      if ('token' in result) {
        setTokenData({ id: '', token: result.token })
      }
    })
  }

  async function handleKopieren() {
    if (!freigabeUrl) return
    await navigator.clipboard.writeText(freigabeUrl)
    setKopiert(true)
    setTimeout(() => setKopiert(false), 2000)
  }

  function handleDeaktivieren() {
    if (!tokenData?.id || !confirm('Freigabe-Link wirklich deaktivieren? Der Link wird ungültig.')) return
    startTransition(async () => {
      await tokenDeaktivieren(tokenData.id, projektId)
      setTokenData(null)
    })
  }

  return (
    <div className="bg-white border border-[#ede4d9] rounded-xl p-5">
      <h2 className="text-xs font-medium text-wbc-grau/50 uppercase tracking-widest mb-4">
        Kunden-Freigabelink
      </h2>

      {!tokenData ? (
        <div>
          <p className="text-sm text-wbc-grau/70 mb-4 leading-relaxed">
            Erstellen Sie einen Link, den Sie an Ihren Kunden senden können.
            Der Kunde sieht alle Produkte und kann sie freigeben oder Änderungen anfordern.
          </p>
          <button
            onClick={handleGenerieren}
            disabled={isPending}
            className="px-4 py-2.5 bg-wbc-gruen hover:bg-wbc-gruen-dark disabled:opacity-50 text-white text-xs font-medium tracking-[0.12em] uppercase rounded-lg transition-colors"
          >
            {isPending ? 'Wird erstellt…' : 'Freigabelink erstellen'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={freigabeUrl ?? ''}
              className="flex-1 px-3 py-2 text-xs text-wbc-grau bg-wbc-creme/50 border border-[#e8ddd3] rounded-lg font-mono truncate focus:outline-none"
            />
            <button
              onClick={handleKopieren}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                kopiert
                  ? 'bg-wbc-mint/20 text-wbc-gruen border-wbc-mint/40'
                  : 'bg-white text-wbc-grau border-[#e8ddd3] hover:border-wbc-sand/60'
              }`}
            >
              {kopiert ? '✓ Kopiert' : 'Kopieren'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={freigabeUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-wbc-grau/50 hover:text-wbc-gruen underline underline-offset-2 transition-colors"
            >
              Vorschau öffnen ↗
            </a>
            {tokenData.id && (
              <button
                onClick={handleDeaktivieren}
                disabled={isPending}
                className="text-xs text-wbc-terra/60 hover:text-wbc-terra transition-colors"
              >
                Link deaktivieren
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
