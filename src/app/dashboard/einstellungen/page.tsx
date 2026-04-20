import { getEinstellungen } from '@/app/actions/einstellungen'
import { createClient } from '@/lib/supabase/server'
import { teamMitgliederAbrufen, meineRolleAbrufen } from '@/app/actions/team'
import { brandingAbrufen } from '@/app/actions/branding'
import { getVorlagen } from '@/app/actions/vertraege'
import EinstellungenTabs from '@/components/EinstellungenTabs'
import StickyPageHeader from '@/components/StickyPageHeader'

export default async function EinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const tab = tabParam ?? 'profil'

  const supabase = await createClient()
  const [{ data: { user } }, einstellungen, team, userRolle, branding, vorlagen] = await Promise.all([
    supabase.auth.getUser(),
    getEinstellungen(),
    teamMitgliederAbrufen(),
    meineRolleAbrufen(),
    brandingAbrufen(),
    getVorlagen(),
  ])

  // Avatar-URL aus team_mitglieder laden (Migration 061)
  let userAvatarUrl: string | null = null
  if (user) {
    const { data: me } = await supabase
      .from('team_mitglieder')
      .select('avatar_url')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    userAvatarUrl = (me?.avatar_url as string | null) ?? null
  }

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader title="Einstellungen" />
      <div className="px-6 py-6">
        <EinstellungenTabs
          aktuellerTab={tab}
          einstellungen={einstellungen}
          team={team}
          userRolle={userRolle}
          userEmail={user?.email ?? ''}
          userId={user?.id ?? ''}
          userAvatarUrl={userAvatarUrl}
          lastSignIn={user?.last_sign_in_at ?? null}
          branding={branding}
          vorlagen={vorlagen}
        />
      </div>
    </div>
  )
}
