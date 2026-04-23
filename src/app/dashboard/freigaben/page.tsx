import { createClient } from '@/lib/supabase/server'
import FreigabenTabelle, { type FreigabeEintrag } from '@/components/FreigabenTabelle'

async function getAlleProdukte(): Promise<FreigabeEintrag[]> {
  const supabase = await createClient()

  // Seit Mig. 078: freigabe_status/kommentar direkt auf raum_produkte.
  // Eintrag = pro Raum-Instanz eines Produkts (kein globaler produktstatus-JOIN mehr).
  const { data } = await supabase
    .from('raum_produkte')
    .select(`
      id, menge, verkaufspreis_override, freigabe_status, freigabe_kommentar,
      produkte!inner(
        id, name, kategorie, einheit, verkaufspreis, bild_url, created_at, deleted_at
      ),
      raeume!inner(
        id, name, projekt_id,
        projekte ( id, name, kunden ( id, name ) )
      )
    `)
    .order('created_at', { referencedTable: 'produkte', ascending: false })

  type RpRow = {
    id: string
    menge: number
    verkaufspreis_override: number | null
    freigabe_status: string
    freigabe_kommentar: string | null
    produkte: {
      id: string; name: string; kategorie: string | null; einheit: string
      verkaufspreis: number | null; bild_url: string | null
      created_at: string; deleted_at: string | null
    }
    raeume: {
      id: string; name: string; projekt_id: string
      projekte: { id: string; name: string; kunden: { id: string; name: string } | null } | null
    }
  }

  return ((data ?? []) as unknown as RpRow[])
    .filter((row) => !row.produkte.deleted_at)
    .map((row): FreigabeEintrag => ({
      id:         row.id,                    // raum_produkte.id (für Reset-Action)
      name:       row.produkte.name,
      kategorie:  row.produkte.kategorie,
      menge:      row.menge,
      einheit:    row.produkte.einheit,
      verkaufspreis: row.verkaufspreis_override ?? row.produkte.verkaufspreis,
      bild_url:   row.produkte.bild_url,
      created_at: row.produkte.created_at,
      raeume:     row.raeume,
      produktstatus: {
        status:    row.freigabe_status,
        kommentar: row.freigabe_kommentar,
      },
    }))
}

export default async function FreigabenPage() {
  const eintraege = await getAlleProdukte()

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <FreigabenTabelle eintraege={eintraege} />
    </div>
  )
}
