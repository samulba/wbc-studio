'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileDown, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface Props {
  token: string
  raumName: string
  projektName: string
  canvasJson: string | null
  breiteM: number | null
  laengeM: number | null
  hoeheM: number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricLib = { Canvas: any; Rect: any; Line: any }

export default function RaumplanPraesentation({
  raumName, projektName, canvasJson, breiteM, laengeM,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasElRef  = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef    = useRef<any>(null)
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(true)
  const [hasContent, setHasContent] = useState(false)

  // ── Canvas initialisieren ────────────────────────────────────
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return

    let fab: FabricLib
    let canvas: ReturnType<typeof fab.Canvas>

    async function init() {
      const fabric = await import('fabric')
      fab = fabric as unknown as FabricLib

      const container = containerRef.current!
      const W = container.clientWidth
      const H = container.clientHeight

      canvas = new fab.Canvas(canvasElRef.current!, {
        width: W, height: H,
        backgroundColor: '#ffffff',
        selection: false,
        interactive: false,
      })
      fabricRef.current = canvas

      // Prevent context-menu on canvas (cleaner UX)
      canvas.wrapperEl?.addEventListener('contextmenu', (e: Event) => e.preventDefault())

      // Wheel zoom
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY
        let z = canvas.getZoom()
        z *= 0.999 ** delta
        z = Math.min(Math.max(z, 0.05), 10)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY } as any, z)
        setZoom(z)
        canvas.requestRenderAll()
      }
      canvas.wrapperEl?.addEventListener('wheel', handleWheel, { passive: false })

      // Pan via drag
      let isPanning = false
      let lastX = 0, lastY = 0
      canvas.on('mouse:down', (opt: { e: MouseEvent }) => {
        isPanning = true; lastX = opt.e.clientX; lastY = opt.e.clientY
        canvas.wrapperEl.style.cursor = 'grabbing'
      })
      canvas.on('mouse:move', (opt: { e: MouseEvent }) => {
        if (!isPanning) return
        const dx = opt.e.clientX - lastX
        const dy = opt.e.clientY - lastY
        lastX = opt.e.clientX; lastY = opt.e.clientY
        const vpt = canvas.viewportTransform!.slice() as number[]
        vpt[4] += dx; vpt[5] += dy
        canvas.setViewportTransform(vpt); canvas.requestRenderAll()
      })
      canvas.on('mouse:up', () => { isPanning = false; canvas.wrapperEl.style.cursor = 'grab' })
      canvas.wrapperEl.style.cursor = 'grab'

      // Load JSON
      if (canvasJson) {
        const json = JSON.parse(canvasJson)
        // Filter out outline + preview objects (same as editor)
        if (json.objects) {
          json.objects = json.objects.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (o: any) => o.data?.type !== 'outline' && o.data?.type !== 'preview'
          )
        }
        await canvas.loadFromJSON(json)

        // Reconstruct room outline from dimensions
        if (breiteM && laengeM) {
          const SCALE = 100
          const outline = new fab.Rect({
            left: 0, top: 0,
            width: breiteM * SCALE, height: laengeM * SCALE,
            fill: 'rgba(248,250,252,0.6)',
            stroke: '#1e293b', strokeWidth: 3,
            selectable: false, evented: false,
            data: { type: 'outline' },
          })
          canvas.add(outline)
          canvas.sendObjectToBack(outline)
        }

        canvas.requestRenderAll()
        setHasContent(true)
        // Auto-fit
        setTimeout(() => fitToView(canvas, W, H), 100)
      } else {
        setHasContent(false)
      }
      setLoading(false)
    }

    init()

    const handleResize = () => {
      const c = fabricRef.current; if (!c || !containerRef.current) return
      c.setWidth(containerRef.current.clientWidth)
      c.setHeight(containerRef.current.clientHeight)
      c.requestRenderAll()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      fabricRef.current?.dispose?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fitToView(canvas: ReturnType<FabricLib['Canvas']>, W: number, H: number) {
    const objects = canvas.getObjects().filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.data?.type !== 'grid'
    )
    if (!objects.length) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    objects.forEach((obj: any) => {
      const b = obj.getBoundingRect(true)
      minX = Math.min(minX, b.left); minY = Math.min(minY, b.top)
      maxX = Math.max(maxX, b.left + b.width); maxY = Math.max(maxY, b.top + b.height)
    })
    const PAD = 60
    const contentW = maxX - minX, contentH = maxY - minY
    if (contentW <= 0 || contentH <= 0) return
    const scaleX = (W - PAD * 2) / contentW
    const scaleY = (H - PAD * 2) / contentH
    const z = Math.min(scaleX, scaleY, 3)
    const cx = minX + contentW / 2
    const cy = minY + contentH / 2
    canvas.setViewportTransform([z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z])
    canvas.requestRenderAll()
    setZoom(z)
  }

  function handleFitToView() {
    const c = fabricRef.current; if (!c || !containerRef.current) return
    fitToView(c, containerRef.current.clientWidth, containerRef.current.clientHeight)
  }

  function handleZoom(factor: number) {
    const c = fabricRef.current; if (!c || !containerRef.current) return
    const W = containerRef.current.clientWidth
    const H = containerRef.current.clientHeight
    const z = Math.min(Math.max(c.getZoom() * factor, 0.05), 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.zoomToPoint({ x: W / 2, y: H / 2 } as any, z)
    c.requestRenderAll()
    setZoom(z)
  }

  async function exportPng(multiplier = 2) {
    const c = fabricRef.current; if (!c) return
    const dataUrl = c.toDataURL({ format: 'png', multiplier })
    const a = document.createElement('a')
    a.download = `Grundriss-${raumName}.png`
    a.href = dataUrl; a.click()
  }

  async function exportPdf() {
    const c = fabricRef.current; if (!c || !containerRef.current) return
    const { default: jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const W = 297, H = 210
    // Header
    pdf.setFillColor(68, 92, 73)
    pdf.rect(0, 0, W, 14, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text(raumName, 10, 9)
    if (projektName) {
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Projekt: ${projektName}`, 10, 13.5)
    }
    // Canvas screenshot
    const imgData = c.toDataURL({ format: 'png', multiplier: 2 })
    const canvasW = W - 20, canvasH = H - 28
    pdf.addImage(imgData, 'PNG', 10, 17, canvasW, canvasH, '', 'FAST')
    // Footer
    pdf.setFontSize(7)
    pdf.setTextColor(150, 150, 150)
    pdf.text('Erstellt mit Wellbeing Spaces', W / 2, H - 4, { align: 'center' })
    pdf.save(`Grundriss-${raumName}.pdf`)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f6f7f5' }}>

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo + Raum-Info */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Wellbeing Spaces Logo-Text */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#445c49' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="0" y="0" width="8" height="8" rx="1.5" fill="white" opacity="0.3" />
                  <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.6" />
                  <rect x="6" y="6" width="8" height="8" rx="1.5" fill="white" />
                </svg>
              </div>
              <span className="text-[13px] font-bold hidden sm:block" style={{ color: '#445c49', fontFamily: 'Syne, sans-serif' }}>
                Wellbeing Spaces
              </span>
            </div>
            <div className="w-px h-5 bg-gray-200 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-gray-900 truncate">{raumName}</h1>
              {projektName && (
                <p className="text-xs text-gray-400 truncate hidden sm:block">Projekt: {projektName}</p>
              )}
            </div>
          </div>

          {/* Zoom-Buttons + Downloads */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => handleZoom(1 / 1.2)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white transition-colors text-gray-600" title="Verkleinern">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono text-gray-500 px-1 min-w-[36px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={() => handleZoom(1.2)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white transition-colors text-gray-600" title="Vergrößern">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleFitToView}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white transition-colors text-gray-600" title="Einpassen">
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>

            <div className="w-px h-5 bg-gray-200" />

            {/* Download PNG */}
            <button onClick={() => exportPng(2)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              title="Als PNG herunterladen">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PNG</span>
            </button>

            {/* Download PDF */}
            <button onClick={exportPdf}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors"
              style={{ background: '#445c49' }}
              title="Als PDF herunterladen">
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Canvas-Bereich ── */}
      <div className="flex-1 relative" ref={containerRef}>
        <canvas ref={canvasElRef} className="absolute inset-0" />

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f6f7f5]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#445c49] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Grundriss wird geladen…</p>
            </div>
          </div>
        )}

        {/* Kein Inhalt */}
        {!loading && !hasContent && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: '#e8ede9' }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="4" width="24" height="24" rx="3" stroke="#445c49" strokeWidth="2" fill="none" />
                  <rect x="10" y="10" width="12" height="8" rx="1.5" fill="#94c1a4" opacity="0.6" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">Noch kein Grundriss vorhanden</p>
              <p className="text-xs text-gray-400 mt-1">Der Grundriss wurde noch nicht erstellt.</p>
            </div>
          </div>
        )}

        {/* Raummaße-Badge */}
        {!loading && breiteM && laengeM && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-100">
            <p className="text-[11px] font-medium text-gray-600">
              {breiteM} × {laengeM} m
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-100 py-3 text-center shrink-0">
        <p className="text-xs text-gray-300">
          Erstellt mit{' '}
          <span className="font-medium" style={{ color: '#445c49' }}>Wellbeing Spaces</span>
        </p>
      </footer>
    </div>
  )
}
