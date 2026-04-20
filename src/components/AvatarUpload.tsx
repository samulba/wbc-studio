'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Camera, Loader2, AlertCircle, Check } from 'lucide-react'
import { benutzerAvatarHochladen } from '@/app/actions/logo-upload'

const MAX_MB = 50
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'

function avatarKuerzel(nameOderMail: string) {
  if (!nameOderMail) return 'ME'
  // "Max Mustermann" → "MM", sonst Email "max@..." → "MA"
  const parts = nameOderMail.split(/[\s@.]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nameOderMail.slice(0, 2).toUpperCase()
}

export default function AvatarUpload({
  initialUrl,
  userLabel,
}: {
  initialUrl: string | null
  userLabel: string
}) {
  const [url, setUrl]       = useState<string | null>(initialUrl)
  const [fehler, setFehler] = useState<string | null>(null)
  const [erfolg, setErfolg] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function onPick(file: File) {
    setFehler(null)
    setErfolg(false)
    if (!file.type.startsWith('image/')) { setFehler('Nur Bilddateien sind erlaubt.'); return }
    if (file.size > MAX_MB * 1024 * 1024) { setFehler(`Datei ist zu groß (max. ${MAX_MB} MB).`); return }

    // Live-Preview
    const reader = new FileReader()
    reader.onload = (ev) => setUrl(ev.target?.result as string)
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('logo', file)
    startTransition(async () => {
      const res = await benutzerAvatarHochladen(null, formData)
      if (res?.fehler) {
        setFehler(res.fehler)
        setUrl(initialUrl)
      } else if (res?.url) {
        setUrl(res.url)
        setErfolg(true)
        setTimeout(() => setErfolg(false), 2200)
      }
    })
  }

  const kuerzel = avatarKuerzel(userLabel)

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={() => !isPending && inputRef.current?.click()}
        className="relative group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-wellbeing-green/40 rounded-full"
        title="Profilbild ändern"
      >
        {url ? (
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white bg-white shadow-md">
            <Image src={url} alt="Profilbild" width={64} height={64} className="w-full h-full object-cover" unoptimized />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-wellbeing-green flex items-center justify-center text-xl font-bold text-white shadow-md">
            {kuerzel}
          </div>
        )}

        {/* Hover-Overlay */}
        <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
          {isPending
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Camera className="w-5 h-5" />}
        </span>

        {/* Success-State */}
        {erfolg && (
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white shadow">
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </span>
        )}
      </button>

      <div className="min-w-0">
        <button
          type="button"
          onClick={() => !isPending && inputRef.current?.click()}
          disabled={isPending}
          className="text-sm font-medium text-wellbeing-green hover:text-wellbeing-green-dark transition-colors"
        >
          {isPending ? 'Wird hochgeladen…' : url ? 'Profilbild ändern' : 'Profilbild hochladen'}
        </button>
        <p className="text-[11px] text-gray-400 mt-0.5">
          PNG, JPG, WebP, SVG · max. {MAX_MB} MB
        </p>
        {fehler && (
          <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {fehler}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
        }}
      />
    </div>
  )
}
