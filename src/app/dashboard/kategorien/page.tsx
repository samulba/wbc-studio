import { getKategorien } from '@/app/actions/einstellungen'
import KategorienVerwaltung from '@/components/KategorienVerwaltung'

export default async function KategorienPage() {
  const [kategorien, raumtypen, projektarten] = await Promise.all([
    getKategorien('produktkategorie'),
    getKategorien('raumtyp'),
    getKategorien('projektart'),
  ])

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Kategorien</h1>
        <p className="text-sm text-gray-500 mt-0.5">Produktkategorien, Raumtypen und Projektarten verwalten</p>
      </div>
      <KategorienVerwaltung
        kategorien={kategorien}
        raumtypen={raumtypen}
        projektarten={projektarten}
      />
    </div>
  )
}
