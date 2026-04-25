'use client'

import { useState, useTransition } from 'react'
import {
  Plus, X, Mail, Phone, Smartphone, Star, MoreVertical, Pencil, Trash2,
  User, BadgeCheck,
} from 'lucide-react'
import {
  kundeKontaktAnlegen,
  kundeKontaktAktualisieren,
  kundeKontaktLoeschen,
  kundeKontaktAlsHauptkontaktSetzen,
  type KundeKontaktDaten,
} from '@/app/actions/kunden'
import type { KundeKontakt } from '@/lib/supabase/types'
import { ConfirmModal } from '@/components/ConfirmModal'

const ROLLEN_VORSCHLAEGE = [
  'Geschäftsführung',
  'Inhaber:in',
  'Buchhaltung',
  'Assistenz',
  'Projektleitung',
  'Architekt:in',
  'Sonstiges',
]

function leereDaten(): KundeKontaktDaten {
  return {
    name: '',
    rolle: null,
    email: null,
    telefon: null,
    mobil: null,
    notizen: null,
    ist_hauptkontakt: false,
  }
}

export default function KundeKontakteBlock({
  kundeId,
  initialKontakte,
}: {
  kundeId: string
  initialKontakte: KundeKontakt[]
}) {
  const [kontakte, setKontakte]     = useState<KundeKontakt[]>(initialKontakte)
  const [modalOffen, setModalOffen] = useState(false)
  const [bearbeite, setBearbeite]   = useState<KundeKontakt | null>(null)
  const [loescheId, setLoescheId]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [fehler, setFehler]         = useState<string | null>(null)

  function neuOeffnen() {
    setBearbeite(null)
    setFehler(null)
    setModalOffen(true)
  }
  function bearbeitenOeffnen(k: KundeKontakt) {
    setBearbeite(k)
    setFehler(null)
    setModalOffen(true)
  }

  function alsHauptSetzen(k: KundeKontakt) {
    if (k.ist_hauptkontakt) return
    setFehler(null)
    setKontakte((prev) =>
      prev.map((c) => ({ ...c, ist_hauptkontakt: c.id === k.id })),
    )
    startTransition(async () => {
      const r = await kundeKontaktAlsHauptkontaktSetzen(k.id, kundeId)
      if (r.fehler) {
        setFehler(r.fehler)
        setKontakte((prev) =>
          prev.map((c) => ({ ...c, ist_hauptkontakt: c.id === k.id ? false : c.ist_hauptkontakt })),
        )
      }
    })
  }

  function loeschen(id: string) {
    startTransition(async () => {
      const r = await kundeKontaktLoeschen(id, kundeId)
      if (r.fehler) setFehler(r.fehler)
      else setKontakte((prev) => prev.filter((c) => c.id !== id))
      setLoescheId(null)
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">
          Ansprechpartner <span className="text-gray-400 font-normal">({kontakte.length})</span>
        </h2>
        <button
          onClick={neuOeffnen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Hinzufügen
        </button>
      </div>

      {fehler && (
        <p className="text-xs text-red-600 px-5 pt-3">{fehler}</p>
      )}

      {kontakte.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="w-12 h-12 rounded-full bg-wellbeing-green/10 mx-auto flex items-center justify-center mb-3">
            <User className="w-5 h-5 text-wellbeing-green" />
          </div>
          <p className="text-sm font-medium text-gray-700">Noch keine Ansprechpartner</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Lege den ersten Kontakt an, damit du gezielt anrufen oder mailen kannst.</p>
          <button
            onClick={neuOeffnen}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Ersten Kontakt anlegen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5">
          {kontakte.map((k) => (
            <KontaktKarte
              key={k.id}
              kontakt={k}
              onBearbeiten={() => bearbeitenOeffnen(k)}
              onLoeschen={() => setLoescheId(k.id)}
              onAlsHaupt={() => alsHauptSetzen(k)}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {modalOffen && (
        <KontaktModal
          kundeId={kundeId}
          initial={bearbeite}
          istErsterKontakt={!bearbeite && kontakte.length === 0}
          onClose={() => {
            setModalOffen(false)
            setBearbeite(null)
            setFehler(null)
          }}
          onAngelegt={(neu) => {
            setKontakte((prev) =>
              neu.ist_hauptkontakt
                ? [neu, ...prev.map((c) => ({ ...c, ist_hauptkontakt: false }))]
                : [...prev, neu],
            )
          }}
          onAktualisiert={(updated) => {
            setKontakte((prev) =>
              prev.map((c) =>
                c.id === updated.id
                  ? updated
                  : updated.ist_hauptkontakt
                    ? { ...c, ist_hauptkontakt: false }
                    : c,
              ),
            )
          }}
        />
      )}

      <ConfirmModal
        isOpen={loescheId != null}
        variant="danger"
        title="Kontakt löschen?"
        message="Diese Kontaktperson wird dauerhaft entfernt. Andere Daten zum Kunden bleiben erhalten."
        confirmText="Löschen"
        isLoading={isPending}
        onConfirm={() => loescheId && loeschen(loescheId)}
        onClose={() => setLoescheId(null)}
      />
    </div>
  )
}

function KontaktKarte({
  kontakt: k,
  onBearbeiten,
  onLoeschen,
  onAlsHaupt,
  isPending,
}: {
  kontakt:      KundeKontakt
  onBearbeiten: () => void
  onLoeschen:   () => void
  onAlsHaupt:   () => void
  isPending:    boolean
}) {
  const [menuOffen, setMenuOffen] = useState(false)

  return (
    <div
      className={`relative rounded-xl border p-4 transition-colors ${
        k.ist_hauptkontakt
          ? 'border-wellbeing-green/40 bg-wellbeing-green/5'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
            k.ist_hauptkontakt
              ? 'bg-wellbeing-green text-white'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {initialen(k.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate">{k.name}</p>
            {k.ist_hauptkontakt && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-wellbeing-green-dark bg-wellbeing-green/15 px-1.5 py-0.5 rounded-full">
                <BadgeCheck className="w-3 h-3" /> Hauptkontakt
              </span>
            )}
          </div>
          {k.rolle && (
            <p className="text-[11px] text-gray-500 mt-0.5">{k.rolle}</p>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOffen(!menuOffen) }}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Menü"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOffen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOffen(false)} />
              <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                <button
                  type="button"
                  onClick={() => { setMenuOffen(false); onBearbeiten() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="w-3.5 h-3.5" /> Bearbeiten
                </button>
                {!k.ist_hauptkontakt && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => { setMenuOffen(false); onAlsHaupt() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Star className="w-3.5 h-3.5" /> Als Hauptkontakt setzen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setMenuOffen(false); onLoeschen() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 border-t border-gray-100"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Löschen
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {(k.email || k.telefon || k.mobil) && (
        <div className="mt-3 space-y-1.5">
          {k.email && (
            <a
              href={`mailto:${k.email}`}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-wellbeing-green transition-colors"
            >
              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="truncate">{k.email}</span>
            </a>
          )}
          {k.telefon && (
            <a
              href={`tel:${k.telefon}`}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-wellbeing-green transition-colors"
            >
              <Phone className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="truncate">{k.telefon}</span>
            </a>
          )}
          {k.mobil && (
            <a
              href={`tel:${k.mobil}`}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-wellbeing-green transition-colors"
            >
              <Smartphone className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="truncate">{k.mobil}</span>
            </a>
          )}
        </div>
      )}

      {k.notizen && (
        <p className="mt-3 text-[11px] text-gray-500 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-2.5">
          {k.notizen}
        </p>
      )}
    </div>
  )
}

function initialen(name: string): string {
  const teile = name.trim().split(/\s+/).filter(Boolean)
  if (teile.length === 0) return '?'
  if (teile.length === 1) return teile[0].slice(0, 2).toUpperCase()
  return (teile[0][0] + teile[teile.length - 1][0]).toUpperCase()
}

function KontaktModal({
  kundeId,
  initial,
  istErsterKontakt,
  onClose,
  onAngelegt,
  onAktualisiert,
}: {
  kundeId:          string
  initial:          KundeKontakt | null
  istErsterKontakt: boolean
  onClose:          () => void
  onAngelegt:       (k: KundeKontakt) => void
  onAktualisiert:   (k: KundeKontakt) => void
}) {
  const [daten, setDaten] = useState<KundeKontaktDaten>(() => {
    if (initial) {
      return {
        name:             initial.name,
        rolle:            initial.rolle,
        email:            initial.email,
        telefon:          initial.telefon,
        mobil:            initial.mobil,
        notizen:          initial.notizen,
        ist_hauptkontakt: initial.ist_hauptkontakt,
        reihenfolge:      initial.reihenfolge,
      }
    }
    return { ...leereDaten(), ist_hauptkontakt: istErsterKontakt }
  })
  const [isPending, startTransition] = useTransition()
  const [fehler, setFehler] = useState<string | null>(null)

  function speichern() {
    if (!daten.name?.trim()) {
      setFehler('Name ist erforderlich.')
      return
    }
    setFehler(null)
    startTransition(async () => {
      if (initial) {
        const r = await kundeKontaktAktualisieren(initial.id, kundeId, daten)
        if (r.fehler) { setFehler(r.fehler); return }
        onAktualisiert({
          ...initial,
          name:             daten.name.trim(),
          rolle:            daten.rolle?.trim() || null,
          email:            daten.email?.trim() || null,
          telefon:          daten.telefon?.trim() || null,
          mobil:            daten.mobil?.trim() || null,
          notizen:          daten.notizen?.trim() || null,
          ist_hauptkontakt: !!daten.ist_hauptkontakt,
          updated_at:       new Date().toISOString(),
        })
      } else {
        const r = await kundeKontaktAnlegen(kundeId, daten)
        if (r.fehler) { setFehler(r.fehler); return }
        const tempId = 'tmp-' + Math.random().toString(36).slice(2)
        onAngelegt({
          id:               tempId,
          organisation_id:  '',
          kunde_id:         kundeId,
          name:             daten.name.trim(),
          rolle:            daten.rolle?.trim() || null,
          email:            daten.email?.trim() || null,
          telefon:          daten.telefon?.trim() || null,
          mobil:            daten.mobil?.trim() || null,
          notizen:          daten.notizen?.trim() || null,
          ist_hauptkontakt: !!daten.ist_hauptkontakt,
          reihenfolge:      daten.reihenfolge ?? 0,
          created_at:       new Date().toISOString(),
          updated_at:       new Date().toISOString(),
        })
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {initial ? 'Kontakt bearbeiten' : 'Neuen Kontakt anlegen'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-5 overflow-y-auto flex-1 space-y-4">
          {fehler && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {fehler}
            </p>
          )}

          <Field label="Name" required>
            <input
              type="text"
              value={daten.name}
              onChange={(e) => setDaten({ ...daten, name: e.target.value })}
              className={inp}
              placeholder="Max Mustermann"
              autoFocus
            />
          </Field>

          <Field label="Rolle / Funktion">
            <input
              type="text"
              list="kunde-kontakt-rollen"
              value={daten.rolle ?? ''}
              onChange={(e) => setDaten({ ...daten, rolle: e.target.value })}
              className={inp}
              placeholder="z. B. Geschäftsführung"
            />
            <datalist id="kunde-kontakt-rollen">
              {ROLLEN_VORSCHLAEGE.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="E-Mail">
              <input
                type="email"
                value={daten.email ?? ''}
                onChange={(e) => setDaten({ ...daten, email: e.target.value })}
                className={inp}
                placeholder="kontakt@beispiel.de"
              />
            </Field>
            <Field label="Telefon">
              <input
                type="tel"
                value={daten.telefon ?? ''}
                onChange={(e) => setDaten({ ...daten, telefon: e.target.value })}
                className={inp}
                placeholder="+49 …"
              />
            </Field>
          </div>

          <Field label="Mobil">
            <input
              type="tel"
              value={daten.mobil ?? ''}
              onChange={(e) => setDaten({ ...daten, mobil: e.target.value })}
              className={inp}
              placeholder="+49 …"
            />
          </Field>

          <Field label="Notizen zur Person">
            <textarea
              rows={3}
              value={daten.notizen ?? ''}
              onChange={(e) => setDaten({ ...daten, notizen: e.target.value })}
              className={`${inp} resize-none`}
              placeholder="z. B. Erreichbar Mo–Do, spricht Englisch, …"
            />
          </Field>

          <label className="flex items-start gap-2.5 p-3 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={daten.ist_hauptkontakt}
              onChange={(e) => setDaten({ ...daten, ist_hauptkontakt: e.target.checked })}
              className="mt-0.5 accent-wellbeing-green"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">Als Hauptkontakt markieren</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Der Hauptkontakt wird in Listen, PDFs und der Übersicht prominent angezeigt. Pro Kunde gibt es genau einen.
              </p>
            </div>
          </label>
        </div>

        <div className="px-6 pt-3 pb-6 shrink-0 border-t border-gray-100 flex items-center gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={speichern}
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-lg transition-colors"
          >
            {isPending ? 'Speichert…' : initial ? 'Speichern' : 'Anlegen'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  )
}

const inp =
  'w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition'
