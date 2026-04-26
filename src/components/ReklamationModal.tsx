'use client'

/**
 * Modal zum Anlegen einer Reklamation an einem Produkt.
 * Nutzt reklamationAnlegen + reklamationFotoHochladen.
 */

import { useState, useTransition } from 'react'
import { X, AlertTriangle, Upload, Trash2, Loader2 } from 'lucide-react'
import { reklamationAnlegen, reklamationFotoHochladen } from '@/app/actions/reklamationen'
import type { ReklamationTyp } from '@/lib/supabase/types'

const TYP_OPTIONEN: Array<{ id: ReklamationTyp; label: string; beschreibung: string }> = [
  { id: 'mangel',             label: 'Mangel',             beschreibung: 'Produkt ist defekt oder beschädigt' },
  { id: 'falsche_lieferung',  label: 'Falsche Lieferung',  beschreibung: 'Anderes Produkt geliefert' },
  { id: 'transportschaden',   label: 'Transportschaden',   beschreibung: 'Beim Versand beschädigt' },
  { id: 'nicht_wie_bestellt', label: 'Nicht wie bestellt', beschreibung: 'Farbe, Größe, Variante stimmt nicht' },
  { id: 'kunde_storno',       label: 'Kunde storniert',    beschreibung: 'Kunde will Produkt zurückgeben' },
  { id: 'sonstiges',           label: 'Sonstiges',          beschreibung: 'Anderer Grund' },
]

interface Props {
  raumProduktId: string
  produktName: string
  isOpen: boolean
  onClose: () => void
  onErfolg?: () => void
}

export default function ReklamationModal({
  raumProduktId, produktName, isOpen, onClose, onErfolg,
}: Props) {
  const [typ, setTyp] = useState<ReklamationTyp>('mangel')
  const [beschreibung, setBeschreibung] = useState('')
  const [fotoUrls, setFotoUrls] = useState<string[]>([])
  const [kundeSichtbar, setKundeSichtbar] = useState(true)
  const [setzeBestellstatus, setSetzeBestellstatus] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!isOpen) return null

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    setUploading(true)
    setFehler(null)
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      const fd = new FormData()
      fd.append('foto', file)
      const r = await reklamationFotoHochladen(fd)
      if (r.url) setFotoUrls((prev) => [...prev, r.url!])
      else if (r.fehler) setFehler(r.fehler)
    }
    setUploading(false)
  }

  function handleSubmit() {
    setFehler(null)
    if (!beschreibung.trim()) {
      setFehler('Beschreibung darf nicht leer sein.')
      return
    }
    startTransition(async () => {
      const r = await reklamationAnlegen({
        raumProduktId,
        typ,
        beschreibung,
        fotoUrls,
        kundeSichtbar,
        setzeBestellstatus,
      })
      if (r.fehler) {
        setFehler(r.fehler)
        return
      }
      // Reset + Close
      setTyp('mangel')
      setBeschreibung('')
      setFotoUrls([])
      onErfolg?.()
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rek-modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h2 id="rek-modal-title" className="text-base font-medium text-gray-900">Reklamation anlegen</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <p className="text-xs text-gray-500">Produkt</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{produktName}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Art der Reklamation</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TYP_OPTIONEN.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTyp(opt.id)}
                  className={`text-left px-2.5 py-2 rounded-lg border transition-colors ${
                    typ === opt.id
                      ? 'bg-wellbeing-cream border-wellbeing-green text-wellbeing-green-dark'
                      : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-xs font-medium">{opt.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{opt.beschreibung}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Beschreibung</label>
            <textarea
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="Was genau ist das Problem?"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20"
              maxLength={4000}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">{beschreibung.length} / 4000 Zeichen</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Fotos / Beweise (optional)</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {fotoUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotoUrls((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded"
                    title="Entfernen"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-wellbeing-green hover:bg-gray-50 cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:text-wellbeing-green transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-[10px] mt-1">Hochladen</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFotoUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            {uploading && (
              <p className="text-[11px] text-gray-500 inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Lade hoch…
              </p>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={setzeBestellstatus}
                onChange={(e) => setSetzeBestellstatus(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-wellbeing-green"
              />
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-700">Bestellstatus auf &bdquo;Mangel gemeldet&ldquo; setzen</div>
                <div className="text-[10px] text-gray-500">Erkennbar in der Produktliste + Timeline</div>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={kundeSichtbar}
                onChange={(e) => setKundeSichtbar(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-wellbeing-green"
              />
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-700">Für Kunde im Portal sichtbar</div>
                <div className="text-[10px] text-gray-500">Transparenz — Kunde sieht Status der Reklamation</div>
              </div>
            </label>
          </div>

          {fehler && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{fehler}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !beschreibung.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Reklamation anlegen
          </button>
        </div>
      </div>
    </div>
  )
}
