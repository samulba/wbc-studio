'use client'

import { useState, useRef, useTransition, type ReactNode } from 'react'
import {
  Plus, Trash2, Edit2, Check, X, GripVertical,
  ChevronDown, ChevronUp, Star, Eye, Copy, MoreHorizontal,
  Type, AlignLeft, Mail, Phone, Globe, Hash, Calendar,
  Sliders, List, CheckSquare, ToggleLeft, FolderPlus,
} from 'lucide-react'
import {
  vorlageErstellen, vorlageSpeichern, vorlageLoeschen,
} from '@/app/actions/onboarding'
import type {
  OnboardingVorlage, OnboardingFrage, OnboardingFrageTyp, OnboardingSektion,
} from '@/lib/supabase/types'

// ── Typ-Gruppen ───────────────────────────────────────────────

type TypInfo = { wert: OnboardingFrageTyp; label: string; icon: ReactNode }
type FrageGruppe = { label: string; typen: TypInfo[] }

const FRAGE_GRUPPEN: FrageGruppe[] = [
  {
    label: 'Text',
    typen: [
      { wert: 'text',     label: 'Kurztext',    icon: <Type className="w-3.5 h-3.5" /> },
      { wert: 'textarea', label: 'Langer Text',  icon: <AlignLeft className="w-3.5 h-3.5" /> },
      { wert: 'email',    label: 'E-Mail',       icon: <Mail className="w-3.5 h-3.5" /> },
      { wert: 'telefon',  label: 'Telefon',      icon: <Phone className="w-3.5 h-3.5" /> },
      { wert: 'url',      label: 'Website',      icon: <Globe className="w-3.5 h-3.5" /> },
    ],
  },
  {
    label: 'Auswahl',
    typen: [
      { wert: 'auswahl',         label: 'Einfachauswahl',  icon: <List className="w-3.5 h-3.5" /> },
      { wert: 'mehrfachauswahl', label: 'Mehrfachauswahl', icon: <CheckSquare className="w-3.5 h-3.5" /> },
      { wert: 'ja_nein',         label: 'Ja / Nein',       icon: <ToggleLeft className="w-3.5 h-3.5" /> },
    ],
  },
  {
    label: 'Zahlen & Datum',
    typen: [
      { wert: 'zahl',      label: 'Zahl',        icon: <Hash className="w-3.5 h-3.5" /> },
      { wert: 'datum',     label: 'Datum',        icon: <Calendar className="w-3.5 h-3.5" /> },
      { wert: 'bewertung', label: 'Bewertung ★',  icon: <Star className="w-3.5 h-3.5" /> },
      { wert: 'skala',     label: 'Skala 1–10',   icon: <Sliders className="w-3.5 h-3.5" /> },
    ],
  },
]

function alleTypen(): TypInfo[] {
  return FRAGE_GRUPPEN.flatMap((g) => g.typen)
}
function typLabel(typ: OnboardingFrageTyp): string {
  return alleTypen().find((t) => t.wert === typ)?.label ?? typ
}
function typIcon(typ: OnboardingFrageTyp): ReactNode {
  return alleTypen().find((t) => t.wert === typ)?.icon ?? null
}

// ── Beispiel-Vorlagen ─────────────────────────────────────────

type BeispielVorlage = {
  emoji: string
  name: string
  beschreibung: string
  sektionen: OnboardingSektion[]
  fragen: Omit<OnboardingFrage, 'id'>[]
}

