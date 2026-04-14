import { createAdminClient } from '@/lib/supabase/admin'
import VertragSignaturClient from './VertragSignaturClient'

interface Props {
  params: { token: string }
}

export default async function VertragSignaturPage({ params }: Props) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('vertraege')
    .select('id, titel, inhalt_html, status, signatur_kunde_datum, signatur_firma_datum, signatur_token_gueltig')
    .eq('signatur_token', params.token)
    .single()

  if (error || !data) {
    return <Fehlerseite meldung="Dieser Signatur-Link ist ungültig oder existiert nicht." />
  }

  if (data.signatur_token_gueltig && new Date(data.signatur_token_gueltig) < new Date()) {
    return <Fehlerseite meldung="Dieser Signatur-Link ist abgelaufen. Bitte fordern Sie einen neuen Link an." />
  }

  if (data.signatur_kunde_datum) {
    return (
      <Bestaetigung
        titel={data.titel}
        datum={data.signatur_kunde_datum}
        beideUnterschrieben={!!data.signatur_firma_datum}
      />
    )
  }

  return (
    <VertragSignaturClient
      token={params.token}
      titel={data.titel}
      inhaltHtml={data.inhalt_html}
      gueltigBis={data.signatur_token_gueltig}
    />
  )
}

// ── Fehler-Seite ──────────────────────────────────────────────

function Fehlerseite({ meldung }: { meldung: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 rounded-2xl mb-5">
          <span className="text-red-400 text-2xl">!</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Link nicht verfügbar</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{meldung}</p>
      </div>
    </div>
  )
}

// ── Bestätigungs-Seite (bereits unterschrieben) ───────────────

function Bestaetigung({
  titel,
  datum,
  beideUnterschrieben,
}: {
  titel: string
  datum: string
  beideUnterschrieben: boolean
}) {
  const datumFormatiert = new Date(datum).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-[#445c49]/10 rounded-2xl mb-5">
          <svg className="w-7 h-7 text-[#445c49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Vertrag unterschrieben</h1>
        <p className="text-sm text-gray-500 mb-1">{titel}</p>
        <p className="text-xs text-gray-400">Ihre Unterschrift wurde am {datumFormatiert} Uhr gespeichert.</p>
        {beideUnterschrieben && (
          <div className="mt-4 inline-block px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
            Von beiden Parteien unterschrieben
          </div>
        )}
      </div>
    </div>
  )
}
