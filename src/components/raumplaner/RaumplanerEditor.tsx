'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MousePointer2, Minus, Plus, Grid3x3, Save, Trash2,
  RotateCcw, RotateCw, Search, ChevronLeft, Pencil,
  Eraser, CheckCircle,
} from 'lucide-react'
import { grundrissSpeichern, raumMasseAktualisieren } from '@/app/actions/raumplaner'
import type { MoebelSymbol } from '@/lib/supabase/types'

// ── Konstanten ─────────────────────────────────────────────────

const SCALE = 100          // px pro Meter bei 100% Zoom
const WALL_THICKNESS = 15  // px (= 15cm)
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4

type Tool = 'select' | 'wall' | 'eraser'
type GridOption = 10 | 25 | 50 | 100

// ── Props ──────────────────────────────────────────────────────

interface Props {
  raumId: string
  projektId: string
  raumName: string
  breiteM: number | null
  laengeM: number | null
  hoeheM: number | null
  initialCanvasJson: string | null
  moebelSymbole: MoebelSymbol[]
  produkte: Array<{ id: string; name: string; kategorie: string | null }>
}

// ── Grid-Zeichnung ─────────────────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  vpt: number[],
  canvasW: number,
  canvasH: number,
  gridPx: number,
  show: boolean
) {
  if (!show) return
  const z = vpt[0]
  const ox = vpt[4]
  const oy = vpt[5]
  const minor = gridPx * z
  const major = SCALE * z

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  // Minor-Raster
  if (minor > 4) {
    ctx.strokeStyle = 'rgba(229, 231, 235, 0.9)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    const sx = ((ox % minor) + minor) % minor
    const sy = ((oy % minor) + minor) % minor
    for (let x = sx; x <= canvasW; x += minor) { ctx.moveTo(x, 0); ctx.lineTo(x, canvasH) }
    for (let y = sy; y <= canvasH; y += minor) { ctx.moveTo(0, y); ctx.lineTo(canvasW, y) }
    ctx.stroke()
  }

  // Major-Raster (1m)
  if (major > 8) {
    ctx.strokeStyle = 'rgba(209, 213, 219, 0.95)'
    ctx.lineWidth = 1
    ctx.beginPath()
    const mx = ((ox % major) + major) % major
    const my = ((oy % major) + major) % major
    for (let x = mx; x <= canvasW; x += major) { ctx.moveTo(x, 0); ctx.lineTo(x, canvasH) }
    for (let y = my; y <= canvasH; y += major) { ctx.moveTo(0, y); ctx.lineTo(canvasW, y) }
    ctx.stroke()
  }
  ctx.restore()
}

// ── Hauptkomponente ────────────────────────────────────────────

