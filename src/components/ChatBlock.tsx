'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import {
  MessageCircle, Send, Paperclip, Mic, X, FileText, Download,
  Play, Pause, Image as ImageIcon, Square,
} from 'lucide-react'
import type { ClientNachricht } from '@/lib/supabase/types'
import {
  getNachrichtenFuerProjekt,
  adminNachrichtenAlsGelesen,
} from '@/app/actions/nachrichten'
import {
  teamNachrichtSenden,
  chatAnhangSignedUrl,
} from '@/app/actions/portal'

interface Props {
  projektId:          string
  kundeName:          string
  initialNachrichten: ClientNachricht[]
  pollingMs?:         number
  compact?:           boolean
}

/** Admin-Chat mit WhatsApp-Feel: Text + Bilder + Dateien + Sprachmemos. */
export default function ChatBlock({
  projektId,
  kundeName,
  initialNachrichten,
  pollingMs = 10_000,
  compact = false,
}: Props) {
  const [nachrichten, setNachrichten] = useState<ClientNachricht[]>(initialNachrichten)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const isFetchingRef = useRef(false)

  useEffect(() => {
    adminNachrichtenAlsGelesen(projektId).catch(() => {})
  }, [projektId])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    async function refetch() {
      if (isFetchingRef.current) return
      isFetchingRef.current = true
      try {
        const fresh = await getNachrichtenFuerProjekt(projektId)
        setNachrichten(fresh)
      } catch { /* ignore */ }
      finally { isFetchingRef.current = false }
    }
    function start() {
      if (interval !== null) return
      interval = setInterval(refetch, pollingMs)
    }
    function stop() {
      if (interval === null) return
      clearInterval(interval); interval = null
    }
    function onVis() {
      if (document.hidden) stop()
      else { refetch(); start() }
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [projektId, pollingMs])

  // Auto-Scroll: nur wenn User ohnehin nah am unteren Rand ist — sonst unterbrechen wir sein Scrollen.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const abstand = el.scrollHeight - el.scrollTop - el.clientHeight
    if (abstand < 150) el.scrollTop = el.scrollHeight
  }, [nachrichten.length])

  async function handleSend(formData: FormData): Promise<{ fehler?: string }> {
    const res = await teamNachrichtSenden(projektId, formData)
    if (!res.fehler) {
      if (!isFetchingRef.current) {
        isFetchingRef.current = true
        try {
          const fresh = await getNachrichtenFuerProjekt(projektId)
          setNachrichten(fresh)
        } catch { /* ignore */ }
        finally { isFetchingRef.current = false }
      }
    }
    return res
  }

  const boxHeight = compact ? 'h-80' : 'h-[520px]'

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-wellbeing-cream flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-wellbeing-green" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">Chat mit {kundeName}</p>
          <p className="text-[11px] text-gray-400">Aktualisiert alle {pollingMs / 1000}s</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`flex-1 ${boxHeight} overflow-y-auto px-4 py-4 space-y-2 bg-gray-50/40`}
      >
        {nachrichten.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <MessageCircle className="w-8 h-8 text-gray-200" />
            <p className="text-sm text-gray-400">Noch keine Nachrichten</p>
            <p className="text-xs text-gray-300 max-w-xs">
              Schreib {kundeName} die erste Nachricht — sie erscheint sofort im Kundenportal.
            </p>
          </div>
        ) : (
          nachrichten.map((n) => (
            <NachrichtBubble key={n.id} n={n} istEigene={!n.von_kunde} getUrl={chatAnhangSignedUrl} />
          ))
        )}
      </div>

      <ChatInputBar onSend={handleSend} kontextLabel={`an ${kundeName}`} />
    </div>
  )
}

// ── Nachricht-Bubble ────────────────────────────────────────────

