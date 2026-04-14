'use client'

import { useState, useTransition } from 'react'
import SignaturCanvas from '@/components/SignaturCanvas'
import { vertragUnterschreiben } from '@/app/actions/signatur'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  token: string
  titel: string
  inhaltHtml: string
  gueltigBis: string | null
}

export default function VertragSignaturClient({ token, titel, inhaltHtml, gueltigBis }: Props) {
  const [signatur, setSignatur] = useState<string | null>(null)
  const [unterschrieben, setUnterschrieben] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleSignatur(dataUrl: string | null) {
    setSignatur(dataUrl)
  }

  function handleUnterschreiben() {
    if (!signatur) {
      setFehler('Bitte unterschreiben Sie zuerst im Unterschriftsfeld.')
      return
    }
    setFehler(null)

    startTransition(async () => {
      const res = await vertragUnterschreiben(token, signatur)
      if (res.fehler) {
        setFehler(res.fehler)
      } else {
        setUnterschrieben(true)
      }
    })
  }

  if (unterschrieben) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#445c49]/10 rounded-2xl mb-5">
            <CheckCircle className="w-7 h-7 text-[#445c49]" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Vertrag erfolgreich unterschrieben</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Ihre Unterschrift wurde gespeichert. Sie erhalten keine weitere Bestätigung – dieser Tab kann geschlossen werden.
          </p>
        </div>
      </div>
    )
  }

  const gueltigBisDatum = gueltigBis
    ? new Date(gueltigBis).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">Dokument zur Unterschrift</p>
            <h1 className="text-sm font-semibold text-gray-900 mt-0.5 line-clamp-1">{titel}</h1>
          </div>
          {gueltigBisDatum && (
            <span className="text-[11px] text-gray-400 shrink-0 ml-4">
              Gültig bis {gueltigBisDatum}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Vertragsinhalt */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-10">
          <div
            className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: inhaltHtml }}
          />
        </div>

        {/* Unterschriftsbereich */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Ihre Unterschrift</h2>
          <p className="text-xs text-gray-400 mb-4">
            Unterschreiben Sie mit Finger oder Maus im Feld unten. Mit dem Absenden bestätigen Sie, dass Sie diesen Vertrag gelesen und akzeptiert haben.
          </p>

          <SignaturCanvas onExport={handleSignatur} />

          {fehler && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-500">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {fehler}
            </div>
          )}

          <button
            type="button"
            onClick={handleUnterschreiben}
            disabled={!signatur}
            className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium bg-[#445c49] hover:bg-[#2d3e31] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Vertrag verbindlich unterschreiben
          </button>

          <p className="mt-3 text-[11px] text-gray-400 text-center leading-relaxed">
            Mit dem Klick auf &quot;Vertrag verbindlich unterschreiben&quot; erklären Sie sich rechtsverbindlich mit dem Inhalt dieses Dokuments einverstanden.
          </p>
        </div>
      </div>
    </div>
  )
}
