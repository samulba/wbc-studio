import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { einladungAnnehmen } from '@/app/actions/team'
import { ROLLEN_CONFIG } from '@/lib/permissions'
import type { Rolle } from '@/lib/supabase/types'

interface Props {
  params: { token: string }
}

export default async function EinladungPage({ params }: Props) {
  const admin = createAdminClient()

  // Einladung laden
  const { data: einladung } = await admin
    .from('team_mitglieder')
    .select('email, rolle, status')
    .eq('einladungs_token', params.token)
    .maybeSingle()

  if (!einladung || einladung.status !== 'ausstehend') {
    return <StatusSeite typ="ungueltig" />
  }

  // Ist der User bereits eingeloggt?
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const rollenInfo = ROLLEN_CONFIG[einladung.rolle as Rolle]

  if (!user) {
    // Nicht eingeloggt → Login-Link
    return (
      <Layout>
        <EinladungsCard email={einladung.email} rollenInfo={rollenInfo}>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Melde dich zuerst an oder erstelle ein Konto, um die Einladung anzunehmen.
          </p>
          <a
            href={`/login?next=/einladung/${params.token}`}
            className="block w-full text-center py-3 px-6 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-xl transition-colors"
          >
            Anmelden / Registrieren
          </a>
        </EinladungsCard>
      </Layout>
    )
  }

  // Eingeloggt → Einladung annehmen (inline Server Action)
  async function annehmenAction() {
    'use server'
    await einladungAnnehmen(params.token)
  }

  return (
    <Layout>
      <EinladungsCard email={einladung.email} rollenInfo={rollenInfo}>
        <p className="text-sm text-gray-500 mb-2 leading-relaxed">
          Angemeldet als <span className="font-medium text-gray-700">{user.email}</span>.
        </p>
        <p className="text-xs text-gray-400 mb-5">
          Mit Klick auf &quot;Annehmen&quot; wirst du dem Team hinzugefügt.
        </p>
        <form action={annehmenAction}>
          <button
            type="submit"
            className="w-full py-3 px-6 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-xl transition-colors"
          >
            Einladung annehmen
          </button>
        </form>
      </EinladungsCard>
    </Layout>
  )
}

// ── Sub-Komponenten ───────────────────────────────────────────

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6ede2] flex items-center justify-center px-4">
      {children}
    </div>
  )
}

function EinladungsCard({
  email, rollenInfo, children,
}: {
  email: string
  rollenInfo: { label: string; beschreibung: string; badgeCls: string }
  children: React.ReactNode
}) {
  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
          <rect x="0" y="0" width="10" height="10" rx="2" fill="#445c49" opacity="0.30" />
          <rect x="4" y="4" width="10" height="10" rx="2" fill="#445c49" opacity="0.55" />
          <rect x="8" y="8" width="10" height="10" rx="2" fill="#445c49" />
        </svg>
        <span className="font-syne text-base font-bold text-[#2d3e31] tracking-tight">Wellbeing Spaces</span>
      </div>

      <div className="bg-white rounded-2xl shadow-lg px-8 py-8">
        {/* Team-Icon */}
        <div className="w-14 h-14 rounded-2xl bg-wellbeing-green/10 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-wellbeing-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
          </svg>
        </div>

        <h1 className="text-lg font-semibold text-gray-900 text-center mb-1">Team-Einladung</h1>
        <p className="text-sm text-gray-500 text-center mb-5 leading-relaxed">
          Du wurdest eingeladen, dem Team von<br />
          <span className="font-medium text-gray-700">Wellbeing Spaces</span> beizutreten.
        </p>

        {/* Rollen-Badge */}
        <div className="flex items-center justify-center mb-5">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${rollenInfo.badgeCls}`}>
            {rollenInfo.label} · {rollenInfo.beschreibung}
          </span>
        </div>

        {/* E-Mail Zeile */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-5 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Eingeladen als</p>
          <p className="text-sm font-medium text-gray-800">{email}</p>
        </div>

        {children}
      </div>
    </div>
  )
}

function StatusSeite({ typ }: { typ: 'ungueltig' | 'abgelaufen' }) {
  return (
    <div className="min-h-screen bg-[#f6ede2] flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
            <rect x="0" y="0" width="10" height="10" rx="2" fill="#445c49" opacity="0.30" />
            <rect x="4" y="4" width="10" height="10" rx="2" fill="#445c49" opacity="0.55" />
            <rect x="8" y="8" width="10" height="10" rx="2" fill="#445c49" />
          </svg>
          <span className="font-syne text-base font-bold text-[#2d3e31] tracking-tight">Wellbeing Spaces</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {typ === 'ungueltig' ? 'Link nicht mehr gültig' : 'Einladung abgelaufen'}
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Dieser Einladungslink wurde bereits verwendet oder ist ungültig.
          Bitte wende dich an den Absender.
        </p>
      </div>
    </div>
  )
}
