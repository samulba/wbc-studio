import Link from 'next/link'
import KundeFormular from '@/components/KundeFormular'
import { kundeAnlegen } from '@/app/actions/kunden'

export default function NeuerKundePage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/kunden"
          className="text-xs text-wbc-grau/40 hover:text-wbc-gruen transition-colors mb-3 inline-block"
        >
          ← Zurück zu Kunden
        </Link>
        <h1 className="font-heading text-3xl font-light text-wbc-gruen tracking-wide">Neuer Kunde</h1>
      </div>

      <div className="bg-white border border-[#ede4d9] rounded-xl p-6">
        <KundeFormular
          aktion={kundeAnlegen}
          abbrechen="/dashboard/kunden"
        />
      </div>
    </div>
  )
}
