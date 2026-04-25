'use client'

import { useState, useEffect } from 'react'

/**
 * Eingabefeld für Euro-Budgets mit automatischem Tausenderpunkt.
 *
 * Anzeige:  2.000  · 25.000  · 150.000
 * Form-Wert (hidden): 2000   · 25000   · 150000
 *
 * Bewusst kein Cents-Support: Projekt-Budgets sind in der Praxis
 * runde Beträge. Live-Formatierung mit Komma + Punkt zusammen ist
 * fehleranfällig (Cursor-Sprünge bei Backspace, halbe Eingaben).
 * Falls Cents irgendwann nötig: separates Feld mit anderer Logik.
 */
export default function EuroBudgetInput({
  name,
  defaultValue,
  placeholder,
  className,
  id,
}: {
  name:          string
  defaultValue?: number | string | null
  placeholder?:  string
  className?:    string
  id?:           string
}) {
  const initialNum = typeof defaultValue === 'number'
    ? defaultValue
    : typeof defaultValue === 'string' && defaultValue.trim() !== ''
      ? parseFloat(defaultValue)
      : null

  const [raw, setRaw]         = useState<string>(initialNum != null && !isNaN(initialNum) ? String(Math.round(initialNum)) : '')
  const [display, setDisplay] = useState<string>(initialNum != null && !isNaN(initialNum) ? Math.round(initialNum).toLocaleString('de-DE') : '')

  // Wenn der Form-Reset oder ein externer Default-Wechsel kommt, mitziehen.
  useEffect(() => {
    if (initialNum != null && !isNaN(initialNum) && raw === '') {
      const rounded = Math.round(initialNum)
      setRaw(String(rounded))
      setDisplay(rounded.toLocaleString('de-DE'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue])

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Nur Ziffern aus der Eingabe ziehen, alles andere weg
    const onlyDigits = e.target.value.replace(/\D/g, '')
    if (!onlyDigits) { setRaw(''); setDisplay(''); return }
    const num = parseInt(onlyDigits, 10)
    if (isNaN(num)) { setRaw(''); setDisplay(''); return }
    setRaw(String(num))
    setDisplay(num.toLocaleString('de-DE'))
  }

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
      />
      <input type="hidden" name={name} value={raw} />
    </>
  )
}
