import Link from 'next/link'
import PartnerFormular from '@/components/PartnerFormular'
import { partnerAnlegen } from '@/app/actions/partner'

export default function NeuerPartnerPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard/partner" className="text-xs text-wbc-grau/40 hover:text-wbc-gruen transition-colors mb-3 inline-block">
          ← Zurück zu Partner
        </Link>
        <h1 className="font-heading text-3xl font-light text-wbc-gruen tracking-wide">Neuer Partner</h1>
      </div>
      <div className="bg-white border border-[#ede4d9] rounded-xl p-6">
        <PartnerFormular aktion={partnerAnlegen} abbrechen="/dashboard/partner" />
      </div>
    </div>
  )
}
