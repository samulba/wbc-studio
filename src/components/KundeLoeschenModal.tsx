'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2, X, FolderOpen, Package, ReceiptText,
         FileSignature, StickyNote, MessageCircle, UserCircle, Home } from 'lucide-react'
import type { KundeImpact } from '@/app/actions/kunden'
import { kundeSoftDelete, getKundeImpact } from '@/app/actions/kunden'
import { useModal } from '@/lib/hooks/useModal'

/**
 * Zwei-Stufen-Löschen für Kunden:
 *  1. Impact-Anzeige: was hängt dran?
 *  2. Type-to-confirm: Name muss exakt eingetippt werden
 * Nur Admins sehen den Trigger-Button (von Parent gesteuert).
 */
export default function KundeLoeschenModal({
  kundeId,
  kundeName,
}: {
  kundeId: string
  kundeName: string
}) {
  const router = useRouter()
  const [offen, setOffen] = useState(false)
  const [impact, setImpact] = useState<KundeImpact | null>(null)
  const [impactLoading, setImpactLoading] = useState(false)
  const [eingabe, setEingabe] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const modalRef = useModal(offen, () => { if (!isPending) setOffen(false) })

  const passendName = eingabe.trim() === kundeName.trim() && kundeName.trim().length > 0
  const hatKritische = impact !== null && (impact.angebote + impact.vertraege > 0)

  useEffect(() => {
    if (!offen) return
    setImpactLoading(true)
    setEingabe('')
    setFehler(null)
    getKundeImpact(kundeId)
      .then(setImpact)
      .catch(() => setImpact(null))
      .finally(() => setImpactLoading(false))
  }, [offen, kundeId])

  function handleLoeschen() {
    if (!passendName) return
    setFehler(null)
    startTransition(async () => {
      const res = await kundeSoftDelete(kundeId, eingabe.trim())
      if (res.fehler) { setFehler(res.fehler); return }
      setOffen(false)
      router.push('/dashboard/kunden')
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="px-4 py-2 text-xs text-red-500/70 hover:text-red-600 transition-colors"
      >
        Löschen
      </button>

      {offen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          onClick={() => { if (!isPending) setOffen(false) }}>
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="kundeloeschen-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 id="kundeloeschen-title" className="text-sm font-semibold text-gray-900">
                    Kunde löschen?
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Diese Aktion archiviert den Kunden samt abhängiger Daten.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setOffen(false)} aria-label="Schließen"
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{kundeName}</span> und alles was daran hängt wird
                archiviert. Du kannst den Kunden innerhalb von 30 Tagen wiederherstellen.
              </p>

              {/* Impact */}
              {impactLoading ? (
                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-400 text-center">
                  Wird geladen…
                </div>
              ) : impact ? (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2.5">
                    Das wird mit archiviert:
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <ImpactZeile icon={<FolderOpen className="w-3.5 h-3.5" />} label="Projekte" count={impact.projekte} />
                    <ImpactZeile icon={<Home        className="w-3.5 h-3.5" />} label="Räume"    count={impact.raeume} />
                    <ImpactZeile icon={<Package     className="w-3.5 h-3.5" />} label="Produkte" count={impact.produkte} />
                    <ImpactZeile icon={<ReceiptText className="w-3.5 h-3.5" />} label="Angebote" count={impact.angebote} kritisch={impact.angebote > 0} />
                    <ImpactZeile icon={<FileSignature className="w-3.5 h-3.5" />} label="Verträge" count={impact.vertraege} kritisch={impact.vertraege > 0} />
                    <ImpactZeile icon={<StickyNote  className="w-3.5 h-3.5" />} label="Notizen"  count={impact.notizen} />
                    <ImpactZeile icon={<MessageCircle className="w-3.5 h-3.5" />} label="Nachrichten" count={impact.kommunikation} />
                    <ImpactZeile icon={<UserCircle  className="w-3.5 h-3.5" />} label="Portal-Zugänge" count={impact.portalUser} />
                  </div>
                </div>
              ) : null}

              {hatKritische && (
                <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 leading-relaxed">
                    <strong>Achtung:</strong> Es existieren Angebote oder Verträge für diesen Kunden.
                    Diese werden beim Archivieren nicht automatisch gekündigt — bitte vorher prüfen.
                  </div>
                </div>
              )}

              {/* Type-to-confirm */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Zur Bestätigung bitte <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{kundeName}</span> eintippen:
                </label>
                <input
                  type="text"
                  value={eingabe}
                  onChange={(e) => setEingabe(e.target.value)}
                  placeholder={kundeName}
                  autoComplete="off"
                  className="w-full px-3 py-2.5 text-sm font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                  disabled={isPending}
                />
              </div>

              {fehler && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {fehler}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2.5 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setOffen(false)}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleLoeschen}
                disabled={!passendName || isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isPending ? 'Archiviert…' : 'Unwiderruflich archivieren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ImpactZeile({
  icon, label, count, kritisch = false,
}: {
  icon: React.ReactNode; label: string; count: number; kritisch?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 ${count === 0 ? 'opacity-40' : ''}`}>
      <span className={kritisch ? 'text-amber-600' : 'text-gray-400'}>{icon}</span>
      <span className={`font-mono text-xs ${kritisch ? 'text-amber-700 font-semibold' : 'text-gray-700'}`}>
        {count}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}
