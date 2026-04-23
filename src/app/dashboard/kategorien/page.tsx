import { getKategorien } from '@/app/actions/einstellungen'
import KategorienVerwaltung from '@/components/KategorienVerwaltung'
import StickyPageHeader from '@/components/StickyPageHeader'
import StandardDatenBanner from '@/components/StandardDatenBanner'

export default async function KategorienPage() {
  const [kategorien, raumtypen, projektarten] = await Promise.all([
    getKategorien('produktkategorie'),
    getKategorien('raumtyp'),
    getKategorien('projektart'),
  ])

  const istLeer = kategorien.length === 0 && raumtypen.length === 0 && projektarten.length === 0

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader
        title="Kategorien"
        subtitle="Produktkategorien, Raumtypen und Projektarten verwalten"
      />
      <div className="px-6 py-6">
        <StandardDatenBanner istLeer={istLeer} />
        <KategorienVerwaltung
          kategorien={kategorien}
          raumtypen={raumtypen}
          projektarten={projektarten}
        />
      </div>
    </div>
  )
}
