import type { Rolle } from '@/lib/supabase/types'

// ── Server-seitige Helpers ─────────────────────────────────────

/** True wenn Admin oder Editor (darf schreiben). */
export function kannBearbeiten(rolle: Rolle): boolean {
  return rolle === 'admin' || rolle === 'editor'
}

/** True wenn Admin (darf löschen, Team verwalten, Einstellungen). */
export function kannLoeschen(rolle: Rolle): boolean {
  return rolle === 'admin'
}

/** True wenn Admin. */
export function istAdmin(rolle: Rolle): boolean {
  return rolle === 'admin'
}

/** True wenn Editor. */
export function istEditor(rolle: Rolle): boolean {
  return rolle === 'editor'
}

/** True wenn Viewer (nur lesen). */
export function istViewer(rolle: Rolle): boolean {
  return rolle === 'viewer'
}

// ── Rollen-Metadaten für UI ────────────────────────────────────

export const ROLLEN_CONFIG: Record<Rolle, { label: string; beschreibung: string; badgeCls: string }> = {
  admin: {
    label: 'Admin',
    beschreibung: 'Voller Zugriff inkl. Team & Einstellungen',
    badgeCls: 'bg-violet-100 text-violet-700',
  },
  editor: {
    label: 'Editor',
    beschreibung: 'Projekte, Kunden & Produkte bearbeiten',
    badgeCls: 'bg-wellbeing-green/10 text-wellbeing-green-dark',
  },
  viewer: {
    label: 'Viewer',
    beschreibung: 'Nur lesen, keine Änderungen',
    badgeCls: 'bg-gray-100 text-gray-500',
  },
}
