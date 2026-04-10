import { createClient } from '@/lib/supabase/server'

async function getUebersicht() {
  const supabase = await createClient()
  const [
    { count: kundenCount },
    { count: projekteCount },
    { count: partnerCount },
  ] = await Promise.all([
    supabase.from('kunden').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('projekte').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('partner').select('*', { count: 'exact', head: true }).is('deleted_at', null),
  ])
  return { kundenCount, projekteCount, partnerCount }
}

export default async function DashboardPage() {
  const { kundenCount, projekteCount, partnerCount } = await getUebersicht()

  const kacheln = [
    { label: 'Kunden', wert: kundenCount ?? 0, href: '/dashboard/kunden' },
    { label: 'Projekte', wert: projekteCount ?? 0, href: '/dashboard/projekte' },
    { label: 'Partner', wert: partnerCount ?? 0, href: '/dashboard/partner' },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-light text-wbc-gruen tracking-wide">Übersicht</h1>
        <p className="text-sm text-wbc-grau/60 mt-1 tracking-wide">Wellbeing-Concepts Studio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {kacheln.map((k) => (
          <a
            key={k.label}
            href={k.href}
            className="bg-white border border-[#ede4d9] rounded-xl p-6 hover:border-wbc-sand/60 hover:shadow-sm transition-all group"
          >
            <p className="text-xs font-medium text-wbc-grau/60 uppercase tracking-widest mb-4">
              {k.label}
            </p>
            <p className="font-heading text-4xl font-light text-wbc-gruen group-hover:text-wbc-gruen/70 transition-colors">
              {k.wert}
            </p>
          </a>
        ))}
      </div>

      <div className="bg-white border border-[#ede4d9] rounded-xl p-6">
        <h2 className="text-xs font-medium text-wbc-grau/60 uppercase tracking-widest mb-4">Schnellzugriff</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '+ Neuer Kunde', href: '/dashboard/kunden/neu' },
            { label: '+ Neues Projekt', href: '/dashboard/projekte/neu' },
            { label: '+ Neuer Partner', href: '/dashboard/partner/neu' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs px-4 py-2.5 bg-wbc-gruen text-white rounded-lg hover:bg-wbc-gruen-dark transition-colors tracking-wide"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