const BEISPIEL_VORLAGEN: BeispielVorlage[] = [
  {
    emoji: '🏢',
    name: 'Gewerbe-Kunde',
    beschreibung: 'Für gewerbliche Projekte & Büros',
    sektionen: [
      { id: 'bv-k', name: 'Kontaktdaten' },
      { id: 'bv-p', name: 'Projektdetails' },
    ],
    fragen: [
      { titel: 'Firmenname', typ: 'text', pflichtfeld: true, placeholder: 'Mustermann GmbH', sektion_id: 'bv-k' },
      { titel: 'Ansprechpartner', typ: 'text', pflichtfeld: true, placeholder: 'Max Mustermann', sektion_id: 'bv-k' },
      { titel: 'E-Mail-Adresse', typ: 'email', pflichtfeld: true, sektion_id: 'bv-k' },
      { titel: 'Telefon', typ: 'telefon', pflichtfeld: false, sektion_id: 'bv-k' },
      { titel: 'Projektart', typ: 'auswahl', pflichtfeld: true, optionen: ['Büro', 'Praxis', 'Hotel', 'Restaurant', 'Sonstiges'], sektion_id: 'bv-p' },
      { titel: 'Gewünschte Räume', typ: 'mehrfachauswahl', pflichtfeld: false, optionen: ['Empfang', 'Büros', 'Konferenzraum', 'Küche', 'Sanitär'], sektion_id: 'bv-p' },
      { titel: 'Budget', typ: 'auswahl', pflichtfeld: false, optionen: ['bis 50.000 €', '50.000 – 150.000 €', '150.000 – 300.000 €', 'über 300.000 €'], sektion_id: 'bv-p' },
      { titel: 'Fertigstellungstermin', typ: 'datum', pflichtfeld: false, sektion_id: 'bv-p' },
      { titel: 'Besondere Anforderungen', typ: 'textarea', pflichtfeld: false, placeholder: 'Barrierefreiheit, spezielle Materialien…', sektion_id: 'bv-p' },
    ],
  },
  {
    emoji: '🏠',
    name: 'Privat-Kunde',
    beschreibung: 'Für private Wohn- und Renovierungsprojekte',
    sektionen: [
      { id: 'bv-k', name: 'Kontaktdaten' },
      { id: 'bv-w', name: 'Wohnsituation & Wünsche' },
    ],
    fragen: [
      { titel: 'Vollständiger Name', typ: 'text', pflichtfeld: true, sektion_id: 'bv-k' },
      { titel: 'E-Mail-Adresse', typ: 'email', pflichtfeld: true, sektion_id: 'bv-k' },
      { titel: 'Telefonnummer', typ: 'telefon', pflichtfeld: false, sektion_id: 'bv-k' },
      { titel: 'Adresse des Projekts', typ: 'text', pflichtfeld: false, sektion_id: 'bv-w' },
      { titel: 'Zu gestaltende Räume', typ: 'mehrfachauswahl', pflichtfeld: false, optionen: ['Wohnzimmer', 'Schlafzimmer', 'Küche', 'Bad', 'Kinderzimmer', 'Arbeitszimmer'], sektion_id: 'bv-w' },
      { titel: 'Stil-Präferenzen', typ: 'mehrfachauswahl', pflichtfeld: false, optionen: ['Modern', 'Skandinavisch', 'Klassisch', 'Industriell', 'Natürlich/Biophilic'], sektion_id: 'bv-w' },
      { titel: 'Budget', typ: 'auswahl', pflichtfeld: false, optionen: ['bis 20.000 €', '20.000 – 50.000 €', '50.000 – 100.000 €', 'über 100.000 €'], sektion_id: 'bv-w' },
      { titel: 'Zeitrahmen', typ: 'auswahl', pflichtfeld: false, optionen: ['So bald wie möglich', 'In 3 Monaten', 'In 6 Monaten', 'In 1 Jahr+'], sektion_id: 'bv-w' },
      { titel: 'Besondere Wünsche', typ: 'textarea', pflichtfeld: false, sektion_id: 'bv-w' },
    ],
  },
  {
    emoji: '🏨',
    name: 'Hotel-Projekt',
    beschreibung: 'Für Hotels, Resorts und Gastgewerbe',
    sektionen: [
      { id: 'bv-h', name: 'Hotelinformationen' },
      { id: 'bv-a', name: 'Ausstattung & Umfang' },
    ],
    fragen: [
      { titel: 'Hotel-Name', typ: 'text', pflichtfeld: true, sektion_id: 'bv-h' },
      { titel: 'Sterne-Kategorie', typ: 'auswahl', pflichtfeld: false, optionen: ['3 Sterne', '4 Sterne', '5 Sterne', 'Boutique-Hotel'], sektion_id: 'bv-h' },
      { titel: 'Ansprechpartner', typ: 'text', pflichtfeld: true, sektion_id: 'bv-h' },
      { titel: 'E-Mail', typ: 'email', pflichtfeld: true, sektion_id: 'bv-h' },
      { titel: 'Telefon', typ: 'telefon', pflichtfeld: false, sektion_id: 'bv-h' },
      { titel: 'Zu gestaltende Bereiche', typ: 'mehrfachauswahl', pflichtfeld: false, optionen: ['Zimmer', 'Lobby', 'Restaurant', 'Bar', 'Spa', 'Konferenzräume', 'Außenbereich'], sektion_id: 'bv-a' },
      { titel: 'Anzahl Zimmer', typ: 'zahl', pflichtfeld: false, sektion_id: 'bv-a' },
      { titel: 'Budget', typ: 'auswahl', pflichtfeld: false, optionen: ['bis 500.000 €', '500k – 1 Mio €', '1 – 3 Mio €', 'über 3 Mio €'], sektion_id: 'bv-a' },
      { titel: 'Fertigstellungstermin', typ: 'datum', pflichtfeld: false, sektion_id: 'bv-a' },
      { titel: 'Besondere Anforderungen', typ: 'textarea', pflichtfeld: false, sektion_id: 'bv-a' },
    ],
  },
]

