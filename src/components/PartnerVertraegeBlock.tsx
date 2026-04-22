'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, FileImage, FileSpreadsheet, File as FileIcon,
  Upload, Download, Trash2, X, Calendar, AlertTriangle, Loader2, Plus, Check,
} from 'lucide-react'
import {
  vertragHochladen,
  vertragLoeschen,
  vertragHerunterladenUrl,
} from '@/app/actions/partner-vertraege'
import type { PartnerVertrag } from '@/lib/supabase/types'
import { ConfirmModal } from '@/components/ConfirmModal'

const VERTRAGS_TYPEN = [
  'Rahmenvertrag',
  'Einzelauftrag',
  'NDA / Vertraulichkeit',
  'Konditionsvereinbarung',
  'Lieferantenvertrag',
  'Sonstiges',
]

function dateigroesseKurz(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function ikonFuerTyp(mime: string): React.ComponentType<{ className?: string }> {
  if (mime === 'application/pdf')                       return FileText
  if (mime.startsWith('image/'))                        return FileImage
  if (mime.includes('sheet') || mime.includes('excel')) return FileSpreadsheet
  return FileIcon
}

function farbeFuerTyp(mime: string): string {
  if (mime === 'application/pdf')                       return 'bg-red-50 text-red-600'
  if (mime.startsWith('image/'))                        return 'bg-purple-50 text-purple-600'
  if (mime.includes('sheet') || mime.includes('excel')) return 'bg-emerald-50 text-emerald-600'
  if (mime.includes('word'))                            return 'bg-blue-50 text-blue-600'
  return 'bg-gray-100 text-gray-500'
}

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function istBald(iso: string | null, tage = 30): boolean {
  if (!iso) return false
  const ende = new Date(iso + 'T00:00:00').getTime()
  const heute = Date.now()
  const diff = (ende - heute) / 86_400_000
  return diff >= 0 && diff <= tage
}

function istAbgelaufen(iso: string | null): boolean {
  if (!iso) return false
  return iso < new Date().toISOString().split('T')[0]
}

export default function PartnerVertraegeBlock({
  partnerId,
  initialVertraege,
}: {
  partnerId: string
  initialVertraege: PartnerVertrag[]
}) {
  const router = useRouter()
  const [vertraege, setVertraege] = useState(initialVertraege)
  const [uploadOffen, setUploadOffen] = useState(false)
  const [loeschenId, setLoeschenId]   = useState<string | null>(null)
  const [downloadFehler, setDownloadFehler] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleUploadFertig(neu: PartnerVertrag) {
    setVertraege((prev) => [neu, ...prev])
    setUploadOffen(false)
    router.refresh()
  }

  function handleLoeschen(id: string) {
    startTransition(async () => {
      const res = await vertragLoeschen(id)
      if (res.fehler) {
        alert(res.fehler)
        return
      }
      setVertraege((prev) => prev.filter((v) => v.id !== id))
      setLoeschenId(null)
      router.refresh()
    })
  }

  function handleDownload(id: string) {
    setDownloadFehler(null)
    startTransition(async () => {
      const res = await vertragHerunterladenUrl(id)
      if (res.fehler || !res.url) {
        setDownloadFehler(res.fehler ?? 'Download fehlgeschlagen.')
        setTimeout(() => setDownloadFehler(null), 4000)
        return
      }
      // signed URL hat download-Hint → Browser lädt automatisch
      window.open(res.url, '_blank')
    })
  }

  const zuLoeschen = vertraege.find((v) => v.id === loeschenId)

  return (
    <>
      <ConfirmModal
        isOpen={!!loeschenId}
        onClose={() => setLoeschenId(null)}
        onConfirm={() => loeschenId && handleLoeschen(loeschenId)}
        title="Vertrag löschen"
        message={zuLoeschen ? `„${zuLoeschen.titel ?? zuLoeschen.dateiname}" wirklich löschen? Datei wird endgültig entfernt.` : 'Wirklich löschen?'}
        confirmText="Löschen"
        variant="danger"
      />

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            Verträge & Dokumente
            <span className="text-xs font-normal text-gray-400 tabular-nums">({vertraege.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => setUploadOffen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Hochladen
          </button>
        </div>

        {vertraege.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-500 mb-1">Noch keine Verträge hinterlegt</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Lade Rahmenverträge, NDAs oder Konditionsvereinbarungen hoch, die du von diesem Partner bekommen hast.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {vertraege.map((v) => {
              const Icon = ikonFuerTyp(v.dateityp)
              const farbe = farbeFuerTyp(v.dateityp)
              const abgelaufen = istAbgelaufen(v.gueltig_bis)
              const baldFaellig = !abgelaufen && istBald(v.gueltig_bis)
              return (
                <div key={v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${farbe}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate select-text">
                        {v.titel ?? v.dateiname}
                      </p>
                      {v.vertragstyp && (
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {v.vertragstyp}
                        </span>
                      )}
                      {abgelaufen && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Abgelaufen
                        </span>
                      )}
                      {baldFaellig && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          <Calendar className="w-2.5 h-2.5" />
                          Läuft bald aus
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                      <span>{dateigroesseKurz(v.dateigroesse)}</span>
                      <span>·</span>
                      <span>Hochgeladen {formatDatum(v.hochgeladen_am)}</span>
                      {v.gueltig_bis && (
                        <>
                          <span>·</span>
                          <span>Gültig bis {formatDatum(v.gueltig_bis)}</span>
                        </>
                      )}
                    </div>
                    {v.notizen && (
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 select-text">{v.notizen}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleDownload(v.id)}
                      disabled={isPending}
                      className="p-1.5 text-gray-400 hover:text-wellbeing-green rounded-lg hover:bg-wellbeing-green/10 transition-colors disabled:opacity-50"
                      title="Herunterladen"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoeschenId(v.id)}
                      disabled={isPending}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {downloadFehler && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-md bg-red-600 text-white text-sm px-4 py-3 rounded-xl shadow-2xl">
          {downloadFehler}
        </div>
      )}

      {uploadOffen && (
        <UploadModal
          partnerId={partnerId}
          onClose={() => setUploadOffen(false)}
          onUpload={handleUploadFertig}
        />
      )}
    </>
  )
}

// ── Upload-Modal ──────────────────────────────────────────────
function UploadModal({
  partnerId,
  onClose,
  onUpload,
}: {
  partnerId: string
  onClose: () => void
  onUpload: (v: PartnerVertrag) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [datei, setDatei] = useState<File | null>(null)
  const [titel, setTitel] = useState('')
  const [vertragstyp, setVertragstyp] = useState('')
  const [gueltigVon, setGueltigVon] = useState('')
  const [gueltigBis, setGueltigBis] = useState('')
  const [notizen, setNotizen] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) setDatei(f)
  }

  function handleSpeichern() {
    if (!datei) {
      setFehler('Bitte eine Datei auswählen.')
      return
    }
    const fd = new FormData()
    fd.append('datei', datei)
    if (titel.trim())       fd.append('titel', titel.trim())
    if (vertragstyp)        fd.append('vertragstyp', vertragstyp)
    if (gueltigVon)         fd.append('gueltig_von', gueltigVon)
    if (gueltigBis)         fd.append('gueltig_bis', gueltigBis)
    if (notizen.trim())     fd.append('notizen', notizen.trim())

    startTransition(async () => {
      const res = await vertragHochladen(partnerId, fd)
      if (res.fehler || !res.id) {
        setFehler(res.fehler ?? 'Upload fehlgeschlagen.')
        return
      }
      // Lokales Vertrags-Objekt für optimistic insert
      onUpload({
        id:              res.id,
        organisation_id: '',
        partner_id:      partnerId,
        dateiname:       datei.name,
        dateityp:        datei.type,
        dateigroesse:    datei.size,
        storage_pfad:    '',
        titel:           titel.trim() || null,
        vertragstyp:     vertragstyp || null,
        gueltig_von:     gueltigVon || null,
        gueltig_bis:     gueltigBis || null,
        notizen:         notizen.trim() || null,
        hochgeladen_von: null,
        hochgeladen_am:  new Date().toISOString(),
        created_at:      new Date().toISOString(),
        updated_at:      new Date().toISOString(),
      })
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={() => !isPending && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vertrag-upload-titel"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 id="vertrag-upload-titel" className="text-base font-semibold text-gray-900">Vertrag hochladen</h2>
          <button
            onClick={onClose}
            disabled={isPending}
            aria-label="Schließen"
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4">
          {/* Datei-Drop / -Auswahl */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Datei *</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl px-4 py-6 text-center transition-colors ${
                dragOver
                  ? 'border-wellbeing-green bg-wellbeing-green/5'
                  : datei
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-gray-300 hover:border-wellbeing-green/40 hover:bg-gray-50'
              }`}
            >
              {datei ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-wellbeing-green/10 text-wellbeing-green flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{datei.name}</p>
                    <p className="text-[11px] text-gray-500">{dateigroesseKurz(datei.size)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-700">Datei auswählen oder hierher ziehen</p>
                  <p className="text-[11px] text-gray-400 mt-1">PDF, Word, Excel, Bilder · max. 50 MB</p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="application/pdf,.doc,.docx,.xls,.xlsx,image/*,text/plain"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setDatei(f)
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Titel <span className="text-gray-400 font-normal">(optional, sonst Dateiname)</span>
            </label>
            <input
              type="text"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="z.B. Rahmenvertrag 2026"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Vertragstyp <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={vertragstyp}
              onChange={(e) => setVertragstyp(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
            >
              <option value="">— Kein Typ —</option>
              {VERTRAGS_TYPEN.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Gültig von <span className="text-gray-400 font-normal">(opt.)</span>
              </label>
              <input
                type="date"
                value={gueltigVon}
                onChange={(e) => setGueltigVon(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Gültig bis <span className="text-gray-400 font-normal">(opt.)</span>
              </label>
              <input
                type="date"
                value={gueltigBis}
                min={gueltigVon || undefined}
                onChange={(e) => setGueltigBis(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Notizen <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notizen}
              onChange={(e) => setNotizen(e.target.value)}
              rows={3}
              placeholder="Interne Notizen zu diesem Vertrag…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition resize-none"
            />
          </div>

          {fehler && (
            <p className="text-xs text-red-500">{fehler}</p>
          )}
        </div>

        <div className="px-5 pt-3 pb-5 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSpeichern}
            disabled={isPending || !datei}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-2"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Wird hochgeladen…</>
            ) : (
              <><Upload className="w-4 h-4" /> Hochladen</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
