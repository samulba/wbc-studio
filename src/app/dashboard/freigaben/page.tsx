import { createClient } from '@/lib/supabase/server'
import FreigabenTabelle, { type FreigabeEintrag } from '@/components/FreigabenTabelle'

async function getAlleProdukte(): Promise<FreigabeEintrag[]> {
  const supabase = await createClient()

  // Lädt via raum_produkte – erfasst sowohl direkt angelegte als auch
  // Library-Produkte (ProduktHinzufuegenModal), die nur via raum_produkte verknüpft sind.
  const { data } = await supabase
    .from('raum_produkte')
    .select(`
      menge,
      verkaufspreis_override,
      produkte!inner(
        id, name, kategorie, einheit, verkaufspreis, bild_url, created_at, deleted_at,
        produktstatus ( status, kommentar )
      ),
      raeume!inner(
        id, name, projekt_id,
        projekte ( id, name, kunden ( id, name ) )
      )
    `)
    .order('created_at', { referencedTable: 'produkte', ascending: false })

  type RpRow = {
    menge: number
    verkaufspreis_override: number | null
    produkte: {
      id: string; name: string; kategorie: string | null; einheit: string
      verkaufspreis: number | null; bild_url: string | null
      created_at: string; deleted_at: string | null
      produktstatus: { status: string; kommentar: string | null } | { status: string; kommentar: string | null }[] | null
    }
    raeume: {
      id: string; name: string; projekt_id: string
      projekte: { id: string; name: string; kunden: { id: string; name: string } | null } | null
    }
  }

  return ((data ?? []) as unknown as RpRow[])
    .filter((row) => !row.produkte.deleted_at)
    .map((row): FreigabeEintrag => {
      type PS = { status: string; kommentar: string | null } | null
      const psRaw = row.produkte.produktstatus as PS | PS[]
      const ps = Array.isArray(psRaw) ? psRaw[0] ?? null : psRaw
      return {
        id:         row.produkte.id,
        name:       row.produkte.name,
        kategorie:  row.produkte.kategorie,
        menge:      row.menge,
        einheit:    row.produkte.einheit,
        // Preis-Override aus raum_produkte hat Vorrang
        verkaufspreis: row.verkaufspreis_override ?? row.produkte.verkaufspreis,
        bild_url:   row.produkte.bild_url,
        created_at: row.produkte.created_at,
        raeume:     row.raeume,
        produktstatus: ps,
      }
    })
}

export default async function FreigabenPage() {
  const eintraege = await getAlleProdukte()

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <FreigabenTabelle eintraege={eintraege} />
    </div>
  )
}
