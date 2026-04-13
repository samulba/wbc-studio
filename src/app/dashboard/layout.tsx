import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavSidebar from '@/components/NavSidebar'
import MobileGuard from '@/components/MobileGuard'
import { RolleProvider } from '@/lib/RolleContext'
import { meineRolleAbrufen } from '@/app/actions/team'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const userName = (user.user_metadata?.full_name as string | undefined) || undefined

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

  const freigabenCount = freigabenRes.status === 'fulfilled' ? (freigabenRes.value.count ?? 0) : 0
  const anfragenCount  = anfragenRes.status  === 'fulfilled' ? (anfragenRes.value.count  ?? 0) : 0
  const rolle          = rolleRes.status     === 'fulfilled' ? rolleRes.value : ('viewer' as import('@/lib/supabase/types').Rolle)

  return (
    <MobileGuard>
      <RolleProvider rolle={rolle}>
      <div className="flex h-screen bg-gray-50">
        <NavSidebar
          userEmail={user.email ?? ''}
          userName={userName}
          userRolle={rolle}
          offeneFreigaben={freigabenCount ?? 0}
          offeneAnfragen={anfragenCount ?? 0}
        />
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
      </RolleProvider>
    </MobileGuard>
  )
}
