'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type LucideIcon,
  ChevronDown, Check, X,
  Circle, Clock, CheckCircle2, XCircle, RotateCcw,
  Package, Sofa, Armchair, Lamp, Lightbulb, Bed, Table2, Vegan, Wind,
  Leaf, Flower, TreePine, Sunrise, Droplets, Mountain, Palmtree,
  Home, Building, Building2, Hotel, Layers, Grid, DoorOpen, Bath, BedDouble,
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles, Watch, Glasses,
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud, Thermometer, Wifi,
  Coffee, Utensils, Wine, ChefHat, Dumbbell, Waves,
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map, PenLine, Pencil,
  Box, Archive, Tag, MessageSquare, Truck, Globe, Zap, Shield,
  Handshake, Tags,
} from 'lucide-react'

// ── Icon-Registry für Kategorie-Icons ───────────────────────────

const ICONS: Record<string, LucideIcon> = {
  Sofa, Armchair, Lamp, Lightbulb, Bed, Table2, Vegan, Wind,
  Leaf, Flower, TreePine, Sunrise, Droplets, Mountain, Palmtree,
  Home, Building, Building2, Hotel, Layers, Grid, DoorOpen, Bath, BedDouble,
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles, Watch, Glasses,
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud, Thermometer, Wifi,
  Coffee, Utensils, Wine, ChefHat, Dumbbell, Waves,
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map, PenLine, Pencil,
  Package, Box, Archive, Tag, MessageSquare, Truck, Globe, Zap, Shield,
}

// ── Typen ───────────────────────────────────────────────────────

export type KategorieOption = { name: string; icon: string }
export type PartnerOption   = { id: string; name: string }

interface Props {
  kategorien: KategorieOption[]
  partner:    PartnerOption[]
}

const STATUS_OPTIONEN = [
  { wert: 'ausstehend',     label: 'Ausstehend',    Icon: Clock,       ton: 'text-gray-500' },
  { wert: 'freigegeben',    label: 'Freigegeben',   Icon: CheckCircle2,ton: 'text-emerald-600' },
  { wert: 'abgelehnt',      label: 'Abgelehnt',     Icon: XCircle,     ton: 'text-red-500' },
  { wert: 'ueberarbeitung', label: 'Überarbeitung', Icon: RotateCcw,   ton: 'text-amber-600' },
]

// ── Haupt-Komponente ────────────────────────────────────────────

export default function FilterBar({ kategorien, partner }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  const setParam = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value); else p.delete(key)
    router.replace(`${pathname}?${p.toString()}`, { scroll: false })
  }, [router, pathname, params])

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  const kategorie = params.get('kategorie')  ?? ''
  const status    = params.get('status')     ?? ''
  const partnerId = params.get('partner_id') ?? ''
  const hatFilter = kategorie || status || partnerId

  const aktiveKat = kategorien.find((k) => k.name === kategorie)
  const aktiveStat = STATUS_OPTIONEN.find((s) => s.wert === status)
  const aktivPart = partner.find((p) => p.id === partnerId)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Kategorie */}
      <FilterDropdown
        label="Kategorien"
        placeholder="Alle Kategorien"
        leadingIcon={Tags}
        activeIcon={aktiveKat ? (ICONS[aktiveKat.icon] ?? Package) : undefined}
        activeLabel={aktiveKat?.name}
        options={[
          { value: '', label: 'Alle Kategorien', Icon: Tags, muted: true },
          ...kategorien.map((k) => ({
            value: k.name, label: k.name, Icon: ICONS[k.icon] ?? Package,
          })),
        ]}
        value={kategorie}
        onChange={(v) => setParam('kategorie', v)}
      />

      {/* Status */}
      <FilterDropdown
        label="Status"
        placeholder="Alle Status"
        leadingIcon={Circle}
        activeIcon={aktiveStat?.Icon}
        activeLabel={aktiveStat?.label}
        activeTon={aktiveStat?.ton}
        options={[
          { value: '', label: 'Alle Status', Icon: Circle, muted: true },
          ...STATUS_OPTIONEN.map((s) => ({
            value: s.wert, label: s.label, Icon: s.Icon, ton: s.ton,
          })),
        ]}
        value={status}
        onChange={(v) => setParam('status', v)}
      />

      {/* Partner */}
      <FilterDropdown
        label="Partner"
        placeholder="Alle Partner"
        leadingIcon={Handshake}
        activeLabel={aktivPart?.name}
        options={[
          { value: '', label: 'Alle Partner', Icon: Handshake, muted: true },
          ...partner.map((p) => ({
            value: p.id, label: p.name, Icon: Handshake,
          })),
        ]}
        value={partnerId}
        onChange={(v) => setParam('partner_id', v)}
      />

      {hatFilter && (
        <button
          onClick={reset}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <X className="w-3 h-3" /> Zurücksetzen
        </button>
      )}
    </div>
  )
}

// ── Generisches elegantes Dropdown ──────────────────────────────

type Option = {
  value: string
  label: string
  Icon: LucideIcon
  ton?: string
  muted?: boolean
}

function FilterDropdown({
  label,
  placeholder,
  leadingIcon: LeadingIcon,
  activeIcon: ActiveIcon,
  activeLabel,
  activeTon,
  options,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  leadingIcon: LucideIcon
  activeIcon?: LucideIcon
  activeLabel?: string
  activeTon?: string
  options: Option[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onClick)
      document.addEventListener('keydown', onKey)
      return () => {
        document.removeEventListener('mousedown', onClick)
        document.removeEventListener('keydown', onKey)
      }
    }
  }, [open])

  const aktiv = !!value
  const IconToShow = ActiveIcon ?? LeadingIcon

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
          aktiv
            ? 'bg-wellbeing-cream/70 border-wellbeing-green/30 text-wellbeing-green-dark hover:bg-wellbeing-cream'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-wellbeing-green/30`}
      >
        <IconToShow className={`w-3.5 h-3.5 shrink-0 ${aktiv ? activeTon ?? 'text-wellbeing-green' : 'text-gray-400'}`} />
        <span className="truncate max-w-[140px]">
          {aktiv ? activeLabel ?? placeholder : placeholder}
        </span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-40 mt-1.5 min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-72 overflow-y-auto animate-fadeIn"
        >
          {options.map((o) => {
            const isActive = o.value === value
            const Ic = o.Icon
            return (
              <button
                key={o.value || 'all'}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? 'bg-wellbeing-cream/60 text-wellbeing-green-dark font-medium'
                    : o.muted
                      ? 'text-gray-500 hover:bg-gray-50'
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Ic className={`w-3.5 h-3.5 shrink-0 ${isActive ? o.ton ?? 'text-wellbeing-green' : o.ton ?? 'text-gray-400'}`} />
                <span className="flex-1 text-left truncate">{o.label}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-wellbeing-green shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
