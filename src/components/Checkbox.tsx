'use client'

import { Check, Minus } from 'lucide-react'

/**
 * Custom-Checkbox im Wellbeing-Green-Style.
 *
 * Native <input type="checkbox"> respektiert in den meisten Browsern
 * die Tailwind-Farben nicht (zeigt OS-Akzentfarbe — bei vielen Usern rot/blau).
 * Diese Komponente rendert einen <button>-basierten Look der ueberall gleich
 * aussieht und ein verstecktes <input> fuer Form-Submit + a11y mitschickt.
 */
export default function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  disabled,
  ariaLabel,
  size = 16,
  onClick,
}: {
  checked:        boolean
  indeterminate?: boolean
  onChange:       (checked: boolean) => void
  disabled?:      boolean
  ariaLabel?:     string
  size?:          number
  /** Optional eigener onClick (zB stopPropagation) */
  onClick?:       (e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        if (onClick) onClick(e)
        if (!e.defaultPrevented) onChange(!checked)
      }}
      className={
        'shrink-0 inline-flex items-center justify-center rounded border transition-colors ' +
        (disabled ? 'opacity-50 cursor-not-allowed ' : 'cursor-pointer ') +
        (checked || indeterminate
          ? 'bg-wellbeing-green border-wellbeing-green text-white hover:bg-wellbeing-green-dark hover:border-wellbeing-green-dark'
          : 'bg-white border-gray-300 text-transparent hover:border-wellbeing-green')
      }
      style={{ width: size, height: size }}
    >
      {indeterminate ? (
        <Minus size={Math.round(size * 0.7)} strokeWidth={3} />
      ) : checked ? (
        <Check size={Math.round(size * 0.7)} strokeWidth={3} />
      ) : null}
    </button>
  )
}
