import { createClient } from '@/lib/supabase/server'
import { alleVorlagenLaden } from '@/app/actions/onboarding'
import OnboardingTabelle from '@/components/OnboardingTabelle'
import type { OnboardingAnfrage } from '@/lib/supabase/types'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const [{ data }, vorlagen] = await Promise.all([
    supabase
      .from('onboarding_anfragen')
      .select('*')
      .order('created_at', { ascending: false }),
    alleVorlagenLaden(),
  ])

  const anfragen = (data ?? []) as OnboardingAnfrage[]

  return (
    <div className="flex-1 min-h-0 animate-fadeIn">
      {/* OnboardingTabelle bringt eigene h-full flex flex-col mit — Header bleibt fix,
          Liste scrollt intern. Kein overflow hier, sonst würde der Header doch mitscrollen. */}
      <OnboardingTabelle anfragen={anfragen} vorlagen={vorlagen} />
    </div>
  )
}
