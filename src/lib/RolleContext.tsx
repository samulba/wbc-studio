'use client'

import { createContext, useContext } from 'react'
import type { Rolle } from '@/lib/supabase/types'
import { kannBearbeiten, kannLoeschen, istAdmin } from '@/lib/permissions'

const RolleContext = createContext<Rolle>('admin')

export function RolleProvider({ rolle, children }: { rolle: Rolle; children: React.ReactNode }) {
  return <RolleContext.Provider value={rolle}>{children}</RolleContext.Provider>
}

/** Gibt die aktuelle Rolle des eingeloggten Nutzers zurück. */
export function useRolle(): Rolle {
  return useContext(RolleContext)
}

/** True wenn der aktuelle Nutzer schreiben darf (Admin oder Editor). */
export function useKannBearbeiten(): boolean {
  return kannBearbeiten(useContext(RolleContext))
}

/** True wenn der aktuelle Nutzer löschen/Team verwalten darf (Admin). */
export function useKannLoeschen(): boolean {
  return kannLoeschen(useContext(RolleContext))
}

/** True wenn der aktuelle Nutzer Admin ist. */
export function useIstAdmin(): boolean {
  return istAdmin(useContext(RolleContext))
}
