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

  const [{ count: freigabenCount }, { count: anfragenCount }, rolle] = await Promise.all([
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
