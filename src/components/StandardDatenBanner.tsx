'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, CheckCircle2 } from 'lucide-react'
import { alleStandardDatenLadenAction } from '@/app/actions/vorlagen-seed'

interface Props {
  istLeer: boolean
}

/**
 * Prominenter Banner auf der Kategorien-Seite, der Admins neuer
 * Organisationen ermöglicht, alle Standard-Daten (Kategorien +
 * Vertragsvorlagen + Onboarding-Vorlagen) mit einem Klick nachzuladen.
 *
 * Wird nur gerendert wenn `istLeer` (keine Kategorien vorhanden) — sonst
 * ausgeblendet, damit er etablierte Orgs nicht stört.
 */
export default function StandardDatenBanner({ istLeer }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [ergebnis, setErgebnis] = useState<{
    kategorien: number
    vertragsvorlagen: number
    onboardingvorlagen: number
    fehler?: string
  } | null>(null)

  if (!istLeer && !ergebnis) return null

  function handleLaden() {
    setErgebnis(null)
    startTransition(async () => {
      const res = await alleStandardDatenLadenAction()
      setErgebnis(res)
      if (!res.fehler) router.refresh()
    })
  }

  if (ergebnis && !ergebnis.fehler) {
    return (
      <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-emerald-900 mb-1">Standard-Daten geladen</h3>
          <p className="text-xs text-emerald-700 leading-relaxed">
            {ergebnis.kategorien} Kategorien, {ergebnis.vertragsvorlagen} Vertragsvorlagen,
            {' '}{ergebnis.onboardingvorlagen} Onboarding-Vorlagen angelegt.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 bg-wellbeing-cream border border-wellbeing-green/20 rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-wellbeing-green/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-wellbeing-green" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-wellbeing-green-dark mb-1">Willkommen — fehlen dir die Standard-Daten?</h3>
          <p className="text-xs text-gray-700 leading-relaxed mb-3">
            Neue Firmen-Accounts starten leer. Mit einem Klick laden wir die
            Standard-Kategorien (Möbel, Leuchten, Küche, Wohnzimmer &amp; Co.),
            3&nbsp;Vertragsvorlagen (Interior Design, Angebot, Auftragsbestätigung)
            und 6&nbsp;Onboarding-Vorlagen (Kontaktanfrage, Neukunden, Projekt-Briefings …).
            Alles in Sekunden einsatzbereit.
          </p>
          {ergebnis?.fehler && (
            <p className="text-xs text-red-600 mb-2">Fehler: {ergebnis.fehler}</p>
          )}
          <button
            onClick={handleLaden}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isPending ? 'Wird geladen…' : 'Standard-Daten jetzt laden'}
          </button>
        </div>
      </div>
    </div>
  )
}
