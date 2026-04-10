'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { type LucideIcon, Sofa, Lightbulb, Shirt, Star, Leaf, Heart, Package, Building2, Layers, Building, Home, Hammer, Wrench, MessageSquare, Tag } from 'lucide-react'
import { addListItem, deleteListItem, type EinstellungActionState } from '@/app/actions/einstellungen'

// ── Icon-Mapping ───────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  // Produktkategorien
  'Möbel':        Sofa,
  'Leuchten':     Lightbulb,
  'Beleuchtung':  Lightbulb,
  'Textilien':    Shirt,
  'Accessoires':  Star,
  'Pflanzen':     Leaf,
  'Wellness':     Heart,
  'Sonstiges':    Package,
  // Raumtypen
  'Büro':         Building2,
  'Studio':       Layers,
  'Hotel':        Building,
  'Privat':       Home,
  'Wohnung':      Building2,
  // Projektarten
  'Neubau':       Hammer,
  'Renovation':   Wrench,
  'Konzept':      Lightbulb,
  'Beratung':     MessageSquare,
}

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Tag
}

// ── Submit Button ─────────────────────────────────────────────
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap">
      {pending ? '…' : label}
    </button>
  )
}

function Meldung({ state }: { state: EinstellungActionState | null }) {
  if (!state) return null
  return (
    <p className={`text-xs mt-1 ${state.fehler ? 'text-red-500' : 'text-emerald-600'}`}>
      {state.fehler ?? state.erfolg}
    </p>
  )
}

// ── Listen Abschnitt ──────────────────────────────────────────
function ListeAbschnitt({ titel, beschreibung, schluessel, items, platzhalter }: {
  titel: string; beschreibung?: string
  schluessel: string; items: string[]; platzhalter: string
}) {
  const boundAdd = addListItem.bind(null, schluessel)
  const [state, action] = useFormState(boundAdd, null)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-900">{titel}</h3>
        {beschreibung && <p className="text-xs text-gray-500 mt-0.5">{beschreibung}</p>}
      </div>

      <div className="px-6 py-5 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Einträge vorhanden.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {items.map((item) => {
              const Icon         = getIcon(item)
              const deleteAction = deleteListItem.bind(null, schluessel, item)
              return (
                <div key={item}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3.5 py-3 hover:border-gray-300 hover:shadow-sm transition-all">
                  {/* Icon Badge */}
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <Icon className="w-[18px] h-[18px] text-indigo-500" />
                  </div>
                  <span className="flex-1 text-sm text-gray-800 font-medium truncate">{item}</span>
                  <form action={deleteAction} className="shrink-0">
                    <button type="submit"
                      className="text-[11px] text-red-400/60 hover:text-red-500 transition-colors whitespace-nowrap"
                      onClick={(e) => { if (!confirm(`„${item}" löschen?`)) e.preventDefault() }}>
                      ✕
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        )}

        <form action={action} className="flex items-center gap-2 pt-1">
          <input name="name" placeholder={platzhalter} required
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <SubmitButton label="Hinzufügen" />
        </form>
        <Meldung state={state} />
      </div>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────
export default function KategorienVerwaltung({ kategorien, raumtypen, projektarten }: {
  kategorien: string[]; raumtypen: string[]; projektarten: string[]
}) {
  return (
    <div className="space-y-6">
      <ListeAbschnitt
        titel="Produktkategorien"
        beschreibung="Kategorien für Produkte in Räumen (z.B. Möbel, Leuchten)"
        schluessel="produktkategorien" items={kategorien} platzhalter="z.B. Spiegel"
      />
      <ListeAbschnitt
        titel="Raumtypen"
        beschreibung="Typen für neue Räume in Projekten"
        schluessel="raumtypen" items={raumtypen} platzhalter="z.B. Empfang"
      />
      <ListeAbschnitt
        titel="Projektarten"
        beschreibung="Klassifizierung von Projekten"
        schluessel="projektarten" items={projektarten} platzhalter="z.B. Umbau"
      />
    </div>
  )
}