function NachrichtBubble({
  n, istEigene, getUrl, brandColor,
}: {
  n: ClientNachricht
  /** true = eigene Nachricht (rechts, farbig). false = Gegenüber (links, grau). */
  istEigene: boolean
  getUrl: (id: string) => Promise<{ url?: string; fehler?: string }>
  brandColor?: string
}) {
  const eigenStyle = brandColor
    ? { background: brandColor, color: 'var(--brand-button-text, #fff)' }
    : undefined
  const bubbleClass = istEigene
    ? (brandColor ? 'text-white rounded-br-md' : 'bg-wellbeing-green text-white rounded-br-md')
    : 'bg-white border border-gray-200 text-gray-700 rounded-bl-md'

  const zeit = new Date(n.created_at).toLocaleTimeString('de-DE', {
    hour: '2-digit', minute: '2-digit',
  })
  const tempoId = n.id.startsWith('temp-')

  return (
    <div className={`flex ${istEigene ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl overflow-hidden ${bubbleClass} ${tempoId ? 'opacity-70' : ''}`}
        style={istEigene ? eigenStyle : undefined}
      >
        <AnhangRenderer n={n} getUrl={getUrl} istEigene={istEigene} />
        {n.nachricht && (
          <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words px-3.5 pt-2">
            {n.nachricht}
          </p>
        )}
        <p className={`text-[10px] px-3.5 pb-1.5 pt-1 text-right ${istEigene ? 'text-white/70' : 'text-gray-400'}`}>
          {zeit}
          {tempoId && ' · sende…'}
        </p>
      </div>
    </div>
  )
}

// ── Anhang-Renderer (Bild / Audio / Datei) ──────────────────────

