'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function demoAnfrageSenden(data: {
  name: string
  email: string
  telefon?: string
  nachricht?: string
}) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('demo_anfragen').insert({
    name: data.name,
    email: data.email,
    telefon: data.telefon || null,
    nachricht: data.nachricht || null,
  })
  if (error) throw new Error(error.message)
}
