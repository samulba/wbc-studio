import { getKategorien } from '@/app/actions/einstellungen'
import KategorienVerwaltung from '@/components/KategorienVerwaltung'
import StickyPageHeader from '@/components/StickyPageHeader'

export default async function KategorienPage() {
  const [kategorien, raumtypen, projektarten] = await Promise.all([
    getKategorien('produktkategorie'),
    getKategorien('raumtyp'),
    getKategorien('projektart'),
  ])

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader
        title="Kategorien"
        subtitle="Produktkategorien, Raumtypen und Projektarten verwalten"
      />
      <div className="px-6 py-6">
        <KategorienVerwaltung
          kategorien={kategorien}
          raumtypen={raumtypen}
          projektarten={projektarten}
        />
      </div>
    </div>
  )
}
