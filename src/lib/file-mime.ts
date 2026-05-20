import { FileText, FileImage, FileSpreadsheet, File as FileIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * MIME-Helper fuer Datei-Listen + Inline-Preview.
 *
 * Wird benutzt von FilePreviewModal sowie den Dateien-Listen in
 * AnfrageBearbeitenModal, DateiUpload, PartnerVertraegeBlock, ChatBlock.
 */

export function istBildMime(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith('image/')
}

export function istPdfMime(mime: string | null | undefined): boolean {
  return mime === 'application/pdf'
}

/**
 * True wenn der Browser den Dateityp inline anzeigen kann (Bild oder PDF).
 * Word/Excel/Zip/etc. liefert false → UI zeigt dann nur Download-Pfad.
 */
export function kannInlineVorschau(mime: string | null | undefined): boolean {
  return istBildMime(mime) || istPdfMime(mime)
}

export function ikonFuerMime(mime: string | null | undefined): LucideIcon {
  if (istPdfMime(mime))                                     return FileText
  if (istBildMime(mime))                                    return FileImage
  if (mime?.includes('sheet') || mime?.includes('excel'))   return FileSpreadsheet
  return FileIcon
}

export function farbeFuerMime(mime: string | null | undefined): string {
  if (istPdfMime(mime))                                     return 'bg-red-50 text-red-600'
  if (istBildMime(mime))                                    return 'bg-purple-50 text-purple-600'
  if (mime?.includes('sheet') || mime?.includes('excel'))   return 'bg-emerald-50 text-emerald-600'
  if (mime?.includes('word'))                               return 'bg-blue-50 text-blue-600'
  return 'bg-gray-100 text-gray-500'
}

export function formatBytes(b: number | null | undefined): string {
  if (b == null)              return ''
  if (b < 1024)               return `${b} B`
  if (b < 1024 * 1024)        return `${Math.round(b / 1024)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
