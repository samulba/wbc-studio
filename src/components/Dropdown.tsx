'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
}

/**
 * Modernes Custom-Dropdown — Ersatz für natives `<select>`.
 * Click-Outside-Close, ESC-Close, kein Browser-OS-Look.
 *
 * Wenn `value === ''`, wird `placeholder` angezeigt.
 */
export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Auswählen…',
  className = '',
}: {
  value:        string
  onChange:     (v: string) => void
  options:      DropdownOption[]
  placeholder?: string
  className?:   string
}) {
  const [offen, setOffen] = useState(false)
  const refRoot = useRef<HTMLDivElement>(null)

  // Click outside + ESC
  useEffect(() => {
    if (!offen) return
    function onDoc(e: MouseEvent) {
      if (!refRoot.current?.contains(e.target as Node)) setOffen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOffen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [offen])

  const aktiv = options.find((o) => o.value === value)

  return (
    <div ref={refRoot} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        className={`flex items-center gap-2 w-full text-left text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition-colors ${
          offen ? 'border-wellbeing-green-light ring-2 ring-wellbeing-green/20' : ''
        }`}
      >
        <span className={`flex-1 truncate ${aktiv ? 'text-gray-800' : 'text-gray-400'}`}>
          {aktiv?.label ?? placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>

      {offen && (
        <div className="absolute z-30 mt-1 left-0 min-w-full max-w-[300px] max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {options.map((opt) => {
            const ist = opt.value === value
            return (
              <button
                key={opt.value || '__empty'}
                type="button"
                onClick={() => { onChange(opt.value); setOffen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                  ist ? 'bg-wellbeing-green/5 text-wellbeing-green-dark' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {ist && <Check className="w-3 h-3 text-wellbeing-green shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
