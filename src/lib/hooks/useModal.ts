'use client'

import { useEffect, useRef } from 'react'

/**
 * A11y-Helper für Modals.
 *
 *  - ESC-Taste schließt das Modal (onClose)
 *  - Body-Scroll-Lock während das Modal offen ist
 *  - Focus-Trap: TAB/Shift+TAB bleiben innerhalb des Modal-Containers
 *  - Initialer Auto-Focus EINMAL beim Öffnen (kein Re-Focus bei Re-Renders)
 *  - Rückgabe: containerRef (an das äußerste Modal-div hängen)
 *
 * Verwendung:
 *   const ref = useModal(isOpen, onClose)
 *   return <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="titel-id">…</div>
 *
 * Achtung: onClose wird intern per Ref gehalten — damit führt eine bei
 * jedem Render neu erzeugte onClose-Funktion NICHT dazu, dass der Effect
 * neu läuft und der Auto-Focus ins Modal zurück springt (→ Input-Fokus-
 * Verlust beim Tippen).
 */
export function useModal(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef   = useRef(onClose)

  // onClose immer aktuell halten, ohne Effect-Dep
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    // Body-Scroll-Lock
    const origOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return

      // Focus-Trap: erste/letzte fokussierbare Elemente zyklisch halten
      const root = containerRef.current
      if (!root) return

      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('aria-hidden'))

      if (focusable.length === 0) return

      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    // Initialer Focus EINMAL beim Öffnen auf das erste Input (falls vorhanden),
    // sonst auf das erste fokussierbare Element. Buttons werden übersprungen,
    // wenn ein Input im Modal existiert — damit der Cursor direkt im Textfeld
    // landet und der User tippen kann ohne dass der X-Button markiert wird.
    const timer = window.setTimeout(() => {
      const root = containerRef.current
      if (!root) return
      const firstInput = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled])'
      )
      if (firstInput) { firstInput.focus(); return }
      const firstFocusable = root.querySelector<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    }, 50)

    return () => {
      document.body.style.overflow = origOverflow
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(timer)
    }
    // Nur auf isOpen reagieren — onClose per Ref, damit kein Re-Run beim Tippen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return containerRef
}
