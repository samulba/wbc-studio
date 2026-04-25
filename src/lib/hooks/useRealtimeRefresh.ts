'use client'

/**
 * useRealtimeRefresh — gemeinsame Basis für Live-Updates ohne Performance-Verlust.
 *
 * Subscribed eine einzige Supabase-Realtime-Channel pro Komponente, ruft bei jedem
 * INSERT/UPDATE/DELETE einen Refresh-Callback auf. Eingebautes Debouncing (default
 * 500 ms) verhindert Refresh-Storm bei Auto-Save-Floods oder Bulk-Actions.
 *
 * RLS bleibt aktiv — der Subscribe sieht nur Events, die der Server-RLS auch
 * zulässt. Filter optional via PostgREST-Syntax (z. B. `projekt_id=eq.${id}`).
 *
 * Cleanup garantiert (removeChannel im useEffect-Return), Re-Subscribe nur bei
 * Änderung der Inputs (Table / Filter / Channel-Name).
 */
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type RealtimeOptions = {
  /** Eindeutiger Channel-Name. Bei Collisions kommen Events doppelt — also einmalig pro Page. */
  channelName: string
  /** Tabelle in `public`-Schema. */
  table: string
  /** Optional: PostgREST-Filter (`spalte=eq.wert`) — reduziert Server→Client-Traffic. */
  filter?: string
  /** Min. ms zwischen zwei Refreshes (Debounce). Default 500 ms. */
  debounceMs?: number
  /**
   * Wird bei jedem Event aufgerufen (mit Debounce). Default: router.refresh().
   * Eigene Callback z. B. für lokale State-Updates statt Server-Roundtrip.
   */
  onChange?: () => void
  /** Wenn false, wird der Subscribe nicht angelegt (z. B. wenn keine User-Session). */
  enabled?: boolean
}

export function useRealtimeRefresh(opts: RealtimeOptions) {
  const router = useRouter()
  const onChangeRef = useRef(opts.onChange)
  onChangeRef.current = opts.onChange

  useEffect(() => {
    if (opts.enabled === false) return

    const supabase = createClient()
    let lastRefresh = 0
    let pending: ReturnType<typeof setTimeout> | null = null
    const debounceMs = opts.debounceMs ?? 500

    const trigger = () => {
      const now = Date.now()
      const elapsed = now - lastRefresh
      const cb = onChangeRef.current ?? (() => router.refresh())
      if (elapsed >= debounceMs) {
        lastRefresh = now
        cb()
      } else {
        if (pending) clearTimeout(pending)
        pending = setTimeout(() => {
          lastRefresh = Date.now()
          cb()
          pending = null
        }, debounceMs - elapsed)
      }
    }

    const channel = supabase
      .channel(opts.channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: opts.table,
          ...(opts.filter ? { filter: opts.filter } : {}),
        },
        trigger,
      )
      .subscribe()

    return () => {
      if (pending) clearTimeout(pending)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.channelName, opts.table, opts.filter, opts.enabled, opts.debounceMs, router])
}
