'use client'

/**
 * MoodboardEditor – Fabric.js Canvas mit unbegrenztem Workspace.
 *
 * Schritt 2 (dieser Commit): Canvas + Zoom/Pan + Basis-Toolbar (Select/Text/Rect/Circle/
 * Bild-Upload/Delete/Undo-Redo) + AutoSave alle 3s.
 * Folgeschritte: Sidebars (Produkte/Farben), Versionen, Freigabe, Export.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, MousePointer2, Type as TypeIcon, Square, Circle as CircleIcon,
  Image as ImageIcon, Trash2, Undo2, Redo2, Save, Maximize2,
  Search, Package, Palette, Upload,
} from 'lucide-react'
import { moodboardSpeichern, moodboardBildHochladen } from '@/app/actions/moodboard'

interface Props {
  moodboardId: string
  raumId: string
  projektId: string
  raumName: string
  boardName: string
  beschreibung: string | null
  initialCanvasJson: Record<string, unknown> | null
  freigabeAktiv: boolean
  freigabeKommentareAktiv: boolean
  freigabeToken: string | null
  produkte: Array<{
    id: string
    name: string
    kategorie: string | null
    bild_url: string | null
    verkaufspreis: number | null
  }>
}

type Tool = 'select' | 'text' | 'rect' | 'circle'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

// ── Color-Palette (Designer-Standards + Wellbeing-Farben) ──────
const COLOR_PALETTE = [
  // Wellbeing
  '#445c49', '#94c1a4', '#2d3e31', '#f6ede2', '#823509', '#cba178',
  // Neutrals
  '#ffffff', '#f5f5f0', '#e5e7eb', '#9ca3af', '#374151', '#000000',
  // Wood/Earth
  '#8b6f47', '#a78b66', '#6b4423', '#3e2c1a', '#d4b896', '#bea27e',
  // Pastels
  '#fde2e4', '#fad2e1', '#cddafd', '#a3c9a8', '#dcedc1', '#ffd8be',
  // Bolds
  '#1e3a5f', '#7d3c98', '#c0392b', '#d35400', '#16a085', '#2c3e50',
]

export default function MoodboardEditor({
  moodboardId, raumId, projektId, raumName, boardName,
  initialCanvasJson, produkte,
}: Props) {
  const canvasElRef    = useRef<HTMLCanvasElement | null>(null)
  const containerRef   = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef      = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricImportRef = useRef<any>(null)
  const fileInputRef   = useRef<HTMLInputElement | null>(null)
  const undoStackRef   = useRef<string[]>([])
  const redoStackRef   = useRef<string[]>([])
  const skipHistoryRef = useRef(false)
  const initialLoadedRef = useRef(false)

  const [tool, setTool] = useState<Tool>('select')
  const toolRef = useRef<Tool>('select')
  useEffect(() => { toolRef.current = tool }, [tool])

  const [zoom, setZoom] = useState(1)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [uploading, setUploading] = useState(false)

  // Linke Sidebar: aktiver Tab + Suche
  const [sidebarTab, setSidebarTab] = useState<'produkte' | 'farben' | 'upload'>('produkte')
  const [produktSuche, setProduktSuche] = useState('')
  const produkteGefiltert = useMemo(() => {
    const q = produktSuche.trim().toLowerCase()
    if (!q) return produkte
    return produkte.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.kategorie && p.kategorie.toLowerCase().includes(q)),
    )
  }, [produkte, produktSuche])

  // ── AutoSave (debounced 3s) ───────────────────────────────────
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(async () => {
      const canvas = fabricRef.current
      if (!canvas) return
      const json = (canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data']) as Record<string, unknown>
      const r = await moodboardSpeichern(moodboardId, json)
      setSaveStatus(r.fehler ? 'error' : 'saved')
      if (!r.fehler) setTimeout(() => setSaveStatus('idle'), 1200)
    }, 3000)
  }, [moodboardId])

  // ── History ────────────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    if (skipHistoryRef.current) return
    const canvas = fabricRef.current
    if (!canvas) return
    const json = JSON.stringify((canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data']))
    undoStackRef.current.push(json)
    if (undoStackRef.current.length > 50) undoStackRef.current.shift()
    redoStackRef.current = []
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function loadFromJson(canvas: any, jsonStr: string) {
    skipHistoryRef.current = true
    canvas.loadFromJSON(jsonStr, () => {
      canvas.requestRenderAll()
      skipHistoryRef.current = false
    })
  }

  function handleUndo() {
    const canvas = fabricRef.current
    if (!canvas || undoStackRef.current.length < 2) return
    const cur = undoStackRef.current.pop()!
    redoStackRef.current.push(cur)
    const prev = undoStackRef.current[undoStackRef.current.length - 1]
    loadFromJson(canvas, prev)
    scheduleSave()
  }
  function handleRedo() {
    const canvas = fabricRef.current
    if (!canvas || redoStackRef.current.length === 0) return
    const next = redoStackRef.current.pop()!
    undoStackRef.current.push(next)
    loadFromJson(canvas, next)
    scheduleSave()
  }

  // ── Canvas Init ────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return
    let disposed = false

    import('fabric').then((fabric) => {
      if (disposed || !canvasElRef.current) return
      fabricImportRef.current = fabric
      const { Canvas, Point } = fabric
      const cont = containerRef.current!

      const canvas = new Canvas(canvasElRef.current!, {
        selection: true,
        preserveObjectStacking: true,
        stopContextMenu: true,
        fireRightClick: true,
        backgroundColor: '#f5f5f0',
      })
      fabricRef.current = canvas
      canvas.selectionColor       = 'rgba(68,92,73,0.08)'
      canvas.selectionBorderColor = '#445c49'
      canvas.selectionLineWidth   = 1.5

      function resize() {
        canvas.setWidth(cont.clientWidth)
        canvas.setHeight(cont.clientHeight)
        canvas.requestRenderAll()
      }
      resize()
      const ro = new ResizeObserver(resize); ro.observe(cont)

      // ── ZOOM (Mausrad + Pinch) ────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:wheel', (opt: any) => {
        const e = opt.e as WheelEvent
        e.preventDefault(); e.stopPropagation()
        let z = canvas.getZoom()
        if (e.ctrlKey || e.metaKey) {
          z *= 0.99 ** e.deltaY
        } else {
          z *= 0.999 ** e.deltaY
        }
        z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
        canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), z)
        setZoom(Math.round(z * 100) / 100)
      })

      // ── PAN: Mittlere Maustaste oder Space+Drag ───────────────
      let isPanning = false
      let lastX = 0, lastY = 0
      let spaceDown = false

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:down', (opt: any) => {
        const e = opt.e as MouseEvent
        if (e.button === 1 || (spaceDown && e.button === 0)) {
          isPanning = true
          canvas.selection = false
          lastX = e.clientX; lastY = e.clientY
          cont.style.cursor = 'grabbing'
          return
        }

        // Tool-spezifische Aktionen
        const t = toolRef.current
        if (t === 'rect' || t === 'circle' || t === 'text') {
          const p = canvas.getPointer(e)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let obj: any = null
          if (t === 'rect') {
            obj = new fabric.Rect({
              left: p.x - 60, top: p.y - 40,
              width: 120, height: 80,
              fill: '#94c1a4', stroke: '#445c49', strokeWidth: 1,
              rx: 4, ry: 4,
            })
          } else if (t === 'circle') {
            obj = new fabric.Circle({
              left: p.x - 50, top: p.y - 50,
              radius: 50,
              fill: '#cba178', stroke: '#823509', strokeWidth: 1,
            })
          } else if (t === 'text') {
            obj = new fabric.IText('Doppelklick zum Bearbeiten', {
              left: p.x, top: p.y,
              fontSize: 24, fill: '#2d3e31', fontFamily: 'Inter, sans-serif',
            })
          }
          if (obj) {
            canvas.add(obj)
            canvas.setActiveObject(obj)
            canvas.requestRenderAll()
            setTool('select')
            pushHistory()
            scheduleSave()
          }
        }
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:move', (opt: any) => {
        if (!isPanning) return
        const e = opt.e as MouseEvent
        const dx = e.clientX - lastX
        const dy = e.clientY - lastY
        canvas.relativePan(new Point(dx, dy))
        lastX = e.clientX; lastY = e.clientY
      })

      canvas.on('mouse:up', () => {
        if (isPanning) {
          isPanning = false
          canvas.selection = true
          cont.style.cursor = 'default'
        }
      })

      // ── Keyboard ───────────────────────────────────────────────
      function onKeyDown(e: KeyboardEvent) {
        if (e.code === 'Space') { spaceDown = true; cont.style.cursor = 'grab'; return }
        const target = e.target as HTMLElement
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const active = canvas.getActiveObjects()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const activeObj = canvas.getActiveObject() as any
          if (active.length > 0 && !activeObj?.isEditing) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            active.forEach((o: any) => canvas.remove(o))
            canvas.discardActiveObject()
            canvas.requestRenderAll()
            pushHistory()
            scheduleSave()
            e.preventDefault()
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo() }
      }
      function onKeyUp(e: KeyboardEvent) {
        if (e.code === 'Space') { spaceDown = false; cont.style.cursor = 'default' }
      }
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)

      // ── Object-Events fuer History + AutoSave ─────────────────
      canvas.on('object:modified', () => { pushHistory(); scheduleSave() })
      canvas.on('object:added',    () => { if (!skipHistoryRef.current) { pushHistory(); scheduleSave() } })
      canvas.on('object:removed',  () => { if (!skipHistoryRef.current) { pushHistory(); scheduleSave() } })

      // Initial-State laden
      if (initialCanvasJson && Object.keys(initialCanvasJson).length > 0) {
        skipHistoryRef.current = true
        canvas.loadFromJSON(initialCanvasJson, () => {
          canvas.requestRenderAll()
          skipHistoryRef.current = false
          // Initial-Snapshot fuer Undo-Stack
          undoStackRef.current.push(JSON.stringify((canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data'])))
          initialLoadedRef.current = true
        })
      } else {
        undoStackRef.current.push(JSON.stringify((canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data'])))
        initialLoadedRef.current = true
      }

      return () => {
        ro.disconnect()
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
      }
    })

    return () => {
      disposed = true
      const c = fabricRef.current
      if (c) { try { c.dispose() } catch { /* noop */ } }
      fabricRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Bild-Upload ────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('bild', file)
    const r = await moodboardBildHochladen(raumId, fd)
    setUploading(false)
    e.target.value = ''
    if (r.fehler || !r.url) { alert(r.fehler ?? 'Upload fehlgeschlagen.'); return }
    addImageToCanvas(r.url)
  }

  function addImageToCanvas(url: string) {
    const canvas = fabricRef.current
    const fabric = fabricImportRef.current
    if (!canvas || !fabric) return
    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((img: any) => {
        const max = 320
        const scale = Math.min(max / (img.width || max), max / (img.height || max), 1)
        img.set({
          left: -((img.width || 0) * scale) / 2 + canvas.getWidth() / 2,
          top:  -((img.height || 0) * scale) / 2 + canvas.getHeight() / 2,
          scaleX: scale, scaleY: scale,
        })
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.requestRenderAll()
        pushHistory()
        scheduleSave()
      })
  }

  // ── Color-Swatch / Produkt aufs Board ─────────────────────────
  function addColorSwatch(hex: string) {
    const canvas = fabricRef.current
    const fabric = fabricImportRef.current
    if (!canvas || !fabric) return
    const cx = canvas.getWidth() / 2
    const cy = canvas.getHeight() / 2
    const rect = new fabric.Rect({
      left: cx - 60, top: cy - 60,
      width: 120, height: 120,
      fill: hex,
      stroke: '#0000001a', strokeWidth: 1,
      rx: 8, ry: 8,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.10)', blur: 12, offsetX: 0, offsetY: 4 }),
    })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.requestRenderAll()
    pushHistory()
    scheduleSave()
  }

  function addProduktAufBoard(p: { id: string; name: string; bild_url: string | null }) {
    if (p.bild_url) {
      // Wenn Bild vorhanden: als Image hinzufuegen mit data.produkt_id-Verknuepfung
      const fabric = fabricImportRef.current
      const canvas = fabricRef.current
      if (!fabric || !canvas) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabric.FabricImage.fromURL(p.bild_url, { crossOrigin: 'anonymous' }).then((img: any) => {
        const max = 280
        const scale = Math.min(max / (img.width || max), max / (img.height || max), 1)
        img.set({
          left: -((img.width || 0) * scale) / 2 + canvas.getWidth() / 2,
          top:  -((img.height || 0) * scale) / 2 + canvas.getHeight() / 2,
          scaleX: scale, scaleY: scale,
          data: { produkt_id: p.id, produkt_name: p.name },
        })
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.requestRenderAll()
        pushHistory()
        scheduleSave()
      })
    } else {
      // Kein Bild → Text-Platzhalter
      const fabric = fabricImportRef.current
      const canvas = fabricRef.current
      if (!fabric || !canvas) return
      const group = new fabric.Group([
        new fabric.Rect({ left: 0, top: 0, width: 200, height: 120, fill: '#f6ede2', stroke: '#cba178', strokeWidth: 1, rx: 8, ry: 8 }),
        new fabric.IText(p.name, {
          left: 12, top: 50,
          width: 176,
          fontSize: 14, fill: '#2d3e31', fontFamily: 'Inter, sans-serif',
        }),
      ], {
        left: canvas.getWidth() / 2 - 100,
        top:  canvas.getHeight() / 2 - 60,
        data: { produkt_id: p.id, produkt_name: p.name },
      })
      canvas.add(group)
      canvas.setActiveObject(group)
      canvas.requestRenderAll()
      pushHistory()
      scheduleSave()
    }
  }

  // ── UI-Aktionen ────────────────────────────────────────────────
  function handleZoomIn() {
    const c = fabricRef.current; if (!c) return
    const fabric = fabricImportRef.current
    let z = c.getZoom() * 1.2
    z = Math.min(MAX_ZOOM, z)
    c.zoomToPoint(new fabric.Point(c.getWidth()/2, c.getHeight()/2), z)
    setZoom(Math.round(z * 100) / 100)
  }
  function handleZoomOut() {
    const c = fabricRef.current; if (!c) return
    const fabric = fabricImportRef.current
    let z = c.getZoom() / 1.2
    z = Math.max(MIN_ZOOM, z)
    c.zoomToPoint(new fabric.Point(c.getWidth()/2, c.getHeight()/2), z)
    setZoom(Math.round(z * 100) / 100)
  }
  function handleZoomReset() {
    const c = fabricRef.current; if (!c) return
    c.setViewportTransform([1, 0, 0, 1, 0, 0])
    setZoom(1)
  }

  async function handleManualSave() {
    const canvas = fabricRef.current; if (!canvas) return
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
    setSaveStatus('saving')
    const json = (canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data']) as Record<string, unknown>
    const r = await moodboardSpeichern(moodboardId, json)
    setSaveStatus(r.fehler ? 'error' : 'saved')
    if (!r.fehler) setTimeout(() => setSaveStatus('idle'), 1200)
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#1a2e1e] text-[#c8dbc9]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-[#445c49]/30 bg-[#2d3e31] shrink-0">
        <Link
          href={`/dashboard/projekte/${projektId}/raeume/${raumId}`}
          className="flex items-center gap-1.5 text-[#94c1a4] hover:text-white text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>
        <div className="h-5 w-px bg-[#445c49]/40" />
        <div>
          <div className="text-sm font-medium text-white leading-tight">{boardName}</div>
          <div className="text-[11px] text-[#94c1a4] leading-tight">{raumName}</div>
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs">
          {saveStatus === 'saving' && <span className="text-[#94c1a4]">Speichere…</span>}
          {saveStatus === 'saved'  && <span className="text-emerald-400">Gespeichert</span>}
          {saveStatus === 'error'  && <span className="text-red-400">Fehler beim Speichern</span>}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 h-12 border-b border-[#445c49]/30 bg-[#2d3e31] shrink-0">
        <ToolBtn active={tool === 'select'} onClick={() => setTool('select')} title="Auswahl (V)">
          <MousePointer2 className="w-4 h-4" />
        </ToolBtn>
        <div className="w-px h-6 bg-[#445c49]/40 mx-1" />
        <ToolBtn active={tool === 'text'}   onClick={() => setTool('text')}   title="Text (T)">
          <TypeIcon className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn active={tool === 'rect'}   onClick={() => setTool('rect')}   title="Rechteck (R)">
          <Square className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn active={tool === 'circle'} onClick={() => setTool('circle')} title="Kreis (C)">
          <CircleIcon className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => fileInputRef.current?.click()} title="Bild hochladen">
          <ImageIcon className="w-4 h-4" />
          {uploading && <span className="ml-1 text-[10px]">…</span>}
        </ToolBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="w-px h-6 bg-[#445c49]/40 mx-1" />
        <ToolBtn onClick={handleUndo} title="Rückgängig (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={handleRedo} title="Wiederholen (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => {
          const c = fabricRef.current; if (!c) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const active = c.getActiveObjects() as any[]
          if (active.length === 0) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          active.forEach((o: any) => c.remove(o))
          c.discardActiveObject()
          c.requestRenderAll()
          pushHistory()
          scheduleSave()
        }} title="Löschen (Entf)">
          <Trash2 className="w-4 h-4" />
        </ToolBtn>

        <div className="w-px h-6 bg-[#445c49]/40 mx-1" />
        <ToolBtn onClick={handleManualSave} title="Speichern (Ctrl+S)">
          <Save className="w-4 h-4" />
        </ToolBtn>

        {/* Rechts: Zoom */}
        <div className="ml-auto flex items-center gap-1">
          <ToolBtn onClick={handleZoomOut} title="Verkleinern">
            <span className="text-sm">−</span>
          </ToolBtn>
          <button
            onClick={handleZoomReset}
            className="text-xs text-[#94c1a4] hover:text-white px-2 min-w-[48px]"
          >
            {Math.round(zoom * 100)}%
          </button>
          <ToolBtn onClick={handleZoomIn} title="Vergrößern">
            <span className="text-sm">+</span>
          </ToolBtn>
          <ToolBtn onClick={handleZoomReset} title="Zurücksetzen">
            <Maximize2 className="w-4 h-4" />
          </ToolBtn>
        </div>
      </div>

      {/* Hauptbereich: Sidebar + Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Linke Sidebar */}
        <aside className="w-64 shrink-0 bg-[#2d3e31] border-r border-[#445c49]/30 flex flex-col">
          {/* Tab-Switcher */}
          <div className="flex border-b border-[#445c49]/30 shrink-0">
            <SidebarTab active={sidebarTab === 'produkte'} onClick={() => setSidebarTab('produkte')}>
              <Package className="w-3.5 h-3.5" /> Produkte
            </SidebarTab>
            <SidebarTab active={sidebarTab === 'farben'} onClick={() => setSidebarTab('farben')}>
              <Palette className="w-3.5 h-3.5" /> Farben
            </SidebarTab>
            <SidebarTab active={sidebarTab === 'upload'} onClick={() => setSidebarTab('upload')}>
              <Upload className="w-3.5 h-3.5" /> Bilder
            </SidebarTab>
          </div>

          {/* Tab-Inhalt */}
          <div className="flex-1 overflow-y-auto p-3">
            {sidebarTab === 'produkte' && (
              <div>
                <div className="relative mb-3">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94c1a4]" />
                  <input
                    type="text"
                    value={produktSuche}
                    onChange={(e) => setProduktSuche(e.target.value)}
                    placeholder="Produkte suchen…"
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-[#1a2e1e] border border-[#445c49]/40 rounded text-[#c8dbc9] placeholder-[#94c1a4]/60 focus:outline-none focus:border-[#94c1a4]"
                  />
                </div>
                {produkteGefiltert.length === 0 ? (
                  <p className="text-[11px] text-[#94c1a4] text-center py-6">
                    {produkte.length === 0
                      ? 'Keine Produkte vorhanden.'
                      : 'Keine Treffer.'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {produkteGefiltert.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduktAufBoard(p)}
                        className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-[#445c49]/40 transition-colors text-left group"
                      >
                        <div className="w-10 h-10 shrink-0 rounded bg-[#1a2e1e] border border-[#445c49]/40 overflow-hidden flex items-center justify-center">
                          {p.bild_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.bild_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-[#94c1a4]/60" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-white truncate">{p.name}</div>
                          {p.kategorie && (
                            <div className="text-[10px] text-[#94c1a4] truncate">{p.kategorie}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {sidebarTab === 'farben' && (
              <div>
                <p className="text-[11px] text-[#94c1a4] mb-2">Klicke einen Farbton, um einen Swatch aufs Board zu legen.</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {COLOR_PALETTE.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => addColorSwatch(hex)}
                      title={hex}
                      className="aspect-square rounded border border-black/10 hover:scale-110 hover:ring-2 hover:ring-white/40 transition-all"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <div className="mt-4">
                  <label className="block text-[11px] text-[#94c1a4] mb-1.5">Eigene Farbe</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      onChange={(e) => addColorSwatch(e.target.value)}
                      className="w-10 h-9 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[11px] text-[#94c1a4] self-center">Klick → Swatch hinzufügen</span>
                  </div>
                </div>
              </div>
            )}

            {sidebarTab === 'upload' && (
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 px-3 py-6 border-2 border-dashed border-[#445c49] rounded-lg text-[#94c1a4] hover:border-[#94c1a4] hover:text-white transition-colors"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-xs">Bild hochladen</span>
                  <span className="text-[10px] text-[#94c1a4]/70">JPG/PNG, max 50 MB</span>
                </button>
                {uploading && (
                  <p className="text-[11px] text-[#94c1a4] text-center mt-3">Lädt hoch…</p>
                )}
                <p className="text-[11px] text-[#94c1a4] mt-4 leading-relaxed">
                  Hochgeladene Bilder werden im privaten Storage abgelegt und automatisch aufs Board platziert.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas-Bereich */}
        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
          <canvas ref={canvasElRef} />

          {/* Status-Bar */}
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/40 text-[11px] text-[#c8dbc9] backdrop-blur-sm">
            Tool: <strong>{tool}</strong> · Pan: Space + Drag oder Mittlere Maustaste · Zoom: Mausrad
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helper-Komponente ────────────────────────────────────────────
function SidebarTab({
  children, onClick, active,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[11px] transition-colors
        ${active
          ? 'bg-[#1a2e1e] text-white border-b-2 border-[#94c1a4]'
          : 'text-[#94c1a4] hover:text-white hover:bg-[#3a5240]'}
      `}
    >
      {children}
    </button>
  )
}

function ToolBtn({
  children, onClick, active, title,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`
        flex items-center justify-center w-9 h-9 rounded transition-colors
        ${active ? 'bg-[#445c49] text-white' : 'text-[#c8dbc9] hover:bg-[#3a5240]'}
      `}
    >
      {children}
    </button>
  )
}