export default function RaumplanerEditor({
  raumId,
  projektId,
  raumName,
  breiteM,
  laengeM,
  hoeheM,
  initialCanvasJson,
  moebelSymbole,
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef    = useRef<any>(null)

  const [activeTool, setActiveTool]     = useState<Tool>('select')
  const [showGrid,   setShowGrid]       = useState(true)
  const [gridSize,   setGridSize]       = useState<GridOption>(25)
  const [zoom,       setZoom]           = useState(1)
  const [mousePos,   setMousePos]       = useState({ x: 0, y: 0 })
  const [saveStatus, setSaveStatus]     = useState<'saved' | 'unsaved' | 'saving'>('saved')
  const [moebelSuche, setMoebelSuche]  = useState('')
  const [selectedProps, setSelectedProps] = useState<{
    x: number; y: number; w: number; h: number; angle: number; fill: string; name: string
  } | null>(null)

  // Raum-Maße als editierbare State
  const [raumBreite, setRaumBreite] = useState(breiteM?.toString() ?? '')
  const [raumLaenge, setRaumLaenge] = useState(laengeM?.toString() ?? '')
  const [raumHoehe,  setRaumHoehe]  = useState(hoeheM?.toString() ?? '2.50')

  // Refs für Event-Handler (vermeidet Stale-Closure-Probleme)
  const activeToolRef  = useRef<Tool>('select')
  const showGridRef    = useRef(true)
  const gridSizeRef    = useRef<number>(25)
  const saveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wallStartRef   = useRef<{ x: number; y: number } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wallPreviewRef = useRef<any>(null)
  const isSpaceRef     = useRef(false)
  const isPanningRef   = useRef(false)
  const lastPanPosRef  = useRef({ x: 0, y: 0 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricImports  = useRef<any>(null)
  const historyRef     = useRef<string[]>([])
  const historyIdxRef  = useRef(-1)

  // ── Sync Refs ──────────────────────────────────────────────

  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  useEffect(() => { showGridRef.current = showGrid; fabricRef.current?.requestRenderAll() }, [showGrid])
  useEffect(() => { gridSizeRef.current = gridSize; fabricRef.current?.requestRenderAll() }, [gridSize])

  // ── Auto-Save ─────────────────────────────────────────────

  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const canvas = fabricRef.current
      if (!canvas) return
      setSaveStatus('saving')
      const json = JSON.stringify(canvas.toJSON(['data', 'name']))
      await grundrissSpeichern(raumId, json)
      setSaveStatus('saved')
    }, 2000)
  }, [raumId])

  // ── History (Undo/Redo) ───────────────────────────────────

  const pushHistory = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const json = JSON.stringify(canvas.toJSON(['data', 'name']))
    // Schneide Future-History ab
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1)
    historyRef.current.push(json)
    historyIdxRef.current = historyRef.current.length - 1
    // Max 50 Steps
    if (historyRef.current.length > 50) {
      historyRef.current.shift()
      historyIdxRef.current--
    }
  }, [])

  const undo = useCallback(async () => {
    const canvas = fabricRef.current
    const { loadFromJSON } = fabricImports.current ?? {}
    if (!canvas || !loadFromJSON || historyIdxRef.current <= 0) return
    historyIdxRef.current--
    const json = historyRef.current[historyIdxRef.current]
    canvas.clear()
    await canvas.loadFromJSON(JSON.parse(json))
    canvas.requestRenderAll()
  }, [])

  const redo = useCallback(async () => {
    const canvas = fabricRef.current
    const { loadFromJSON } = fabricImports.current ?? {}
    if (!canvas || !loadFromJSON || historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    const json = historyRef.current[historyIdxRef.current]
    canvas.clear()
    await canvas.loadFromJSON(JSON.parse(json))
    canvas.requestRenderAll()
  }, [])

  // ── Manuelles Speichern ───────────────────────────────────

  const saveNow = useCallback(async () => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    const json = JSON.stringify(canvas.toJSON(['data', 'name']))
    await grundrissSpeichern(raumId, json)
    setSaveStatus('saved')
  }, [raumId])

  // ── Möbel auf Canvas platzieren ───────────────────────────

  const placeMoebel = useCallback((symbol: MoebelSymbol, canvasX: number, canvasY: number) => {
    const canvas = fabricRef.current
    const imp = fabricImports.current
    if (!canvas || !imp) return

    const { Rect, Text, Group } = imp
    const w = symbol.breite_cm
    const h = symbol.tiefe_cm

    const bg = new Rect({
      width: w, height: h,
      fill: symbol.farbe || '#94c1a4',
      stroke: '#4b5563', strokeWidth: 1.5,
      rx: 3, ry: 3,
      originX: 'left', originY: 'top',
    })

    const label = new Text(symbol.name, {
      fontSize: Math.max(8, Math.min(12, w / symbol.name.length * 1.5)),
      fill: '#1f2937',
      textAlign: 'center',
      originX: 'center', originY: 'center',
      left: w / 2, top: h / 2,
      fontFamily: 'system-ui, sans-serif',
    })

    const group = new Group([bg, label], {
      left: canvasX - w / 2,
      top: canvasY - h / 2,
      data: { type: 'moebel', symbolId: symbol.id, name: symbol.name },
    })

    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.requestRenderAll()
    pushHistory()
    triggerAutoSave()
  }, [pushHistory, triggerAutoSave])

  // ── Wand zeichnen ─────────────────────────────────────────

  const finishWall = useCallback((x2: number, y2: number) => {
    const canvas = fabricRef.current
    const imp = fabricImports.current
    if (!canvas || !imp || !wallStartRef.current) return
    const { Line } = imp
    const { x: x1, y: y1 } = wallStartRef.current

    if (wallPreviewRef.current) {
      canvas.remove(wallPreviewRef.current)
      wallPreviewRef.current = null
    }

    if (Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) < 5) return

    const wall = new Line([x1, y1, x2, y2], {
      stroke: '#374151',
      strokeWidth: WALL_THICKNESS,
      strokeLineCap: 'square',
      selectable: true,
      data: { type: 'wall' },
      name: 'Wand',
    })
    canvas.add(wall)
    pushHistory()
    triggerAutoSave()
    canvas.requestRenderAll()
  }, [pushHistory, triggerAutoSave])

  // ── Canvas initialisieren ─────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return
    let disposed = false

    import('fabric').then(async (fabric) => {
      if (disposed || !canvasRef.current) return
      fabricImports.current = fabric

      const { Canvas, Line, Point } = fabric
      const cont = containerRef.current!
      const canvas = new Canvas(canvasRef.current!, {
        selection: true,
        preserveObjectStacking: true,
        stopContextMenu: true,
        fireRightClick: true,
      })
      fabricRef.current = canvas

      // Canvas-Größe aus Container
      function resizeCanvas() {
        const w = cont.clientWidth
        const h = cont.clientHeight
        canvas.setWidth(w)
        canvas.setHeight(h)
        canvas.requestRenderAll()
      }
      resizeCanvas()

      const ro = new ResizeObserver(resizeCanvas)
      ro.observe(cont)

      // Grid in after:render
      canvas.on('after:render', ({ ctx }: { ctx: CanvasRenderingContext2D }) => {
        drawGrid(
          ctx,
          canvas.viewportTransform ?? [1,0,0,1,0,0],
          canvas.getWidth(),
          canvas.getHeight(),
          gridSizeRef.current,
          showGridRef.current
        )
      })

      // Zoom per Mausrad
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:wheel', (opt: any) => {
        const e = opt.e as WheelEvent
        const delta = e.deltaY
        let z = canvas.getZoom()
        z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * (delta > 0 ? 0.95 : 1.05)))
        canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), z)
        setZoom(Math.round(z * 100) / 100)
        e.preventDefault()
        e.stopPropagation()
      })

      // Mausposition tracken
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:move', (opt: any) => {
        const e = opt.e as MouseEvent
        const p = canvas.getPointer(e)
        setMousePos({
          x: Math.round(p.x / SCALE * 100) / 100,
          y: Math.round(p.y / SCALE * 100) / 100,
        })

        // Pan
        if (isPanningRef.current) {
          const dx = e.clientX - lastPanPosRef.current.x
          const dy = e.clientY - lastPanPosRef.current.y
          canvas.relativePan(new Point(dx, dy))
          lastPanPosRef.current = { x: e.clientX, y: e.clientY }
          return
        }

        // Wand-Vorschau
        if (activeToolRef.current === 'wall' && wallStartRef.current && wallPreviewRef.current) {
          const snapped = {
            x: Math.round(p.x / gridSizeRef.current) * gridSizeRef.current,
            y: Math.round(p.y / gridSizeRef.current) * gridSizeRef.current,
          }
          wallPreviewRef.current.set({ x2: snapped.x, y2: snapped.y })
          canvas.requestRenderAll()
        }
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:down', (opt: any) => {
        const e = opt.e as MouseEvent
        const tool = activeToolRef.current

        // Pan: Space gedrückt oder mittlere Maustaste
        if (isSpaceRef.current || e.button === 1) {
          isPanningRef.current = true
          lastPanPosRef.current = { x: e.clientX, y: e.clientY }
          canvas.selection = false
          canvas.setCursor('grabbing')
          canvas.discardActiveObject()
          return
        }

        if (tool === 'wall') {
          const p = canvas.getPointer(e)
          const snapped = {
            x: Math.round(p.x / gridSizeRef.current) * gridSizeRef.current,
            y: Math.round(p.y / gridSizeRef.current) * gridSizeRef.current,
          }

          if (e.detail === 2) {
            // Doppelklick: Wand-Modus beenden
            if (wallPreviewRef.current) { canvas.remove(wallPreviewRef.current); wallPreviewRef.current = null }
            wallStartRef.current = null
            setActiveTool('select')
            activeToolRef.current = 'select'
            return
          }

          if (!wallStartRef.current) {
            // Ersten Punkt setzen
            wallStartRef.current = snapped
            const preview = new Line([snapped.x, snapped.y, snapped.x, snapped.y], {
              stroke: '#445c49', strokeWidth: WALL_THICKNESS, strokeLineCap: 'square',
              selectable: false, evented: false, opacity: 0.5, data: { type: 'preview' },
            })
            wallPreviewRef.current = preview
            canvas.add(preview)
          } else {
            // Wand-Segment abschließen
            finishWall(snapped.x, snapped.y)
            wallStartRef.current = snapped
            // Neuen Preview starten
            const preview = new Line([snapped.x, snapped.y, snapped.x, snapped.y], {
              stroke: '#445c49', strokeWidth: WALL_THICKNESS, strokeLineCap: 'square',
              selectable: false, evented: false, opacity: 0.5, data: { type: 'preview' },
            })
            wallPreviewRef.current = preview
            canvas.add(preview)
          }
          return
        }

        if (tool === 'eraser') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const target = opt.target as any
          if (target && target.selectable !== false) {
            canvas.remove(target)
            setSelectedProps(null)
            pushHistory()
            triggerAutoSave()
            canvas.requestRenderAll()
          }
        }
      })

      canvas.on('mouse:up', () => {
        if (isPanningRef.current) {
          isPanningRef.current = false
          canvas.selection = activeToolRef.current === 'select'
          canvas.setCursor(activeToolRef.current === 'select' ? 'default' : 'crosshair')
        }
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function extractObjProps(obj: any) {
        return {
          x: Math.round((obj.left ?? 0) * 10) / 10,
          y: Math.round((obj.top ?? 0) * 10) / 10,
          w: Math.round((obj.getScaledWidth?.() ?? 0) * 10) / 10,
          h: Math.round((obj.getScaledHeight?.() ?? 0) * 10) / 10,
          angle: Math.round(obj.angle ?? 0),
          fill: typeof obj.fill === 'string' ? obj.fill : '#94c1a4',
          name: obj.name ?? '',
        }
      }

      // Objekt ausgewählt
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('selection:created', (e: any) => {
        const obj = e.selected?.[0]
        if (!obj) return
        setSelectedProps(extractObjProps(obj))
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('selection:updated', (e: any) => {
        const obj = e.selected?.[0]
        if (!obj) return
        setSelectedProps({
          x: Math.round((obj.left ?? 0) * 10) / 10,
          y: Math.round((obj.top ?? 0) * 10) / 10,
          w: Math.round((obj.getScaledWidth?.() ?? 0) * 10) / 10,
          h: Math.round((obj.getScaledHeight?.() ?? 0) * 10) / 10,
          angle: Math.round(obj.angle ?? 0),
          fill: typeof obj.fill === 'string' ? obj.fill : '#94c1a4',
          name: obj.name ?? '',
        })
      })
      canvas.on('selection:cleared', () => setSelectedProps(null))

      // Objekt nach Änderung History + AutoSave
      canvas.on('object:modified', () => { pushHistory(); triggerAutoSave() })

      // Drop von Möbeln
      const dropTarget = cont
      dropTarget.addEventListener('dragover', (e: DragEvent) => e.preventDefault())
      dropTarget.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault()
        const symbolJson = e.dataTransfer?.getData('application/moebel-symbol')
        if (!symbolJson) return
        const symbol: MoebelSymbol = JSON.parse(symbolJson)
        const rect = cont.getBoundingClientRect()
        const px = e.clientX - rect.left
        const py = e.clientY - rect.top
        const p = canvas.getPointer({ offsetX: px, offsetY: py } as MouseEvent)
        placeMoebel(symbol, p.x, p.y)
      })

      // Canvas laden
      if (initialCanvasJson) {
        try {
          await canvas.loadFromJSON(JSON.parse(initialCanvasJson))
          canvas.requestRenderAll()
        } catch {
          // Ungültiger JSON – leeres Canvas
        }
      }

      // Initial-History
      pushHistory()

      // Keyboard
      function handleKeyDown(e: KeyboardEvent) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        if (e.code === 'Space') { isSpaceRef.current = true; canvas.setCursor('grab'); e.preventDefault() }
        if ((e.key === 'Delete' || e.key === 'Backspace') && !e.repeat) {
          const obj = canvas.getActiveObject()
          if (obj) {
            canvas.remove(obj)
            setSelectedProps(null)
            pushHistory()
            triggerAutoSave()
            canvas.requestRenderAll()
          }
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
        if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
        if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveNow() }
      }
      function handleKeyUp(e: KeyboardEvent) {
        if (e.code === 'Space') {
          isSpaceRef.current = false
          canvas.setCursor(activeToolRef.current === 'select' ? 'default' : 'crosshair')
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)

      return () => {
        disposed = true
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
        ro.disconnect()
        canvas.dispose()
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Tool wechseln ──────────────────────────────────────────

  function switchTool(tool: Tool) {
    setActiveTool(tool)
    activeToolRef.current = tool
    const canvas = fabricRef.current
    if (!canvas) return

    // Wand-Preview entfernen
    if (wallPreviewRef.current) { canvas.remove(wallPreviewRef.current); wallPreviewRef.current = null }
    wallStartRef.current = null

    canvas.selection = tool === 'select'
    canvas.isDrawingMode = false
    canvas.setCursor(tool === 'select' ? 'default' : 'crosshair')
    if (tool !== 'select') canvas.discardActiveObject()
    canvas.requestRenderAll()
  }

  // ── Zoom-Controls ──────────────────────────────────────────

  function zoomIn() {
    const canvas = fabricRef.current
    if (!canvas) return
    const z = Math.min(MAX_ZOOM, canvas.getZoom() * 1.2)
    canvas.zoomToPoint({ x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 }, z)
    setZoom(Math.round(z * 100) / 100)
  }
  function zoomOut() {
    const canvas = fabricRef.current
    if (!canvas) return
    const z = Math.max(MIN_ZOOM, canvas.getZoom() / 1.2)
    canvas.zoomToPoint({ x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 }, z)
    setZoom(Math.round(z * 100) / 100)
  }
  function zoomReset() {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    setZoom(1)
    canvas.requestRenderAll()
  }

  // ── Objekt löschen ────────────────────────────────────────

  function deleteSelected() {
    const canvas = fabricRef.current
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (!obj) return
    canvas.remove(obj)
    setSelectedProps(null)
    pushHistory()
    triggerAutoSave()
    canvas.requestRenderAll()
  }

  // ── Raum-Maße speichern ───────────────────────────────────

  async function saveRaumMasse() {
    const b = parseFloat(raumBreite) || null
    const l = parseFloat(raumLaenge) || null
    const h = parseFloat(raumHoehe) || null
    await raumMasseAktualisieren(raumId, b, l, h, projektId)
  }

  // ── Möbel-Liste filtern ───────────────────────────────────

  const filteredMoebel = moebelSymbole.filter((s) =>
    s.name.toLowerCase().includes(moebelSuche.toLowerCase())
  )

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-200" style={{ minHeight: '100vh' }}>

      {/* ── Top-Toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        {/* Back */}
        <Link
          href={`/dashboard/projekte/${projektId}/raeume/${raumId}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {raumName}
        </Link>

        <div className="w-px h-5 bg-gray-800 mx-1" />

        {/* Tools */}
        <div className="flex items-center gap-1">
          {([
            { key: 'select', Icon: MousePointer2, label: 'Auswahl (V)' },
            { key: 'wall',   Icon: Pencil,       label: 'Wand zeichnen (W)' },
            { key: 'eraser', Icon: Eraser,       label: 'Löschen (E)' },
          ] as const).map(({ key, Icon, label }) => (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => switchTool(key)}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === key
                  ? 'bg-wellbeing-green text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-800 mx-1" />

        {/* Undo/Redo */}
        <button type="button" title="Rückgängig (Ctrl+Z)" onClick={undo} className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button type="button" title="Wiederholen (Ctrl+Y)" onClick={redo} className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors">
          <RotateCw className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-800 mx-1" />

        {/* Grid-Toggle */}
        <button
          type="button"
          title="Raster ein/aus"
          onClick={() => setShowGrid((g) => !g)}
          className={`p-2 rounded-lg transition-colors ${showGrid ? 'text-wellbeing-green-light bg-wellbeing-green/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
        >
          <Grid3x3 className="w-4 h-4" />
        </button>

        {/* Grid-Größe */}
        <select
          value={gridSize}
          onChange={(e) => setGridSize(Number(e.target.value) as GridOption)}
          className="text-[11px] bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-wellbeing-green"
        >
          <option value={10}>10cm</option>
          <option value={25}>25cm</option>
          <option value={50}>50cm</option>
          <option value={100}>100cm</option>
        </select>

        <div className="flex-1" />

        {/* Zoom-Controls */}
        <button type="button" onClick={zoomOut} className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={zoomReset} className="min-w-[56px] text-center text-xs text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg px-2 py-1.5 transition-colors font-mono">
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" onClick={zoomIn} className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-gray-800 mx-2" />

        {/* Speichern */}
        <button
          type="button"
          onClick={saveNow}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            saveStatus === 'saved'
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              : saveStatus === 'saving'
              ? 'text-gray-500 cursor-wait'
              : 'text-wellbeing-green-light bg-wellbeing-green/20 hover:bg-wellbeing-green/30'
          }`}
        >
          {saveStatus === 'saved' ? (
            <><CheckCircle className="w-3.5 h-3.5" /> Gespeichert</>
          ) : saveStatus === 'saving' ? (
            <><Save className="w-3.5 h-3.5 animate-pulse" /> Speichern…</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> Speichern</>
          )}
        </button>
      </div>

      {/* ── Hauptbereich ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Linke Sidebar ── */}
        <div className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden shrink-0">
          {/* Suche */}
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Möbel suchen…"
                value={moebelSuche}
                onChange={(e) => setMoebelSuche(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg pl-8 pr-3 py-2 placeholder-gray-600 focus:outline-none focus:border-wellbeing-green"
              />
            </div>
          </div>

          {/* Möbel-Grid */}
          <div className="flex-1 overflow-y-auto p-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wide font-medium px-1 mb-2">
              Möbel ({filteredMoebel.length})
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {filteredMoebel.map((symbol) => (
                <div
                  key={symbol.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/moebel-symbol', JSON.stringify(symbol))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => {
                    const canvas = fabricRef.current
                    if (!canvas) return
                    const cx = canvas.getWidth() / 2
                    const cy = canvas.getHeight() / 2
                    const vpt = canvas.viewportTransform ?? [1,0,0,1,0,0]
                    const px = (cx - vpt[4]) / vpt[0]
                    const py = (cy - vpt[5]) / vpt[3]
                    placeMoebel(symbol, px, py)
                  }}
                  className="bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-wellbeing-green/50 rounded-lg p-2 cursor-grab active:cursor-grabbing transition-all group"
                  title={`${symbol.name} (${symbol.breite_cm}×${symbol.tiefe_cm}cm)`}
                >
                  {/* Vorschau-Box */}
                  <div
                    className="w-full h-10 rounded mb-1.5 flex items-center justify-center text-[10px] text-gray-600 font-medium border border-dashed border-gray-600"
                    style={{ backgroundColor: symbol.farbe + '40' }}
                  >
                    <span style={{ color: symbol.farbe }} className="opacity-80">
                      {symbol.breite_cm}×{symbol.tiefe_cm}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-300 leading-tight truncate group-hover:text-white transition-colors">
                    {symbol.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Canvas-Bereich ── */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-gray-200"
          style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
        >
          <canvas ref={canvasRef} className="absolute inset-0" />
        </div>

        {/* ── Rechte Sidebar ── */}
        <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto p-4">

            {selectedProps ? (
              /* ── Objekt-Eigenschaften ── */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-200">
                    {selectedProps.name || 'Objekt'}
                  </h3>
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                    title="Löschen (Delete)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Position */}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Position</p>
                  <div className="grid grid-cols-2 gap-2">
                    <PropField label="X (cm)" value={selectedProps.x.toString()} />
                    <PropField label="Y (cm)" value={selectedProps.y.toString()} />
                  </div>
                </div>

                {/* Größe */}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Größe</p>
                  <div className="grid grid-cols-2 gap-2">
                    <PropField label="B (cm)" value={Math.round(selectedProps.w).toString()} />
                    <PropField label="T (cm)" value={Math.round(selectedProps.h).toString()} />
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Rotation</p>
                  <PropField label="° Grad" value={selectedProps.angle.toString()} />
                </div>
              </div>
            ) : (
              /* ── Raum-Eigenschaften ── */
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-200">Raum-Maße</h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1.5">
                      Breite (m)
                    </label>
                    <input
                      type="number"
                      value={raumBreite}
                      onChange={(e) => setRaumBreite(e.target.value)}
                      onBlur={saveRaumMasse}
                      step="0.1" min="0.5" max="50"
                      placeholder="z.B. 5.0"
                      className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-wellbeing-green"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1.5">
                      Länge (m)
                    </label>
                    <input
                      type="number"
                      value={raumLaenge}
                      onChange={(e) => setRaumLaenge(e.target.value)}
                      onBlur={saveRaumMasse}
                      step="0.1" min="0.5" max="50"
                      placeholder="z.B. 4.0"
                      className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-wellbeing-green"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1.5">
                      Höhe (m)
                    </label>
                    <input
                      type="number"
                      value={raumHoehe}
                      onChange={(e) => setRaumHoehe(e.target.value)}
                      onBlur={saveRaumMasse}
                      step="0.1" min="1.0" max="10"
                      placeholder="z.B. 2.50"
                      className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-wellbeing-green"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800">
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    Ziehe Möbel aus der linken Leiste auf die Zeichenfläche oder klicke darauf.<br /><br />
                    <span className="text-gray-500">Wand-Tool: Klicken = Punkt setzen, Doppelklick = beenden.</span><br />
                    <span className="text-gray-500">Space + Drag = Verschieben · Scroll = Zoom</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status-Bar ── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-900 border-t border-gray-800 shrink-0">
        <div className="flex items-center gap-4 text-[11px] text-gray-500 font-mono">
          <span>X: {mousePos.x.toFixed(2)} m</span>
          <span>Y: {mousePos.y.toFixed(2)} m</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-600">
          <span>1m = {SCALE}px</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span className={
            activeTool === 'wall' ? 'text-amber-400' :
            activeTool === 'eraser' ? 'text-red-400' :
            'text-wellbeing-green-light'
          }>
            {activeTool === 'select' ? 'Auswahl' : activeTool === 'wall' ? 'Wand' : 'Radierer'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Hilfkomponente: Eigenschafts-Feld ─────────────────────────

function PropField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[10px] text-gray-600 block mb-1">{label}</label>
      <div className="bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-lg px-3 py-2 font-mono">
        {value}
      </div>
    </div>
  )
}
