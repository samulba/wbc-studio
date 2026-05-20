'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2, Download, FileText, Image as ImageIcon, AlertTriangle, Save, Briefcase, User, ExternalLink, Eye } from 'lucide-react'
import { useModal } from '@/lib/hooks/useModal'
import DynamischesFeld, { FormFeld, inputCls } from '@/components/onboarding/DynamischesFeld'
import FilePreviewModal from '@/components/FilePreviewModal'
import {
  anfrageBearbeiten,
  onboardingDateiEntfernenAdmin,
  kundeUndProjektAusOnboarding,
} from '@/app/actions/onboarding-erweitert'
import { getAnfrageDateien, onboardingDateiSignierteUrl } from '@/app/actions/onboarding-uploads'
import { extrahiereStammdatenAusAntworten } from '@/lib/onboarding-stammdaten'
import { kannInlineVorschau } from '@/lib/file-mime'
import type { OnboardingAnfrage, OnboardingVorlage, OnboardingDatei } from '@/lib/supabase/types'

interface Props {
  anfrage: OnboardingAnfrage
  vorlage: OnboardingVorlage | null
  onClose: () => void
}

type Tab = 'stamm' | 'antworten' | 'dateien'

export default function AnfrageBearbeitenModal({ anfrage, vorlage, onClose }: Props) {
  const ref = useModal(true, onClose)
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('stamm')
  const [isPending, startTransition] = useTransition()
  const [fehler, setFehler] = useState<string | null>(null)

  // Antworten-State — Initial aus JSONB
  const [antworten, setAntworten] = useState<Record<string, unknown>>(
    (anfrage.antworten as Record<string, unknown>) ?? {},
  )

  // Stammdaten-State — Initial aus den Top-Level-Spalten der Anfrage,
  // und falls leer, automatisch aus den Antworten extrahiert (z.B. wenn
  // die Vorlage andere Frage-IDs als kontakt_* benutzt — passiert bei
  // 'nk_*', 'pv_*', 'projekt_*'-Vorlagen). Bestehende Werte werden NIE
  // überschrieben.
  const [stamm, setStamm] = useState(() => {
    const ausAntworten = extrahiereStammdatenAusAntworten(
      vorlage,
      (anfrage.antworten as Record<string, unknown>) ?? null,
    )
    return {
      kunde_name:        anfrage.kunde_name        ?? ausAntworten.kunde_name        ?? '',
      kunde_email:       anfrage.kunde_email       ?? ausAntworten.kunde_email       ?? '',
      kunde_telefon:     anfrage.kunde_telefon     ?? ausAntworten.kunde_telefon     ?? '',
      projekt_name:      anfrage.projekt_name      ?? ausAntworten.projekt_name      ?? '',
      projekt_adresse:   anfrage.projekt_adresse   ?? ausAntworten.projekt_adresse   ?? '',
      raumtypen:         (anfrage.raumtypen ?? ausAntworten.raumtypen ?? []) as string[],
      budget_min:        anfrage.budget_min        ?? ausAntworten.budget_min        ?? null,
      budget_max:        anfrage.budget_max        ?? ausAntworten.budget_max        ?? null,
      zeitrahmen:        anfrage.zeitrahmen        ?? ausAntworten.zeitrahmen        ?? '',
      stil_praeferenzen: anfrage.stil_praeferenzen ?? ausAntworten.stil_praeferenzen ?? '',
      notizen:           anfrage.notizen           ?? ausAntworten.notizen           ?? '',
    }
  })

  // Dateien — async laden
  const [dateien, setDateien] = useState<OnboardingDatei[]>([])
  const [dateienGeladen, setDateienGeladen] = useState(false)

  const [raeumeErstellen, setRaeumeErstellen] = useState(true)

  useEffect(() => {
    let aktiv = true
    void getAnfrageDateien(anfrage.id).then((d) => {
      if (aktiv) { setDateien(d); setDateienGeladen(true) }
    })
    return () => { aktiv = false }
  }, [anfrage.id])

  function setStammField<K extends keyof typeof stamm>(key: K, value: typeof stamm[K]) {
    setStamm((s) => ({ ...s, [key]: value }))
  }

  function setAntwort(id: string, value: unknown) {
    setAntworten((a) => ({ ...a, [id]: value }))
  }

  function toggleAntwortOpt(id: string, opt: string, mehrfach: boolean) {
    if (mehrfach) {
      const current = (antworten[id] as string[]) ?? []
      const next = current.includes(opt) ? current.filter((s) => s !== opt) : [...current, opt]
      setAntwort(id, next)
    } else {
      setAntwort(id, antworten[id] === opt ? '' : opt)
    }
  }

  // Helper: stamm → updates-Payload
  function buildUpdates() {
    return {
      kunde_name:        stamm.kunde_name.trim()    || null,
      kunde_email:       stamm.kunde_email.trim()   || null,
      kunde_telefon:     stamm.kunde_telefon.trim() || null,
      projekt_name:      stamm.projekt_name.trim()  || null,
      projekt_adresse:   stamm.projekt_adresse.trim() || null,
      raumtypen:         stamm.raumtypen.length > 0 ? stamm.raumtypen : null,
      budget_min:        stamm.budget_min ?? null,
      budget_max:        stamm.budget_max ?? null,
      zeitrahmen:        stamm.zeitrahmen.trim() || null,
      stil_praeferenzen: stamm.stil_praeferenzen.trim() || null,
      notizen:           stamm.notizen.trim() || null,
      antworten:         antworten,
    }
  }

  async function speichern(): Promise<boolean> {
    setFehler(null)
    const res = await anfrageBearbeiten(anfrage.id, buildUpdates())
    if (!res.erfolg) {
      setFehler(res.fehler ?? 'Speichern fehlgeschlagen.')
      return false
    }
    return true
  }

  function handleSpeichern() {
    startTransition(async () => {
      if (await speichern()) {
        router.refresh()
        onClose()
      }
    })
  }

  function handleSpeichernUndAnlegen() {
    startTransition(async () => {
      if (!(await speichern())) return
      try {
        // kundeUndProjektAusOnboarding erstellt Kunde immer und Projekt
        // nur wenn projekt_name gesetzt ist — funktioniert also fuer
        // beide Faelle (mit/ohne Projekt) ohne Server-Side-Redirect.
        const res = await kundeUndProjektAusOnboarding(anfrage.id, { raeume_erstellen: raeumeErstellen })
        onClose()
        if (res.projekt_id) router.push(`/dashboard/projekte/${res.projekt_id}`)
        else                router.push(`/dashboard/kunden/${res.kunde_id}`)
      } catch (e) {
        setFehler(e instanceof Error ? e.message : 'Anlegen fehlgeschlagen.')
      }
    })
  }

  async function handleDateiLoeschen(dateiId: string) {
    setFehler(null)
    const vorher = dateien
    setDateien((d) => d.filter((x) => x.id !== dateiId))   // optimistisch
    const res = await onboardingDateiEntfernenAdmin(dateiId)
    if (!res.erfolg) {
      setDateien(vorher)
      setFehler(res.fehler ?? 'Datei konnte nicht gelöscht werden.')
    }
  }

  const hatVorlageAntworten = !!vorlage && (vorlage.fragen?.length ?? 0) > 0

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-titel"
        className="bg-white w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="edit-titel" className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
              Daten prüfen &amp; bearbeiten
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Korrigiere Kunden-Angaben vor &bdquo;Kunde + Projekt anlegen&ldquo;. Der Status bleibt unverändert auf <span className="font-medium">Eingereicht</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Schließen"
            className="text-gray-400 hover:text-gray-600 p-1 -m-1 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 border-b border-gray-100 px-2 sm:px-4 flex items-center gap-1 overflow-x-auto">
          <TabButton aktiv={tab === 'stamm'}     onClick={() => setTab('stamm')}     label="Stammdaten" />
          {hatVorlageAntworten && (
            <TabButton aktiv={tab === 'antworten'} onClick={() => setTab('antworten')} label="Antworten" badge={Object.keys(antworten).length || undefined} />
          )}
          <TabButton aktiv={tab === 'dateien'}   onClick={() => setTab('dateien')}   label="Dateien" badge={dateien.length || undefined} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {tab === 'stamm' && (
            <StammdatenForm stamm={stamm} setField={setStammField} />
          )}

          {tab === 'antworten' && (
            <AntwortenEditor
              vorlage={vorlage}
              antworten={antworten}
              setAntwort={setAntwort}
              toggleOpt={toggleAntwortOpt}
              token={anfrage.token}
              dateien={dateien}
              onTabWechseln={() => setTab('dateien')}
            />
          )}

          {tab === 'dateien' && (
            <DateienListe
              dateien={dateien}
              geladen={dateienGeladen}
              onLoeschen={handleDateiLoeschen}
              istPending={isPending}
            />
          )}

          {fehler && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{fehler}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-3 border-t border-gray-100 flex items-center gap-2 bg-gray-50/50 sm:rounded-b-2xl flex-wrap">
          <div className="flex items-center gap-2 text-xs text-gray-500 mr-auto">
            <input
              type="checkbox"
              id="raeume-erstellen"
              checked={raeumeErstellen}
              onChange={(e) => setRaeumeErstellen(e.target.checked)}
              className="accent-wellbeing-green"
            />
            <label htmlFor="raeume-erstellen" className="cursor-pointer">
              Räume aus Raumtypen erstellen
            </label>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-50 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSpeichern}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:border-gray-400 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Speichern
          </button>
          <button
            type="button"
            onClick={handleSpeichernUndAnlegen}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-lg transition-colors"
          >
            {stamm.projekt_name.trim() ? <Briefcase className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            {isPending ? 'Wird gespeichert…' : 'Speichern + Kunde anlegen'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TabButton({ aktiv, onClick, label, badge }: { aktiv: boolean; onClick: () => void; label: string; badge?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
        aktiv
          ? 'border-wellbeing-green text-wellbeing-green'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {badge != null && badge > 0 && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${aktiv ? 'bg-wellbeing-green/10 text-wellbeing-green' : 'bg-gray-100 text-gray-500'}`}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Stammdaten-Tab ────────────────────────────────────────────
function StammdatenForm({
  stamm, setField,
}: {
  stamm: {
    kunde_name: string; kunde_email: string; kunde_telefon: string
    projekt_name: string; projekt_adresse: string
    raumtypen: string[]
    budget_min: number | null; budget_max: number | null
    zeitrahmen: string; stil_praeferenzen: string; notizen: string
  }
  setField: <K extends keyof typeof stamm>(key: K, v: typeof stamm[K]) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormFeld label="Name">
          <input type="text" value={stamm.kunde_name} onChange={(e) => setField('kunde_name', e.target.value)} className={inputCls(false)} placeholder="Vor- und Nachname" />
        </FormFeld>
        <FormFeld label="E-Mail">
          <input type="email" value={stamm.kunde_email} onChange={(e) => setField('kunde_email', e.target.value)} className={inputCls(false)} placeholder="kunde@email.de" />
        </FormFeld>
        <FormFeld label="Telefon">
          <input type="tel" value={stamm.kunde_telefon} onChange={(e) => setField('kunde_telefon', e.target.value)} className={inputCls(false)} placeholder="+49 ..." />
        </FormFeld>
        <FormFeld label="Zeitrahmen">
          <input type="text" value={stamm.zeitrahmen} onChange={(e) => setField('zeitrahmen', e.target.value)} className={inputCls(false)} placeholder="z. B. 3 - 6 Monate" />
        </FormFeld>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormFeld label="Projektname">
          <input type="text" value={stamm.projekt_name} onChange={(e) => setField('projekt_name', e.target.value)} className={inputCls(false)} placeholder="z. B. Umbau Wohnung" />
        </FormFeld>
        <FormFeld label="Projekt-Adresse / Standort">
          <input type="text" value={stamm.projekt_adresse} onChange={(e) => setField('projekt_adresse', e.target.value)} className={inputCls(false)} placeholder="Straße, PLZ, Ort" />
        </FormFeld>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormFeld label="Budget von (€)">
          <input
            type="number"
            value={stamm.budget_min ?? ''}
            onChange={(e) => setField('budget_min', e.target.value === '' ? null : Number(e.target.value))}
            className={inputCls(false)}
            placeholder="0"
          />
        </FormFeld>
        <FormFeld label="Budget bis (€)">
          <input
            type="number"
            value={stamm.budget_max ?? ''}
            onChange={(e) => setField('budget_max', e.target.value === '' ? null : Number(e.target.value))}
            className={inputCls(false)}
            placeholder="0"
          />
        </FormFeld>
      </div>

      <FormFeld label="Räume (Tag-Liste)" hilfe="Enter drücken zum Hinzufügen, X-Icon zum Entfernen.">
        <TagInput werte={stamm.raumtypen} onChange={(v) => setField('raumtypen', v)} placeholder="Raumtyp eingeben + Enter" />
      </FormFeld>

      <FormFeld label="Stil & Wünsche">
        <input type="text" value={stamm.stil_praeferenzen} onChange={(e) => setField('stil_praeferenzen', e.target.value)} className={inputCls(false)} placeholder="z. B. modern, skandinavisch" />
      </FormFeld>

      <FormFeld label="Notizen">
        <textarea
          rows={4}
          value={stamm.notizen}
          onChange={(e) => setField('notizen', e.target.value)}
          className={`w-full px-4 py-3 text-sm border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light resize-none`}
          placeholder="Anmerkungen vom Kunden..."
        />
      </FormFeld>
    </div>
  )
}

function TagInput({ werte, onChange, placeholder }: { werte: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [v, setV] = useState('')
  function add() {
    const t = v.trim()
    if (!t) return
    if (werte.includes(t)) { setV(''); return }
    onChange([...werte, t])
    setV('')
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {werte.map((w, i) => (
          <span key={`${i}-${w}`} className="inline-flex items-center gap-1 text-xs bg-wellbeing-green/10 text-wellbeing-green-dark px-2 py-0.5 rounded-full">
            {w}
            <button type="button" onClick={() => onChange(werte.filter((_, idx) => idx !== i))} className="hover:text-red-500" aria-label="Entfernen">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className={inputCls(false)}
        />
        <button type="button" onClick={add} className="px-3 py-2 text-sm font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-lg inline-flex items-center gap-1.5 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Hinzufügen
        </button>
      </div>
    </div>
  )
}

// ── Antworten-Tab ─────────────────────────────────────────────
function AntwortenEditor({
  vorlage, antworten, setAntwort, toggleOpt, token, dateien, onTabWechseln,
}: {
  vorlage: OnboardingVorlage | null
  antworten: Record<string, unknown>
  setAntwort: (id: string, v: unknown) => void
  toggleOpt: (id: string, opt: string, mehrfach: boolean) => void
  token: string
  dateien: OnboardingDatei[]
  onTabWechseln: () => void
}) {
  // Sektionen-Gruppierung wie im Customer-Form
  const gruppen = useMemo(() => {
    if (!vorlage) return []
    const sektionen = vorlage.sektionen ?? []
    const fragen = vorlage.fragen ?? []
    const ohneSek = fragen.filter((f) => !f.sektion_id)
    const gr: { sektionName: string | null; fragen: typeof fragen }[] = []
    if (ohneSek.length > 0) gr.push({ sektionName: null, fragen: ohneSek })
    for (const s of sektionen) {
      const fs = fragen.filter((f) => f.sektion_id === s.id)
      if (fs.length > 0) gr.push({ sektionName: s.name, fragen: fs })
    }
    return gr
  }, [vorlage])

  if (!vorlage) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        Keine Vorlage verknüpft — Antworten als JSONB editieren ist nicht möglich.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {gruppen.map((grp, gi) => (
        <div key={grp.sektionName ?? `_un-${gi}`}>
          {grp.sektionName && (
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">{grp.sektionName}</p>
          )}
          <div className="space-y-4">
            {grp.fragen.map((f) => {
              const istUpload = f.typ === 'upload'
              if (istUpload) {
                const dateienFrage = dateien.filter((d) => d.frage_id === f.id)
                return (
                  <div key={f.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <p className="text-sm font-medium text-gray-700 mb-1.5">{f.titel}</p>
                    {dateienFrage.length === 0 ? (
                      <p className="text-xs text-gray-400">Keine Dateien hochgeladen.</p>
                    ) : (
                      <ul className="space-y-1 text-xs text-gray-600">
                        {dateienFrage.map((d) => (
                          <li key={d.id} className="inline-flex items-center gap-1.5">
                            {d.dateityp.startsWith('image/') ? <ImageIcon className="w-3 h-3 text-gray-400" /> : <FileText className="w-3 h-3 text-gray-400" />}
                            <span>{d.dateiname}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={onTabWechseln}
                      className="mt-2 text-xs text-wellbeing-green hover:underline inline-flex items-center gap-1"
                    >
                      Im Tab &bdquo;Dateien&ldquo; verwalten <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )
              }
              return (
                <DynamischesFeld
                  key={f.id}
                  token={token}
                  frage={f}
                  wert={antworten[f.id]}
                  onChange={(v) => setAntwort(f.id, v)}
                  onToggle={(opt) => toggleOpt(f.id, opt, f.typ === 'mehrfachauswahl')}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Dateien-Tab ───────────────────────────────────────────────
function DateienListe({
  dateien, geladen, onLoeschen, istPending,
}: {
  dateien: OnboardingDatei[]
  geladen: boolean
  onLoeschen: (id: string) => void
  istPending: boolean
}) {
  const [oeffneId, setOeffneId] = useState<string | null>(null)
  const [preview, setPreview]   = useState<OnboardingDatei | null>(null)

  async function herunterladen(id: string) {
    setOeffneId(id)
    const res = await onboardingDateiSignierteUrl(id)
    setOeffneId(null)
    if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer')
  }

  if (!geladen) {
    return <p className="text-sm text-gray-500 text-center py-8">Dateien werden geladen…</p>
  }
  if (dateien.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">Keine Dateien vorhanden.</p>
  }
  return (
    <>
      <ul className="space-y-2">
        {dateien.map((d) => {
          const istBild     = d.dateityp.startsWith('image/')
          const vorschauOk  = kannInlineVorschau(d.dateityp)
          return (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => vorschauOk && setPreview(d)}
                disabled={!vorschauOk}
                className={`flex items-center gap-3 flex-1 min-w-0 text-left ${vorschauOk ? 'cursor-pointer group' : 'cursor-default'}`}
              >
                <span className="text-gray-400 shrink-0">
                  {istBild ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium text-gray-900 truncate ${vorschauOk ? 'group-hover:text-wellbeing-green' : ''}`}>{d.dateiname}</p>
                  <p className="text-[11px] text-gray-400">{d.dateityp}{d.dateigroesse ? ` · ${formatBytes(d.dateigroesse)}` : ''}</p>
                </div>
              </button>
              {vorschauOk && (
                <button
                  type="button"
                  onClick={() => setPreview(d)}
                  className="text-gray-400 hover:text-wellbeing-green p-1.5 rounded"
                  aria-label="Vorschau"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => herunterladen(d.id)}
                disabled={oeffneId === d.id}
                className="text-gray-400 hover:text-wellbeing-green p-1.5 rounded disabled:opacity-50"
                aria-label="Herunterladen / in neuem Tab öffnen"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onLoeschen(d.id)}
                disabled={istPending}
                className="text-gray-400 hover:text-red-500 p-1.5 rounded disabled:opacity-50"
                aria-label="Löschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          )
        })}
      </ul>

      {preview && (
        <FilePreviewModal
          dateiname={preview.dateiname}
          mimeType={preview.dateityp}
          groesse={preview.dateigroesse}
          urlFetcher={() => onboardingDateiSignierteUrl(preview.id).then((r) => r.url ?? null)}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  )
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
