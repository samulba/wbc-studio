import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavSidebar from '@/components/NavSidebar'
import MobileGuard from '@/components/MobileGuard'
import { RolleProvider } from '@/lib/RolleContext'
import { meineRolleAbrufen } from '@/app/actions/team'
import type { Rolle } from '@/lib/supabase/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ── Auth ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userName = (user.user_metadata?.full_name as string | undefined) || undefined

  // ── Sekundäre Daten – nie crashen ────────────────────────────
  let freigabenCount = 0
  let anfragenCount  = 0
  let rolle: Rolle   = 'viewer'

  try {
    const [freigabenRes, anfragenRes, rolleRes] = await Promise.allSettled([
      supabase
        .from('produktstatus')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ausstehend'),
      supabase
        .from('onboarding_anfragen')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'offen')
        .not('kunde_name', 'is', null),
      meineRolleAbrufen(),
    ])

    freigabenCount = freigabenRes.status === 'fulfilled' ? (freigabenRes.value.count ?? 0) : 0
    anfragenCount  = anfragenRes.status  === 'fulfilled' ? (anfragenRes.value.count  ?? 0) : 0
    rolle          = rolleRes.status     === 'fulfilled' ? rolleRes.value : 'viewer'
  } catch {
    // Fallback: defaults bleiben – Layout wird trotzdem gerendert
  }

  return (
    <MobileGuard>
      <RolleProvider rolle={rolle}>
      <div className="flex h-screen bg-gray-50">
        <NavSidebar
          userEmail={user.email ?? ''}
          userName={userName}
          userRolle={rolle}
          offeneFreigaben={freigabenCount}
          offeneAnfragen={anfragenCount}
        />
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
      </RolleProvider>
    </MobileGuard>
  )
}
