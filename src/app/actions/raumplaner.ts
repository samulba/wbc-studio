'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { MoebelSymbol } from '@/lib/supabase/types'

/** Canvas-State (Fabric.js JSON) in der DB speichern. */
export async function grundrissSpeichern(
  raumId: string,
  canvasJson: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('raeume')
    .update({ grundriss_json: JSON.parse(canvasJson) })
    .eq('id', raumId)
  if (error) return { fehler: 'Fehler beim Speichern.' }
  return {}
}

/** Canvas-State aus der DB laden. */
export async function grundrissLaden(
  raumId: string
): Promise<{ json: string | null; fehler?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('raeume')
    .select('grundriss_json')
    .eq('id', raumId)
    .single()
  if (error) return { json: null, fehler: 'Fehler beim Laden.' }
  return {
    json: data.grundriss_json ? JSON.stringify(data.grundriss_json) : null,
  }
}

/** Raummaße (Breite, Länge, Höhe) speichern. */
export async function raumMasseAktualisieren(
  raumId: string,
  breiteM: number | null,
  laengeM: number | null,
  hoeheM: number | null,
  projektId: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('raeume')
    .update({ breite_m: breiteM, laenge_m: laengeM, hoehe_m: hoeheM })
    .eq('id', raumId)
  if (error) return { fehler: 'Fehler beim Speichern der Maße.' }
  revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}/planer`)
  return {}
}

/** Alle verfügbaren Möbelsymbole laden (System + eigene Org). */
export async function getMoebelSymbole(): Promise<MoebelSymbol[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('moebel_symbole')
    .select('*')
    .order('ist_system', { ascending: false })
    .order('name')
  return (data ?? []) as MoebelSymbol[]
}
