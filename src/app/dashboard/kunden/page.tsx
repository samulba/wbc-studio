import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Kunde } from '@/lib/supabase/types'

async function getKunden(): Promise<Kunde[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('kunden')
    .select('*')
    .is('deleted_at', null)
    .order('name')
  return data ?? []
}

const avatarFarben = [
  'bg-indigo-100 text-indigo-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
]

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarFarbe(name: string) {
  const idx = name.charCodeAt(0) % avatarFarben.length
  return avatarFarben[idx]
}

export default async function KundenPage() {
  const kunden = await getKunden()

  return (
    <div className="px-6 py-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Kunden</h1>
          <p className="text-sm text-gray-500 mt-0.5">{kunden.length} Einträge</p>
        </div>
        <Link
          href="/dashboard/kunden/neu"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-medium rounded-lg transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Neuer Kunde
        </Link>
      </div>

      {kunden.length === 0 && (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-500 text-sm">Noch keine Kunden angelegt.</p>
          <Link href="/dashboard/kunden/neu" className="inline-block mt-3 text-sm text-indigo-600 underline underline-offset-2">
            Ersten Kunden anlegen
          </Link>
        </div>
      )}

      {kunden.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th}>Firmenname</th>
                <th className={th}>Ansprechpartner</th>
                <th className={th}>E-Mail</th>
                <th className={th}>Telefon</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {kunden.map((kunde, i) => (
                <tr
                  key={kunde.id}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors group ${
                    i < kunden.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarFarbe(kunde.name)}`}>
                        {initials(kunde.name)}
                      </div>
                      <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {kunde.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{kunde.ansprechpartner ?? '–'}</td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {kunde.email ? (
                      <a href={`mailto:${kunde.email}`} className="hover:text-indigo-600 transition-colors">
                        {kunde.email}
                      </a>
                    ) : '–'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{kunde.telefon ?? '–'}</td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/dashboard/kunden/${kunde.id}`}
                      className="text-xs text-gray-300 group-hover:text-indigo-600 transition-colors"
                    >
                      Öffnen →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const th = 'px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-widest'
