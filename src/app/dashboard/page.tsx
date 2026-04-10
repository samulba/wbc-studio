import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, FolderOpen, Handshake, ArrowRight, Plus, Clock } from 'lucide-react'
import type { ProjektMitKunde } from '@/lib/supabase/types'

async function getDashboardData() {
  const supabase = await createClient()
  const [
    { count: kundenCount },
    { count: projekteCount },
    { count: partnerCount },
    { data: offeneProjekte },
  ] = await Promise.all([
    supabase.from('kunden').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('projekte').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('partner').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase
      .from('projekte')
      .select('*, kunden(id, name)')
      .is('deleted_at', null)
      .in('status', ['offen', 'in_bearbeitung'])
      .order('created_at', { ascending: false })
      .limit(8),
  ])
  return {
    kundenCount: kundenCount ?? 0,
    projekteCount: projekteCount ?? 0,
    partnerCount: partnerCount ?? 0,
    offeneProjekte: (offeneProjekte ?? []) as ProjektMitKunde[],
  }
}

const statusFarbe: Record<string, string> = {
  offen:          'bg-gray-100 text-gray-600',
  in_bearbeitung: 'bg-blue-50 text-blue-700',
  freigegeben:    'bg-emerald-50 text-emerald-700',
  abgeschlossen:  'bg-gray-100 text-gray-500',
}
const statusLabel: Record<string, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  freigegeben: 'Freigegeben',
  abgeschlossen: 'Abgeschlossen',
}

export default async function DashboardPage() {
  const { kundenCount, projekteCount, partnerCount, offeneProjekte } = await getDashboardData()

  const stats = [
    {
      label: 'Kunden',
      wert: kundenCount,
      href: '/dashboard/kunden',
      icon: Users,
      farbe: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Projekte',
      wert: projekteCount,
      href: '/dashboard/projekte',
      icon: FolderOpen,
      farbe: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Partner',
      wert: partnerCount,
      href: '/dashboard/partner',
      icon: Handshake,
      farbe: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ]

  const schnellzugriff = [
    { label: 'Neuer Kunde', href: '/dashboard/kunden/neu' },
    { label: 'Neues Projekt', href: '/dashboard/projekte/neu' },
    { label: 'Neuer Partner', href: '/dashboard/partner/neu' },
  ]

  return (
    <div className="px-6 py-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Übersicht</h1>
        <p className="text-sm text-gray-500 mt-0.5">Willkommen im Studio.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Linke Spalte */}
        <div className="xl:col-span-2 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((s) => {
              const Icon = s.icon
              return (
                <Link
                  key={s.label}
                  href={s.href}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 group flex items-center gap-4"
                >
                  <div className={`${s.bg} p-3 rounded-xl shrink-0`}>
                    <Icon className={`w-5 h-5 ${s.farbe}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-3xl font-bold text-gray-900 leading-none mb-1">
                      {s.wert}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all duration-200 ml-auto shrink-0" />
                </Link>
              )
            })}
          </div>

          {/* Schnellzugriff */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Schnellzugriff</h2>
            <div className="flex flex-wrap gap-2">
              {schnellzugriff.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 text-xs px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

        </div>

        {/* Rechte Spalte: offene Projekte */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Aktive Projekte</h2>
            </div>
            <Link href="/dashboard/projekte" className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors">
              Alle →
            </Link>
          </div>

          {offeneProjekte.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <p className="text-sm text-gray-400">Keine aktiven Projekte.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 flex-1">
              {offeneProjekte.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/projekte/${p.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {p.kunden?.name ?? '–'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-3 ${statusFarbe[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[p.status] ?? p.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