function AnhangRenderer({
  n, getUrl, istEigene,
}: {
  n: ClientNachricht
  getUrl: (id: string) => Promise<{ url?: string; fehler?: string }>
  istEigene: boolean
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [bildAuf, setBildAuf] = useState(false)

  function refetch() {
    if (!n.anhang_pfad || n.id.startsWith('temp-')) return
    setFehler(null)
    getUrl(n.id).then((r) => {
      if (r.url) setUrl(r.url + (r.url.includes('?') ? '&' : '?') + '_=' + Date.now())
      else setFehler(r.fehler ?? 'Fehler beim Laden.')
    })
  }

  useEffect(() => {
    if (!n.anhang_pfad || n.id.startsWith('temp-')) return
    let aktiv = true
    getUrl(n.id).then((r) => {
      if (!aktiv) return
      if (r.url) setUrl(r.url)
      else setFehler(r.fehler ?? 'Fehler beim Laden.')
    })
    return () => { aktiv = false }
  }, [n.id, n.anhang_pfad, getUrl])

  if (!n.anhang_pfad) return null
  if (n.id.startsWith('temp-')) {
    return (
      <div className={`px-3.5 pt-2.5 ${istEigene ? 'text-white/80' : 'text-gray-500'}`}>
        <p className="text-xs italic">Anhang wird hochgeladen…</p>
      </div>
    )
  }
  if (fehler) {
    return <p className={`px-3.5 pt-2 text-xs ${istEigene ? 'text-white/70' : 'text-red-500'}`}>Anhang konnte nicht geladen werden.</p>
  }
  if (!url) {
    return <div className="px-3.5 pt-2.5 pb-1 text-xs opacity-60">Lade Anhang…</div>
  }

  // Bild
  if (n.typ === 'bild') {
    return (
      <>
        <button
          type="button"
          onClick={() => setBildAuf(true)}
          className="block w-full max-w-[280px] group"
        >
          <Image
            src={url}
            alt={n.anhang_name ?? 'Bild'}
            width={280}
            height={210}
            className="w-full h-auto max-h-[320px] object-cover"
            unoptimized
            onError={refetch}
          />
        </button>
        {bildAuf && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setBildAuf(false)}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setBildAuf(false) }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
            <Image
              src={url}
              alt={n.anhang_name ?? 'Bild'}
              width={1600}
              height={1200}
              className="max-h-[90vh] w-auto max-w-[92vw] object-contain rounded-lg"
              unoptimized
            />
          </div>
        )}
      </>
    )
  }

  // Audio
  if (n.typ === 'audio') {
    return <AudioPlayer url={url} dauer={n.anhang_dauer} istEigene={istEigene} onError={refetch} />
  }

  // Datei
  const groesseKb = n.anhang_groesse ? Math.round(n.anhang_groesse / 1024) : null
  return (
    <a
      href={url}
      download={n.anhang_name ?? undefined}
      className={`flex items-center gap-2.5 m-1.5 px-3 py-2.5 rounded-xl transition-colors ${
        istEigene
          ? 'bg-white/10 hover:bg-white/20 text-white'
          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        istEigene ? 'bg-white/20' : 'bg-white border border-gray-200'
      }`}>
        <FileText className={`w-4 h-4 ${istEigene ? 'text-white' : 'text-gray-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{n.anhang_name ?? 'Datei'}</p>
        {groesseKb !== null && (
          <p className={`text-[10px] ${istEigene ? 'text-white/70' : 'text-gray-400'}`}>
            {groesseKb} KB
          </p>
        )}
      </div>
      <Download className="w-4 h-4 shrink-0 opacity-70" />
    </a>
  )
}

// ── Audio-Player ────────────────────────────────────────────────

function AudioPlayer({ url, dauer, istEigene, onError }: { url: string; dauer: number | null; istEigene: boolean; onError?: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [spielt, setSpielt] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [fallbackDauer, setFallbackDauer] = useState<number | null>(null)

  const effektiveDauer = dauer ?? fallbackDauer ?? 0

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => {
      setCurrentTime(el.currentTime)
      if (el.duration && isFinite(el.duration)) {
        setProgress((el.currentTime / el.duration) * 100)
      }
    }
    const onEnd = () => { setSpielt(false); setProgress(0); setCurrentTime(0) }
    const onPauseEvt = () => setSpielt(false)
    const onPlayEvt = () => setSpielt(true)
    const onMeta = () => {
      if (el.duration && isFinite(el.duration)) setFallbackDauer(el.duration)
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('ended', onEnd)
    el.addEventListener('pause', onPauseEvt)
    el.addEventListener('play', onPlayEvt)
    el.addEventListener('loadedmetadata', onMeta)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('ended', onEnd)
      el.removeEventListener('pause', onPauseEvt)
      el.removeEventListener('play', onPlayEvt)
      el.removeEventListener('loadedmetadata', onMeta)
    }
  }, [])

  function toggle() {
    const el = audioRef.current
    if (!el) return
    if (spielt) { el.pause() }
    else {
      // Alle anderen Audios pausieren — WhatsApp-Verhalten.
      if (typeof document !== 'undefined') {
        document.querySelectorAll('audio').forEach((a) => {
          if (a !== el && !a.paused) a.pause()
        })
      }
      el.play().catch(() => { onError?.() })
    }
  }

  function fmt(s: number) {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60), sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2.5 m-1.5 px-2.5 py-2 min-w-[200px]">
      <audio ref={audioRef} src={url} preload="metadata" onError={() => onError?.()} />
      <button
        type="button"
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${
          istEigene
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-wellbeing-green hover:bg-wellbeing-green-dark text-white'
        }`}
        aria-label={spielt ? 'Pause' : 'Abspielen'}
      >
        {spielt ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className={`h-1 rounded-full overflow-hidden ${istEigene ? 'bg-white/20' : 'bg-gray-200'}`}>
          <div
            className={`h-full ${istEigene ? 'bg-white' : 'bg-wellbeing-green'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-[10px] ${istEigene ? 'text-white/80' : 'text-gray-500'}`}>
          {fmt(currentTime)} / {fmt(effektiveDauer)}
        </span>
      </div>
    </div>
  )
}

// ── ChatInputBar (Text + Attachment + Voice) ────────────────────

