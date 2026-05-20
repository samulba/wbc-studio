'use client'

import { useEffect, useState } from 'react'
import { X, Download, ExternalLink, Loader2, AlertTriangle } from 'lucide-react'
import { useModal } from '@/lib/hooks/useModal'
import { istBildMime, istPdfMime, ikonFuerMime, farbeFuerMime, formatBytes } from '@/lib/file-mime'

interface Props {
  dateiname: string
  mimeType:  string
  /** Direkte URL (public oder bereits aufgeloeste signed). */
  url?:      string | null
  /**
   * Wenn keine URL bekannt ist, kann ein Fetcher uebergeben werden.
   * Modal zeigt einen Spinner und ruft den Callback beim Mount.
   */
  urlFetcher?: () => Promise<string | null>
  groesse?:  number | null
  onClose:   () => void
}

export default function FilePreviewModal({ dateiname, mimeType, url: initialUrl, urlFetcher, groesse, onClose }: Props) {
  const containerRef = useModal(true, onClose)
  const [url, setUrl]         = useState<string | null>(initialUrl ?? null)
  const [loading, setLoading] = useState(!initialUrl && !!urlFetcher)
  const [fehler, setFehler]   = useState<string | null>(null)

  useEffect(() => {
    if (initialUrl || !urlFetcher) return
    let aktiv = true
    setLoading(true)
    urlFetcher()
      .then((u) => {
        if (!aktiv) return
        if (u) setUrl(u)
        else   setFehler('URL konnte nicht erzeugt werden.')
      })
      .catch((e) => {
        if (!aktiv) return
        setFehler(e instanceof Error ? e.message : 'Datei konnte nicht geladen werden.')
      })
      .finally(() => { if (aktiv) setLoading(false) })
    return () => { aktiv = false }
  }, [initialUrl, urlFetcher])

  const istBild   = istBildMime(mimeType)
  const istPdf    = istPdfMime(mimeType)
  const Icon      = ikonFuerMime(mimeType)
  const farbe     = farbeFuerMime(mimeType)

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-titel"
        className="w-full max-w-6xl flex flex-col gap-3 max-h-full"
      >
        {/* Header */}
        <div className="flex items-center gap-3 text-white px-2">
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${farbe}`}>
            <Icon className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p id="preview-titel" className="text-sm font-medium truncate">{dateiname}</p>
            <p className="text-[11px] text-white/60">
              {mimeType}
              {groesse != null && ` · ${formatBytes(groesse)}`}
            </p>
          </div>
          {url && (
            <>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/80 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="In neuem Tab öffnen"
              >
                <ExternalLink className="w-3.5 h-3.5" /> In neuem Tab
              </a>
              <a
                href={url}
                download={dateiname}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/80 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Herunterladen"
              >
                <Download className="w-3.5 h-3.5" /> Herunterladen
              </a>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-white/70">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Wird geladen…</span>
            </div>
          ) : fehler ? (
            <div className="bg-red-900/40 border border-red-700/50 text-red-100 rounded-xl px-5 py-4 max-w-md text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{fehler}</span>
            </div>
          ) : !url ? (
            <div className="text-white/70 text-sm">Keine URL verfügbar.</div>
          ) : istBild ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={dateiname}
              loading="lazy"
              className="max-h-[85vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
          ) : istPdf ? (
            <iframe
              src={url}
              title={dateiname}
              className="w-full max-w-6xl bg-white rounded-lg shadow-2xl"
              style={{ height: '85vh' }}
            />
          ) : (
            <UnsupportedFallback url={url} dateiname={dateiname} mimeType={mimeType} Icon={Icon} farbe={farbe} />
          )}
        </div>

        {/* Mobile-Footer: Download / Tab-Buttons fuer kleine Bildschirme */}
        {url && (
          <div className="flex items-center justify-center gap-2 sm:hidden">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/80 bg-white/10 hover:bg-white/20 rounded-lg"
            >
              <ExternalLink className="w-3.5 h-3.5" /> In neuem Tab
            </a>
            <a
              href={url}
              download={dateiname}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/80 bg-white/10 hover:bg-white/20 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" /> Herunterladen
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function UnsupportedFallback({
  url, dateiname, mimeType, Icon, farbe,
}: {
  url: string
  dateiname: string
  mimeType: string
  Icon: React.ComponentType<{ className?: string }>
  farbe: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
      <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${farbe}`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-base font-semibold text-gray-900 mt-4 truncate">{dateiname}</p>
      <p className="text-xs text-gray-500 mt-1">{mimeType}</p>
      <p className="text-sm text-gray-600 mt-4 leading-relaxed">
        Dieser Dateityp kann nicht direkt im Browser angezeigt werden.
      </p>
      <div className="flex items-center justify-center gap-2 mt-5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          In neuem Tab
        </a>
        <a
          href={url}
          download={dateiname}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Herunterladen
        </a>
      </div>
    </div>
  )
}
