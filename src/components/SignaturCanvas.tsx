'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Eraser } from 'lucide-react'

interface Props {
  onExport?: (dataUrl: string | null) => void
  className?: string
}

export default function SignaturCanvas({ onExport, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const zeichnen = useRef(false)
  const letzterPunkt = useRef<{ x: number; y: number } | null>(null)
  const [hatInhalt, setHatInhalt] = useState(false)

  // Canvas auf richtiger Pixeldichte initialisieren
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    ctx.scale(ratio, ratio)
    ctx.strokeStyle = '#111111'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function gibPunkt(e: { clientX: number; clientY: number }, canvas: HTMLCanvasElement): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const zeichneStrich = useCallback((von: { x: number; y: number }, zu: { x: number; y: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(von.x, von.y)
    ctx.lineTo(zu.x, zu.y)
    ctx.stroke()
    setHatInhalt(true)
    onExport?.(canvas.toDataURL('image/png'))
  }, [onExport])

  // Mouse Events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function onMouseDown(e: MouseEvent) {
      zeichnen.current = true
      letzterPunkt.current = gibPunkt(e, canvas!)
    }
    function onMouseMove(e: MouseEvent) {
      if (!zeichnen.current || !letzterPunkt.current) return
      const neu = gibPunkt(e, canvas!)
      zeichneStrich(letzterPunkt.current, neu)
      letzterPunkt.current = neu
    }
    function onMouseUp() {
      zeichnen.current = false
      letzterPunkt.current = null
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [zeichneStrich])

  // Touch Events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function onTouchStart(e: TouchEvent) {
      e.preventDefault()
      const touch = e.touches[0]
      zeichnen.current = true
      letzterPunkt.current = gibPunkt(touch, canvas!)
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault()
      if (!zeichnen.current || !letzterPunkt.current) return
      const touch = e.touches[0]
      const neu = gibPunkt(touch, canvas!)
      zeichneStrich(letzterPunkt.current, neu)
      letzterPunkt.current = neu
    }
    function onTouchEnd(e: TouchEvent) {
      e.preventDefault()
      zeichnen.current = false
      letzterPunkt.current = null
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [zeichneStrich])

  function loeschen() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const ratio = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio)
    setHatInhalt(false)
    onExport?.(null)
  }

  function exportieren(): string | null {
    if (!hatInhalt) return null
    return canvasRef.current?.toDataURL('image/png') ?? null
  }

  // Expose exportieren via ref-like callback
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (canvasRef.current) (canvasRef.current as any).__export = exportieren
  })

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-[200px] rounded-xl border-2 border-[#445c49] bg-[#f9fafb] cursor-crosshair touch-none select-none"
          style={{ display: 'block' }}
        />
        {!hatInhalt && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-300 select-none">Hier unterschreiben</p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={loeschen}
        className="self-end flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Eraser className="w-3.5 h-3.5" />
        Unterschrift löschen
      </button>
    </div>
  )
}
