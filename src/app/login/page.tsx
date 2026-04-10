'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setFehler(null)
    setLaedt(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwort,
    })

    if (error) {
      setFehler('E-Mail oder Passwort ungültig.')
      setLaedt(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-wbc-creme flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-12 text-center">
          <h1 className="font-heading text-5xl font-light tracking-[0.25em] text-wbc-gruen uppercase">
            WBC
          </h1>
          <p className="mt-1 text-xs tracking-[0.35em] text-wbc-grau uppercase font-light">
            Studio
          </p>
          <div className="mt-5 h-px w-12 bg-wbc-sand mx-auto" />
        </div>

        {/* Login-Formular */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-wbc-grau uppercase tracking-widest mb-1.5"
            >
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-white border border-[#e8ddd3] rounded-lg text-wbc-gruen placeholder:text-[#c5b8ab] focus:outline-none focus:ring-2 focus:ring-wbc-gruen/20 focus:border-wbc-gruen/40 transition"
              placeholder="name@wellbeing-concepts.de"
            />
          </div>

          <div>
            <label
              htmlFor="passwort"
              className="block text-xs font-medium text-wbc-grau uppercase tracking-widest mb-1.5"
            >
              Passwort
            </label>
            <input
              id="passwort"
              type="password"
              autoComplete="current-password"
              required
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-white border border-[#e8ddd3] rounded-lg text-wbc-gruen placeholder:text-[#c5b8ab] focus:outline-none focus:ring-2 focus:ring-wbc-gruen/20 focus:border-wbc-gruen/40 transition"
              placeholder="••••••••"
            />
          </div>

          {fehler && (
            <p className="text-xs text-wbc-terra bg-wbc-terra/5 border border-wbc-terra/20 rounded-lg px-3 py-2.5">
              {fehler}
            </p>
          )}

          <button
            type="submit"
            disabled={laedt}
            className="w-full py-3 px-4 bg-wbc-gruen hover:bg-wbc-gruen-dark disabled:opacity-50 text-white text-xs font-medium tracking-[0.15em] uppercase rounded-lg transition-colors"
          >
            {laedt ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