// ── Hilfsfunktionen ───────────────────────────────────────────

function neueFrage(sektionId?: string): OnboardingFrage {
  return {
    id: crypto.randomUUID(),
    titel: '',
    typ: 'text',
    pflichtfeld: false,
    placeholder: '',
    optionen: [],
    sektion_id: sektionId,
  }
}

function neueSektion(): OnboardingSektion {
  return { id: crypto.randomUUID(), name: 'Neue Sektion' }
}

// ── OptionenEditor (Tag-Input) ────────────────────────────────

function OptionenEditor({
  optionen,
  onChange,
}: {
  optionen: string[]
  onChange: (opts: string[]) => void
}) {
  const [inputWert, setInputWert] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addOption(wert: string) {
    const trimmed = wert.trim()
    if (trimmed && !optionen.includes(trimmed)) {
      onChange([...optionen, trimmed])
    }
    setInputWert('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addOption(inputWert)
    } else if (e.key === 'Backspace' && !inputWert && optionen.length > 0) {
      onChange(optionen.slice(0, -1))
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">Optionen</label>
      <div
        className="min-h-[42px] w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 flex flex-wrap gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-wellbeing-green/20 focus-within:border-wellbeing-green-light"
        onClick={() => inputRef.current?.focus()}
      >
        {optionen.map((opt, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-wellbeing-green/10 text-wellbeing-green-dark rounded-full"
          >
            {opt}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange(optionen.filter((_, j) => j !== i))
              }}
              className="text-wellbeing-green/60 hover:text-wellbeing-green-dark"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputWert}
          onChange={(e) => setInputWert(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputWert.trim()) addOption(inputWert) }}
          placeholder={optionen.length === 0 ? 'Option eingeben, Enter zum Hinzufügen…' : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder-gray-400 py-0.5"
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Enter oder Komma zum Hinzufügen · Backspace zum Entfernen</p>
    </div>
  )
}

// ── TypDropdown (Grouped) ─────────────────────────────────────

function TypDropdown({
  wert,
  onChange,
}: {
  wert: OnboardingFrageTyp
  onChange: (typ: OnboardingFrageTyp) => void
}) {
  const [offen, setOffen] = useState(false)
  const aktuellerTyp = alleTypen().find((t) => t.wert === wert)

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 hover:border-gray-300 transition-colors text-left"
      >
        <span className="text-gray-500">{aktuellerTyp?.icon}</span>
        <span className="flex-1 text-gray-700">{aktuellerTyp?.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>

      {offen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOffen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {FRAGE_GRUPPEN.map((gruppe) => (
              <div key={gruppe.label}>
                <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                  {gruppe.label}
                </p>
                {gruppe.typen.map((typ) => (
                  <button
                    key={typ.wert}
                    type="button"
                    onClick={() => { onChange(typ.wert); setOffen(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left ${
                      typ.wert === wert
                        ? 'bg-wellbeing-green/10 text-wellbeing-green-dark'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className={typ.wert === wert ? 'text-wellbeing-green' : 'text-gray-400'}>
                      {typ.icon}
                    </span>
                    {typ.label}
                    {typ.wert === wert && <Check className="w-3.5 h-3.5 ml-auto text-wellbeing-green" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── FrageEditor ───────────────────────────────────────────────

function FrageEditor({
  frage,
  index,
  total,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  frage: OnboardingFrage
  index: number
  total: number
  onChange: (f: OnboardingFrage) => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [menuOffen, setMenuOffen] = useState(false)
  const hatOptionen = frage.typ === 'auswahl' || frage.typ === 'mehrfachauswahl'
  const hatPlaceholder = ['text', 'textarea', 'email', 'telefon', 'url', 'zahl'].includes(frage.typ)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors leading-none"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors leading-none"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
        <span className="text-xs font-semibold text-gray-400 shrink-0">#{index + 1}</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-gray-400 shrink-0">{typIcon(frage.typ)}</span>
          <p className="text-sm text-gray-700 truncate">
            {frage.titel || <span className="italic text-gray-400">Neues Feld</span>}
          </p>
        </div>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0 hidden sm:inline">
          {typLabel(frage.typ)}
        </span>
        {frage.pflichtfeld && (
          <span className="text-[10px] text-red-400 font-semibold shrink-0">*</span>
        )}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {/* ⋮ Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOffen((o) => !o)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOffen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOffen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                <button
                  onClick={() => { onDuplicate(); setMenuOffen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplizieren
                </button>
                <button
                  onClick={() => { onDelete(); setMenuOffen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Löschen
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Frage / Label</label>
              <input
                type="text"
                placeholder="z. B. Wie heißen Sie?"
                value={frage.titel}
                onChange={(e) => onChange({ ...frage, titel: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
              />
            </div>
            <TypDropdown
              wert={frage.typ}
              onChange={(typ) => onChange({ ...frage, typ, optionen: [] })}
            />
          </div>

          {hatPlaceholder && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Platzhalter (optional)</label>
              <input
                type="text"
                placeholder="Beispiel-Eingabe…"
                value={frage.placeholder ?? ''}
                onChange={(e) => onChange({ ...frage, placeholder: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
              />
            </div>
          )}

          {hatOptionen && (
            <OptionenEditor
              optionen={frage.optionen ?? []}
              onChange={(opts) => onChange({ ...frage, optionen: opts })}
            />
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={frage.pflichtfeld}
              onChange={(e) => onChange({ ...frage, pflichtfeld: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-wellbeing-green focus:ring-wellbeing-green/20"
            />
            <span className="text-xs text-gray-600">Pflichtfeld</span>
          </label>
        </div>
      )}
    </div>
  )
}

// ── SektionsBlock ─────────────────────────────────────────────

function SektionsBlock({
  sektion,
  sektionsIndex,
  sektionsTotal,
  fragen,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddFrage,
  onUpdateFrage,
  onDeleteFrage,
  onDuplicateFrage,
  onMoveFrageUp,
  onMoveFrageDown,
}: {
  sektion: OnboardingSektion
  sektionsIndex: number
  sektionsTotal: number
  fragen: OnboardingFrage[]
  onRename: (name: string) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddFrage: () => void
  onUpdateFrage: (id: string, f: OnboardingFrage) => void
  onDeleteFrage: (id: string) => void
  onDuplicateFrage: (id: string) => void
  onMoveFrageUp: (id: string) => void
  onMoveFrageDown: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(sektion.name)

  function saveRename() {
    if (nameInput.trim()) onRename(nameInput.trim())
    setEditingName(false)
  }

  return (
    <div className="border-2 border-wellbeing-green/20 rounded-xl overflow-hidden bg-wellbeing-green/[0.03]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={sektionsIndex === 0}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors leading-none"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={sektionsIndex === sektionsTotal - 1}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors leading-none"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {editingName ? (
          <input
            autoFocus
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRename()
              if (e.key === 'Escape') setEditingName(false)
            }}
            className="flex-1 px-2 py-1 text-sm font-semibold border border-wellbeing-green/40 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
          />
        ) : (
          <button
            className="flex-1 text-left text-sm font-semibold text-wellbeing-green-dark"
            onDoubleClick={() => setEditingName(true)}
          >
            {sektion.name}
          </button>
        )}

        <span className="text-xs text-gray-400 shrink-0">{fragen.length} Fragen</span>
        <button
          onClick={() => setEditingName(true)}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-wellbeing-green transition-colors"
          title="Umbenennen"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="w-6 h-6 flex items-center justify-center text-red-300 hover:text-red-500 transition-colors"
          title="Sektion löschen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {fragen.map((f, i) => (
            <FrageEditor
              key={f.id}
              frage={f}
              index={i}
              total={fragen.length}
              onChange={(updated) => onUpdateFrage(f.id, updated)}
              onDelete={() => onDeleteFrage(f.id)}
              onDuplicate={() => onDuplicateFrage(f.id)}
              onMoveUp={() => onMoveFrageUp(f.id)}
              onMoveDown={() => onMoveFrageDown(f.id)}
            />
          ))}
          <button
            onClick={onAddFrage}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-wellbeing-green border border-dashed border-wellbeing-green/40 hover:border-wellbeing-green/70 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Frage in dieser Sektion
          </button>
        </div>
      )}
    </div>
  )
}

// ── VorschauModal ─────────────────────────────────────────────

function VorschauFeld({ frage }: { frage: OnboardingFrage }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-800">
        {frage.titel || <span className="italic text-gray-400">Unbenannte Frage</span>}
        {frage.pflichtfeld && <span className="text-red-500 ml-1">*</span>}
      </label>
      {(frage.typ === 'text' || frage.typ === 'email' || frage.typ === 'telefon' || frage.typ === 'url') && (
        <input
          type={frage.typ === 'email' ? 'email' : frage.typ === 'telefon' ? 'tel' : frage.typ === 'url' ? 'url' : 'text'}
          placeholder={frage.placeholder ?? (frage.typ === 'email' ? 'name@beispiel.de' : frage.typ === 'telefon' ? '+49 123 456789' : frage.typ === 'url' ? 'https://www.beispiel.de' : '')}
          disabled
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400"
        />
      )}
      {frage.typ === 'textarea' && (
        <textarea
          rows={3}
          placeholder={frage.placeholder}
          disabled
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 resize-none"
        />
      )}
      {frage.typ === 'zahl' && (
        <input type="number" placeholder={frage.placeholder ?? '0'} disabled className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400" />
      )}
      {frage.typ === 'datum' && (
        <input type="date" disabled className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400" />
      )}
      {frage.typ === 'auswahl' && (
        <div className="space-y-1.5">
          {(frage.optionen ?? []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-gray-600 cursor-default">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
              {opt}
            </label>
          ))}
          {!frage.optionen?.length && <p className="text-xs text-gray-400 italic">Noch keine Optionen definiert</p>}
        </div>
      )}
      {frage.typ === 'mehrfachauswahl' && (
        <div className="space-y-1.5">
          {(frage.optionen ?? []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-gray-600 cursor-default">
              <div className="w-4 h-4 rounded border border-gray-300 shrink-0" />
              {opt}
            </label>
          ))}
          {!frage.optionen?.length && <p className="text-xs text-gray-400 italic">Noch keine Optionen definiert</p>}
        </div>
      )}
      {frage.typ === 'ja_nein' && (
        <div className="flex gap-4">
          {['Ja', 'Nein'].map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-gray-600 cursor-default">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
              {opt}
            </label>
          ))}
        </div>
      )}
      {frage.typ === 'bewertung' && (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className="w-6 h-6 text-gray-300" />
          ))}
        </div>
      )}
      {frage.typ === 'skala' && (
        <div className="space-y-1">
          <input type="range" min="1" max="10" defaultValue="5" disabled className="w-full" />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1</span>
            <span>10</span>
          </div>
        </div>
      )}
    </div>
  )
}

function VorschauModal({
  name,
  sektionen,
  fragen,
  onClose,
}: {
  name: string
  sektionen: OnboardingSektion[]
  fragen: OnboardingFrage[]
  onClose: () => void
}) {
  const unsektioniert = fragen.filter((f) => !f.sektion_id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Vorschau: {name || 'Vorlage'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">So sieht der Kunde das Formular</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {unsektioniert.length > 0 && (
            <div className="space-y-5">
              {unsektioniert.map((f) => <VorschauFeld key={f.id} frage={f} />)}
            </div>
          )}
          {sektionen.map((s) => {
            const sf = fragen.filter((f) => f.sektion_id === s.id)
            if (!sf.length) return null
            return (
              <div key={s.id}>
                <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">{s.name}</h3>
                <div className="space-y-5">
                  {sf.map((f) => <VorschauFeld key={f.id} frage={f} />)}
                </div>
              </div>
            )
          })}
          {fragen.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-8">Noch keine Fragen vorhanden.</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}

// ── BeispielVorlagenPicker ────────────────────────────────────

function BeispielVorlagenPicker({
  onPick,
}: {
  onPick: (sektionen: OnboardingSektion[], fragen: OnboardingFrage[]) => void
}) {
  return (
    <div className="px-6 py-5 space-y-3">
      <div className="text-center mb-5">
        <p className="text-sm font-semibold text-gray-800">Aus Vorlage starten</p>
        <p className="text-xs text-gray-400 mt-1">Wähle eine Vorlage oder beginne mit einem leeren Formular</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {BEISPIEL_VORLAGEN.map((v) => (
          <button
            key={v.name}
            type="button"
            onClick={() => {
              const idMap: Record<string, string> = {}
              const newSektionen = v.sektionen.map((s) => {
                const newId = crypto.randomUUID()
                idMap[s.id] = newId
                return { id: newId, name: s.name }
              })
              const newFragen = v.fragen.map((f) => ({
                ...f,
                id: crypto.randomUUID(),
                sektion_id: f.sektion_id ? idMap[f.sektion_id] : undefined,
              }))
              onPick(newSektionen, newFragen)
            }}
            className="flex flex-col items-center gap-2 px-4 py-5 border border-gray-200 hover:border-wellbeing-green/50 hover:bg-wellbeing-green/5 rounded-xl transition-all text-center"
          >
            <span className="text-3xl">{v.emoji}</span>
            <span className="text-xs font-semibold text-gray-800">{v.name}</span>
            <span className="text-[10px] text-gray-400 leading-tight">{v.beschreibung}</span>
            <span className="text-[10px] text-wellbeing-green font-medium">{v.fragen.length} Fragen</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onPick([], [neueFrage()])}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-500 border border-dashed border-gray-200 hover:border-gray-300 rounded-xl transition-colors"
      >
        <Plus className="w-4 h-4" />
        Leere Vorlage starten
      </button>
    </div>
  )
}

// ── VorlageEditorModal ────────────────────────────────────────

function VorlageEditorModal({
  vorlage,
  onSave,
  onClose,
}: {
  vorlage: OnboardingVorlage | null
  onSave: (name: string, beschreibung: string, fragen: OnboardingFrage[], sektionen: OnboardingSektion[]) => void
  onClose: () => void
}) {
  const [schritt, setSchritt]         = useState<'picker' | 'editor'>(vorlage ? 'editor' : 'picker')
  const [name, setName]               = useState(vorlage?.name ?? '')
  const [beschreibung, setBeschreibung] = useState(vorlage?.beschreibung ?? '')
  const [fragen, setFragen]           = useState<OnboardingFrage[]>(vorlage?.fragen ?? [])
  const [sektionen, setSektionen]     = useState<OnboardingSektion[]>(vorlage?.sektionen ?? [])
  const [vorschauOffen, setVorschauOffen] = useState(false)
  const [isPending, startTransition]  = useTransition()

  // ── Fragen-Mutations ──────────────────────────────────────

  function frageHinzufuegen(sektionId?: string) {
    setFragen((fs) => [...fs, neueFrage(sektionId)])
  }

  function frageAktualisieren(id: string, updated: OnboardingFrage) {
    setFragen((fs) => fs.map((f) => (f.id === id ? updated : f)))
  }

  function frageLöschen(id: string) {
    setFragen((fs) => fs.filter((f) => f.id !== id))
  }

  function frageDuplizieren(id: string) {
    setFragen((fs) => {
      const idx = fs.findIndex((f) => f.id === id)
      if (idx === -1) return fs
      const kopie: OnboardingFrage = {
        ...fs[idx],
        id: crypto.randomUUID(),
        titel: fs[idx].titel + ' (Kopie)',
      }
      return [...fs.slice(0, idx + 1), kopie, ...fs.slice(idx + 1)]
    })
  }

  function frageVerschieben(id: string, richtung: -1 | 1, sektionId: string | undefined) {
    setFragen((fs) => {
      const gleicheGruppe = sektionId
        ? fs.filter((f) => f.sektion_id === sektionId)
        : fs.filter((f) => !f.sektion_id)
      const idx = gleicheGruppe.findIndex((f) => f.id === id)
      const zielIdx = idx + richtung
      if (zielIdx < 0 || zielIdx >= gleicheGruppe.length) return fs
      const nachbarId = gleicheGruppe[zielIdx].id
      const posA = fs.findIndex((f) => f.id === id)
      const posB = fs.findIndex((f) => f.id === nachbarId)
      const result = [...fs]
      ;[result[posA], result[posB]] = [result[posB], result[posA]]
      return result
    })
  }

  // ── Sektions-Mutations ────────────────────────────────────

  function sektionHinzufuegen() {
    setSektionen((ss) => [...ss, neueSektion()])
  }

  function sektionUmbenennen(id: string, neuName: string) {
    setSektionen((ss) => ss.map((s) => (s.id === id ? { ...s, name: neuName } : s)))
  }

  function sektionLöschen(id: string) {
    setSektionen((ss) => ss.filter((s) => s.id !== id))
    setFragen((fs) => fs.map((f) => (f.sektion_id === id ? { ...f, sektion_id: undefined } : f)))
  }

  function sektionVerschieben(id: string, richtung: -1 | 1) {
    setSektionen((ss) => {
      const idx = ss.findIndex((s) => s.id === id)
      const ziel = idx + richtung
      if (ziel < 0 || ziel >= ss.length) return ss
      const arr = [...ss]
      const [item] = arr.splice(idx, 1)
      arr.splice(ziel, 0, item)
      return arr
    })
  }

  // ── Save ──────────────────────────────────────────────────

  function handleSave() {
    if (!name.trim()) return
    startTransition(async () => {
      const cleanFragen = fragen.filter((f) => f.titel.trim())
      onSave(name.trim(), beschreibung.trim(), cleanFragen, sektionen)
    })
  }

  const allgemeineFragen = fragen.filter((f) => !f.sektion_id)

  // ── Picker ────────────────────────────────────────────────

  if (schritt === 'picker') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[88vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-semibold text-gray-900">Neue Vorlage erstellen</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            <BeispielVorlagenPicker
              onPick={(newSektionen, newFragen) => {
                setSektionen(newSektionen)
                setFragen(newFragen)
                setSchritt('editor')
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Editor ────────────────────────────────────────────────

  return (
    <>
      {vorschauOffen && (
        <VorschauModal
          name={name}
          sektionen={sektionen}
          fragen={fragen}
          onClose={() => setVorschauOffen(false)}
        />
      )}

      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[88vh]">

          {/* Fixed Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              {!vorlage && (
                <button
                  onClick={() => setSchritt('picker')}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Zurück zur Auswahl"
                >
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              )}
              <h2 className="text-base font-semibold text-gray-900">
                {vorlage ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVorschauOffen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Vorschau
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {/* Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="z. B. Gewerbe-Kunden"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung (optional)</label>
                <input
                  type="text"
                  placeholder="Kurze Beschreibung…"
                  value={beschreibung}
                  onChange={(e) => setBeschreibung(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
                />
              </div>
            </div>

            {/* Allgemeine Fragen */}
            {allgemeineFragen.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Allgemeine Fragen
                </label>
                {allgemeineFragen.map((f, i) => (
                  <FrageEditor
                    key={f.id}
                    frage={f}
                    index={i}
                    total={allgemeineFragen.length}
                    onChange={(updated) => frageAktualisieren(f.id, updated)}
                    onDelete={() => frageLöschen(f.id)}
                    onDuplicate={() => frageDuplizieren(f.id)}
                    onMoveUp={() => frageVerschieben(f.id, -1, undefined)}
                    onMoveDown={() => frageVerschieben(f.id, 1, undefined)}
                  />
                ))}
              </div>
            )}

            {/* Sektionen */}
            {sektionen.length > 0 && (
              <div className="space-y-3">
                {sektionen.map((s, si) => {
                  const sf = fragen.filter((f) => f.sektion_id === s.id)
                  return (
                    <SektionsBlock
                      key={s.id}
                      sektion={s}
                      sektionsIndex={si}
                      sektionsTotal={sektionen.length}
                      fragen={sf}
                      onRename={(n) => sektionUmbenennen(s.id, n)}
                      onDelete={() => sektionLöschen(s.id)}
                      onMoveUp={() => sektionVerschieben(s.id, -1)}
                      onMoveDown={() => sektionVerschieben(s.id, 1)}
                      onAddFrage={() => frageHinzufuegen(s.id)}
                      onUpdateFrage={frageAktualisieren}
                      onDeleteFrage={frageLöschen}
                      onDuplicateFrage={frageDuplizieren}
                      onMoveFrageUp={(id) => frageVerschieben(id, -1, s.id)}
                      onMoveFrageDown={(id) => frageVerschieben(id, 1, s.id)}
                    />
                  )
                })}
              </div>
            )}

            {/* Empty state */}
            {fragen.length === 0 && sektionen.length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-6 border border-dashed border-gray-200 rounded-xl">
                Noch keine Fragen. Füge eine Frage oder Sektion hinzu.
              </p>
            )}

            {/* Add buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => frageHinzufuegen()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-wellbeing-green border-2 border-dashed border-wellbeing-green/30 hover:border-wellbeing-green/60 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Frage hinzufügen
              </button>
              <button
                onClick={sektionHinzufuegen}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                Sektion hinzufügen
              </button>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
            <p className="text-xs text-gray-400">
              {fragen.length} Fragen · {sektionen.length} Sektionen
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={isPending || !name.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition-colors"
              >
                <Check className="w-4 h-4" />
                {isPending ? 'Wird gespeichert…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── VorlageKarte (Listenansicht) ──────────────────────────────

function VorlageKarte({
  vorlage,
  onEdit,
  onDelete,
}: {
  vorlage: OnboardingVorlage
  onEdit: () => void
  onDelete: () => void
}) {
  const sektionenAnzahl = vorlage.sektionen?.length ?? 0
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-900">{vorlage.name}</p>
          {vorlage.ist_standard && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-wellbeing-green bg-wellbeing-green/10 px-1.5 py-0.5 rounded-full">
              <Star className="w-2.5 h-2.5" />
              Standard
            </span>
          )}
        </div>
        {vorlage.beschreibung && (
          <p className="text-xs text-gray-400 mb-1">{vorlage.beschreibung}</p>
        )}
        <p className="text-xs text-gray-400">
          {vorlage.fragen.length} Fragen
          {sektionenAnzahl > 0 && ` · ${sektionenAnzahl} Sektionen`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Bearbeiten
        </button>
        {!vorlage.ist_standard && (
          <button
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center text-red-300 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────

export default function VorlagenVerwaltung({ vorlagen: initVorlagen }: { vorlagen: OnboardingVorlage[] }) {
  const [vorlagen, setVorlagen]           = useState<OnboardingVorlage[]>(initVorlagen)
  const [editorVorlage, setEditorVorlage] = useState<OnboardingVorlage | null | undefined>(undefined)
  const [isPending, startTransition]      = useTransition()

  function handleSave(
    name: string,
    beschreibung: string,
    fragen: OnboardingFrage[],
    sektionen: OnboardingSektion[]
  ) {
    startTransition(async () => {
      if (editorVorlage === null) {
        const neu = await vorlageErstellen(name, beschreibung, fragen, sektionen)
        setVorlagen((vs) => [
          ...vs.filter((v) => v.ist_standard),
          neu,
          ...vs.filter((v) => !v.ist_standard && v.id !== neu.id),
        ])
      } else if (editorVorlage) {
        await vorlageSpeichern(editorVorlage.id, name, beschreibung, fragen, sektionen)
        setVorlagen((vs) =>
          vs.map((v) =>
            v.id === editorVorlage.id
              ? { ...v, name, beschreibung: beschreibung || null, fragen, sektionen }
              : v
          )
        )
      }
      setEditorVorlage(undefined)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await vorlageLoeschen(id)
      setVorlagen((vs) => vs.filter((v) => v.id !== id))
    })
  }

  return (
    <>
      {editorVorlage !== undefined && (
        <VorlageEditorModal
          vorlage={editorVorlage}
          onSave={handleSave}
          onClose={() => setEditorVorlage(undefined)}
        />
      )}

      <div className="space-y-3">
        {vorlagen.map((v) => (
          <VorlageKarte
            key={v.id}
            vorlage={v}
            onEdit={() => setEditorVorlage(v)}
            onDelete={() => handleDelete(v.id)}
          />
        ))}

        <button
          onClick={() => setEditorVorlage(null)}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-wellbeing-green border-2 border-dashed border-wellbeing-green/30 hover:border-wellbeing-green/60 rounded-xl transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Neue Vorlage erstellen
        </button>
      </div>
    </>
  )
}
