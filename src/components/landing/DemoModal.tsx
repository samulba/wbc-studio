'use client'

import { useState } from 'react'
import { X, Loader2, CheckCircle, Mail, User, Phone, MessageSquare } from 'lucide-react'
import { demoAnfrageSenden } from '@/app/actions/demo'

interface Props {
  open: boolean
  onClose: () => void
}

export default function DemoModal({ open, onClose }: Props) {
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [telefon,   setTelefon]   = useState('')
  const [nachricht, setNachricht] = useState('')
  const [laedt,     setLaedt]     = useState(false)
  const [erfolg,    setErfolg]    = useState(false)
  const [fehler,    setFehler]    = useState<string | null>(null)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFehler(null)
    setLaedt(true)
    try {
      await demoAnfrageSenden({ name, email, telefon, nachricht })
      setErfolg(true)
    } catch {
      setFehler('Etwas ist schiefgelaufen. Bitte versuche es erneut.')
    } finally {
      setLaedt(false)
    }
  }

  function handleClose() {
    onClose()
    // Reset after animation
    setTimeout(() => {
      setErfolg(false)
      setFehler(null)
      setName('')
      setEmail('')
      setTelefon('')
      setNachricht('')
    }, 300)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />

      {/* Panel */}
      <div className="relative w-full max-w-[480px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-gray-100">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.18em] mb-2">
            Demo anfragen
          </p>
          <h2 className="font-syne font-bold text-[22px] text-[#445c49] leading-tight">
            Lerne Wellbeing Spaces kennen
          </h2>
          <p className="text-[14px] text-gray-400 mt-1.5 leading-snug">
            Wir melden uns innerhalb von 24 Stunden für ein persönliches Demo.
          </p>
        </div>

        {/* Body */}
        <div className="px-7 py-6">
          {erfolg ? (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <p className="font-syne font-bold text-[18px] text-gray-800 mb-1.5">Anfrage erhalten!</p>
                <p className="text-[14px] text-gray-400 leading-relaxed">
                  Wir melden uns bald bei <strong className="text-gray-600">{email}</strong>.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-2 px-6 py-2.5 bg-[#445c49] text-white text-[14px] font-semibold rounded-xl hover:bg-[#2d3e31] transition-colors"
              >
                Schließen
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Max Mustermann"
                    className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#445c49]/20 focus:border-[#445c49] transition-all"
                  />
                </div>
              </div>

              {/* E-Mail */}
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  E-Mail *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@studio.de"
                    className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#445c49]/20 focus:border-[#445c49] transition-all"
                  />
                </div>
              </div>

              {/* Telefon */}
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Telefon
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                  <input
                    type="tel"
                    value={telefon}
                    onChange={(e) => setTelefon(e.target.value)}
                    placeholder="+49 176 12345678"
                    className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#445c49]/20 focus:border-[#445c49] transition-all"
                  />
                </div>
              </div>

              {/* Nachricht */}
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Nachricht
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-300 pointer-events-none" />
                  <textarea
                    rows={3}
                    value={nachricht}
                    onChange={(e) => setNachricht(e.target.value)}
                    placeholder="Kurze Beschreibung deines Studios oder deiner Fragen…"
                    className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#445c49]/20 focus:border-[#445c49] transition-all resize-none"
                  />
                </div>
              </div>

              {fehler && (
                <p className="text-[13px] text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  {fehler}
                </p>
              )}

              <button
                type="submit"
                disabled={laedt}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#445c49] hover:bg-[#2d3e31] disabled:opacity-60 text-white text-[14px] font-semibold rounded-xl transition-all shadow-sm hover:shadow-md mt-1"
              >
                {laedt ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Wird gesendet…</>
                ) : (
                  'Demo anfragen →'
                )}
              </button>

              <p className="text-[11px] text-gray-300 text-center">
                Kein Spam. Keine Weitergabe an Dritte. DSGVO-konform.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
