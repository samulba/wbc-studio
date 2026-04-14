'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  grundrissJson: string   // serialisiertes Fabric.js-JSON
  breiteM?: number | null
  laengeM?: number | null
  /** Breite der Vorschau in px (default 400) */
  vorschauBreite?: number
  className?: string
}

export default function GrundrissVorschau({
  grundrissJson, breiteM, laengeM,
  vorschauBreite = 400, className = '',
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const el = canvasRef.current
    const cont = containerRef.current
    if (!el || !cont) return
    let disposed = false

    import('fabric').then(async (fabric) => {
      if (disposed || !canvasRef.current) return
      const { Canvas, Rect } = fabric

      // Sichtbare Höhe = proportional zur Raumgröße, aber maximal 280px
      const aspect = (laengeM && breiteM) ? laengeM / breiteM : 0.7
      const visH = Math.min(Math.round(vorschauBreite * aspect), 280)
      el.width  = vorschauBreite
      el.height = visH

      const canvas = new Canvas(el, {
        width: vorschauBreite, height: visH,
        selection: false, interactive: false,
        renderOnAddRemove: false,
        backgroundColor: '#ffffff',
      })

      // Gespeicherte Objekte laden
      try {
        const parsed = JSON.parse(grundrissJson)
        // Keine outline/preview aus gespeichertem State
        if (parsed.objects) {
          parsed.objects = parsed.objects.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (o: any) => o.data?.type !== 'outline' && o.data?.type !== 'preview'
          )
        }
        await canvas.loadFromJSON(parsed)
      } catch { /* ignore */ }

      // Raum-Umriss zeichnen
      const SCALE = 100
      if (breiteM && laengeM) {
        const outline = new Rect({
          left: 0, top: 0,
          width: breiteM * SCALE, height: laengeM * SCALE,
          fill: 'transparent', stroke: '#374151', strokeWidth: 20,
          selectable: false, evented: false,
        })
        canvas.add(outline)
        canvas.sendObjectToBack(outline)
      }

      // Alle Objekte nicht interaktiv setzen
      canvas.getObjects().forEach((o: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        o.selectable = false; o.evented = false; o.hoverCursor = 'default'
      })

      // Fit-to-View: Bounding Box aller Objekte berechnen (Weltkoordinaten)
      const allObjs = canvas.getObjects()
      if (allObjs.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        allObjs.forEach((o: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const b = o.getBoundingRect()
          minX = Math.min(minX, b.left)
          minY = Math.min(minY, b.top)
          maxX = Math.max(maxX, b.left + b.width)
          maxY = Math.max(maxY, b.top + b.height)
        })
        const pad = 40
        const contentW = maxX - minX || 1
        const contentH = maxY - minY || 1
        const scaleX = (vorschauBreite - pad * 2) / contentW
        const scaleY = (visH - pad * 2) / contentH
        const z = Math.min(scaleX, scaleY, 1)
        // Mittelpunkt des Inhalts zentrieren auf sichtbarer Fläche
        const cx = (minX + maxX) / 2
        const cy = (minY + maxY) / 2
        canvas.setViewportTransform([
          z, 0, 0, z,
          vorschauBreite / 2 - cx * z,
          visH / 2 - cy * z,
        ])
      }

      canvas.requestRenderAll()
      if (!disposed) setIsLoading(false)

      return () => { disposed = true; canvas.dispose() }
    })

    return () => { disposed = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grundrissJson])

  const aspect = (laengeM && breiteM) ? laengeM / breiteM : 0.7
  const visH = Math.min(Math.round(vorschauBreite * aspect), 280)

  return (
    <div ref={containerRef} className={`relative overflow-hidden rounded-xl border border-gray-200 shadow-sm ${className}`}
      style={{ width: '100%', maxWidth: vorschauBreite, height: visH, background: '#ffffff' }}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#445c49]/30 border-t-[#445c49] rounded-full animate-spin" />
        </div>
      )}
      <canvas ref={canvasRef} className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'} style={{ display: 'block' }} />
    </div>
  )
}