export function ChatInputBar({
  onSend,
  kontextLabel,
  brandColor,
}: {
  onSend: (formData: FormData) => Promise<{ fehler?: string; erfolg?: string }>
  kontextLabel?: string
  brandColor?: string
}) {
  const [text, setText]     = useState('')
  const [datei, setDatei]   = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [isSending, startSend] = useTransition()
  const dateiRef = useRef<HTMLInputElement | null>(null)
  const bildRef = useRef<HTMLInputElement | null>(null)
  const btnGruppeRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [plusAuf, setPlusAuf] = useState(false)

  // Audio-Recorder
  const [recording, setRecording] = useState(false)
  const [recDauer, setRecDauer] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const recIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const shouldSendRef = useRef(false)

  // Feature-Detection Mikrofon (alte iOS / http / fehlende API).
  const [micSupported, setMicSupported] = useState(true)
  useEffect(() => {
    const ok = typeof navigator !== 'undefined'
      && typeof window !== 'undefined'
      && typeof window.MediaRecorder !== 'undefined'
      && !!navigator.mediaDevices?.getUserMedia
    setMicSupported(ok)
  }, [])

  const MAX_BYTES = 50 * 1024 * 1024
  function waehleDatei(f: File | null) {
    if (!f) { setDatei(null); return }
    if (f.size > MAX_BYTES) {
      setFehler(`Datei zu groß (max. 50 MB). Gewählt: ${Math.round(f.size / 1024 / 1024)} MB.`)
      return
    }
    setFehler(null)
    setDatei(f)
  }

  useEffect(() => {
    if (!datei) { setPreview(null); return }
    if (datei.type.startsWith('image/')) {
      const u = URL.createObjectURL(datei)
      setPreview(u)
      return () => URL.revokeObjectURL(u)
    }
    setPreview(null)
  }, [datei])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!btnGruppeRef.current?.contains(e.target as Node)) setPlusAuf(false)
    }
    if (plusAuf) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [plusAuf])

  async function startRecording() {
    setFehler(null)
    if (!micSupported) {
      setFehler('Sprachmemos werden auf diesem Gerät nicht unterstützt.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      shouldSendRef.current = false
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      // ein EINZIGES onstop — entscheidet per shouldSendRef, was zu tun ist (kein Race bei Stop vs. Cancel).
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        if (recIntervalRef.current) { clearInterval(recIntervalRef.current); recIntervalRef.current = null }
        const dauer = (Date.now() - startTimeRef.current) / 1000
        setRecording(false)
        setRecDauer(0)
        if (!shouldSendRef.current) return
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (blob.size === 0) return
        const file = new File([blob], `sprachmemo-${Date.now()}.webm`, { type: blob.type })
        sendenMit(file, dauer)
      }
      mr.start()
      mediaRef.current = mr
      startTimeRef.current = Date.now()
      setRecording(true)
      setRecDauer(0)
      recIntervalRef.current = setInterval(() => {
        setRecDauer((Date.now() - startTimeRef.current) / 1000)
      }, 200)
    } catch {
      setFehler('Kein Mikrofon-Zugriff. Bitte Berechtigung erteilen.')
    }
  }

  function stopRecording(senden: boolean) {
    const mr = mediaRef.current
    if (!mr || mr.state === 'inactive') return
    shouldSendRef.current = senden
    mr.stop()
  }

  function cancelRecording() {
    stopRecording(false)
  }

  function sendenMit(audioDatei: File, dauer: number) {
    if (isSending) return
    const fd = new FormData()
    fd.append('nachricht', '')
    fd.append('datei', audioDatei)
    fd.append('audio_dauer', String(Math.round(dauer * 100) / 100))
    startSend(async () => {
      const res = await onSend(fd)
      if (res.fehler) setFehler(res.fehler)
    })
  }

  function handleSenden() {
    if (isSending) return
    setFehler(null)
    const trimmed = text.trim()
    if (!trimmed && !datei) return

    const fd = new FormData()
    fd.append('nachricht', trimmed)
    if (datei) fd.append('datei', datei)
    startSend(async () => {
      const res = await onSend(fd)
      if (res.fehler) {
        setFehler(res.fehler); return
      }
      setText('')
      setDatei(null)
      if (dateiRef.current) dateiRef.current.value = ''
      if (bildRef.current)  bildRef.current.value = ''
      // Focus zurück auf Textarea, damit man sofort weiter schreiben kann.
      requestAnimationFrame(() => textareaRef.current?.focus())
    })
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isSending) return
      handleSenden()
    }
  }

  const brandBg = brandColor ?? undefined
  const sendeBtnClass = brandColor
    ? ''
    : 'bg-wellbeing-green hover:bg-wellbeing-green-dark'

  // Recording-Overlay-Modus
  if (recording) {
    return (
      <div className="border-t border-gray-100 p-3 bg-white shrink-0">
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">Sprachmemo aufnehmen</p>
            <p className="text-xs text-red-500 font-mono">
              {Math.floor(recDauer / 60)}:{Math.floor(recDauer % 60).toString().padStart(2, '0')}
            </p>
          </div>
          <button
            type="button"
            onClick={cancelRecording}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500"
            aria-label="Abbrechen"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => stopRecording(true)}
            className="h-9 px-4 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5 fill-current" /> Senden
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-100 p-3 bg-white shrink-0">
      {fehler && <p className="text-xs text-red-500 mb-2">{fehler}</p>}

      {datei && (
        <div className="mb-2 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2">
          {preview ? (
            <Image src={preview} alt="Vorschau" width={48} height={48} className="w-12 h-12 rounded-lg object-cover" unoptimized />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{datei.name}</p>
            <p className="text-[10px] text-gray-400">{Math.round(datei.size / 1024)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => { setDatei(null); if (dateiRef.current) dateiRef.current.value = ''; if (bildRef.current) bildRef.current.value = '' }}
            className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center"
            aria-label="Anhang entfernen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div ref={btnGruppeRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setPlusAuf((v) => !v)}
            disabled={isSending}
            className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors disabled:opacity-40"
            aria-label="Anhängen"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          {plusAuf && (
            <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 flex flex-col gap-0.5 min-w-[160px] z-10">
              <button
                type="button"
                onClick={() => { bildRef.current?.click(); setPlusAuf(false) }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg text-left"
              >
                <ImageIcon className="w-4 h-4 text-gray-500" /> Foto / Bild
              </button>
              <button
                type="button"
                onClick={() => { dateiRef.current?.click(); setPlusAuf(false) }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg text-left"
              >
                <FileText className="w-4 h-4 text-gray-500" /> Datei
              </button>
            </div>
          )}
        </div>

        <input
          ref={bildRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            waehleDatei(f)
            // Reset Value, damit die gleiche Datei erneut ausgewählt werden kann.
            e.target.value = ''
          }}
        />
        <input
          ref={dateiRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            waehleDatei(f)
            e.target.value = ''
          }}
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={kontextLabel ? `Nachricht ${kontextLabel}…` : 'Nachricht schreiben…'}
          rows={1}
          disabled={isSending}
          className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-3 py-2.5 max-h-32 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light disabled:opacity-60"
        />

        {text.trim() || datei ? (
          <button
            type="button"
            onClick={handleSenden}
            disabled={isSending}
            style={brandBg ? { background: brandBg } : {}}
            className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl text-white transition-colors disabled:opacity-40 ${sendeBtnClass}`}
            aria-label="Senden"
          >
            <Send className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={isSending || !micSupported}
            title={micSupported ? 'Sprachmemo aufnehmen' : 'Sprachmemos auf diesem Gerät nicht unterstützt'}
            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-40"
            aria-label="Sprachmemo aufnehmen"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5">
        Enter = senden · Shift+Enter = Zeilenumbruch
      </p>
    </div>
  )
}

// ── Bubble-Renderer für externe Verwendung (Portal) ─────────────

export { NachrichtBubble, AnhangRenderer }
