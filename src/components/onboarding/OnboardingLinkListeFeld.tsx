'use client'

import { useState } from 'react'
import { Plus, X, ExternalLink } from 'lucide-react'
import type { OnboardingLinkEintrag } from '@/lib/supabase/types'

interface Props {
  wert:      OnboardingLinkEintrag[]
  onChange:  (next: OnboardingLinkEintrag[]) => void
  fehler?:   string
}

function urlGueltig(u: string): boolean {
  if (!u) return false
  try {
    const parsed = new URL(u.startsWith('http') ? u : `https://${u}`)
    return Boolean(parsed.hostname && parsed.hostname.includes('.'))
  } catch {
    return false
  }
}

function urlNormalisieren(u: string): string {
  if (!u) return u
  return u.startsWith('http') ? u : `https://${u}`
}

export default function OnboardingLinkListeFeld({ wert, onChange, fehler }: Props) {
  const liste = Array.isArray(wert) ? wert : []
  const [neuTitel, setNeuTitel] = useState('')
  const [neuUrl, setNeuUrl]     = useState('')
  const [hint, setHint]         = useState<string | null>(null)

  function hinzufuegen() {
    const url = neuUrl.trim()
    if (!url) {
      setHint('Bitte URL eingeben.')
      return
    }
    if (!urlGueltig(url)) {
      setHint('Diese URL sieht nicht gueltig aus.')
      return
    }
    onChange([...liste, { titel: neuTitel.trim() || undefined, url: urlNormalisieren(url) }])
    setNeuTitel('')
    setNeuUrl('')
    setHint(null)
  }

  function entfernen(i: number) {
    onChange(liste.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-3">
      {liste.length > 0 && (
        <ul className="space-y-2">
          {liste.map((link, i) => (
            <li
              key={`${i}-${link.url}`}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                {link.titel && (
                  <p className="text-xs font-medium text-gray-900 truncate">{link.titel}</p>
                )}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-wellbeing-green hover:underline truncate block"
                >
                  {link.url}
                </a>
              </div>
              <button
                type="button"
                onClick={() => entfernen(i)}
                className="text-gray-400 hover:text-red-500 shrink-0 p-1"
                aria-label="Link entfernen"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
        <input
          type="text"
          placeholder="Titel (optional)"
          value={neuTitel}
          onChange={(e) => setNeuTitel(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
        />
        <input
          type="url"
          placeholder="https://..."
          value={neuUrl}
          onChange={(e) => setNeuUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); hinzufuegen() } }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
        />
        <button
          type="button"
          onClick={hinzufuegen}
          className="px-3 py-2 text-sm font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-lg inline-flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Link hinzufügen
        </button>
      </div>

      {hint && <p className="text-xs text-amber-600">{hint}</p>}
      {fehler && <p className="text-xs text-red-500">{fehler}</p>}
    </div>
  )
}
