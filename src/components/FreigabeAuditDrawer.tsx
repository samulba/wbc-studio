'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  X, Check, XCircle, CircleDashed, Zap, User, LinkIcon,
  Plus, Trash2, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { freigabeAuditFuerToken } from '@/app/actions/freigaben'
import type { FreigabeAudit, FreigabeKanal, FreigabeToken } from '@/lib/supabase/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  token:   FreigabeToken | null
  tokenLabel: string
}

const kanalLabel: Record<FreigabeKanal, string> = {
  portal: 'Kundenportal',
  token:  'Freigabe-Link',
  admin:  'Admin',
  system: 'System (Auto)',
}

const kanalIcon: Record<FreigabeKanal, typeof User> = {
  portal: User,
  token:  LinkIcon,
  admin:  User,
  system: Zap,
}

function statusIcon(status: string | null) {
  if (status === 'freigegeben') return <Check className="w-4 h-4 text-emerald-600" />
  if (status === 'abgelehnt' || status === 'ueberarbeitung') return <XCircle className="w-4 h-4 text-red-500" />
  return <CircleDashed className="w-4 h-4 text-gray-400" />
}

// Lifecycle-Events (erstellt, zurueckgezogen, abgeschlossen) werden
// aus den Token-Feldern selbst abgeleitet und mit dem Audit-Log zu
// einem chronologischen Verlauf vereint.
type LifecycleEintrag = {
  key:       string
  kind:      'erstellt' | 'abgeschlossen' | 'zurueckgezogen' | 'abgelaufen'
  datum:     string
  akteur:    string
  kommentar: string | null
}

function lifecycleAusToken(token: FreigabeToken | null): LifecycleEintrag[] {
  if (!token) return []
  const eintraege: LifecycleEintrag[] = []

  eintraege.push({
    key:   `${token.id}-erstellt`,
    kind:  'erstellt',
    datum: token.created_at,
    akteur: 'Admin',
    kommentar: null,
  })

  if (token.abgeschlossen_am) {
    eintraege.push({
      key:   `${token.id}-abgeschlossen`,
      kind:  'abgeschlossen',
      datum: token.abgeschlossen_am,
      akteur: token.abgeschlossen_durch ?? 'Kunde',
      kommentar: token.abgeschlossen_kommentar ?? null,
    })
  }

  if (token.deleted_at) {
    eintraege.push({
      key:   `${token.id}-zurueckgezogen`,
      kind:  'zurueckgezogen',
      datum: token.deleted_at,
      akteur: 'Admin',
      kommentar: null,
    })
  }

  if (token.gueltig_bis && new Date(token.gueltig_bis) < new Date() && !token.abgeschlossen_am && !token.deleted_at) {
    eintraege.push({
      key:   `${token.id}-abgelaufen`,
      kind:  'abgelaufen',
      datum: token.gueltig_bis,
      akteur: 'System',
      kommentar: null,
    })
  }

  return eintraege
}

const lifecycleStyle: Record<LifecycleEintrag['kind'], { Icon: typeof Plus; farbe: string; label: string }> = {
  erstellt:       { Icon: Plus,          farbe: 'text-wellbeing-green', label: 'Link erstellt' },
  abgeschlossen:  { Icon: CheckCircle2,  farbe: 'text-emerald-600',     label: 'Link abgeschlossen' },
  zurueckgezogen: { Icon: Trash2,        farbe: 'text-red-500',         label: 'Link zurückgezogen' },
  abgelaufen:     { Icon: AlertTriangle, farbe: 'text-amber-500',       label: 'Link abgelaufen' },
}

type TimelineEintrag =
  | { typ: 'audit';    datum: string; entry: FreigabeAudit }
  | { typ: 'lifecycle'; datum: string; entry: LifecycleEintrag }

export default function FreigabeAuditDrawer({ isOpen, onClose, token, tokenLabel }: Props) {
  const [audit, setAudit]   = useState<FreigabeAudit[]>([])
  const [ladend, setLadend] = useState(false)

  useEffect(() => {
    if (!isOpen || !token) return
    let abgebrochen = false
    setLadend(true)
    freigabeAuditFuerToken(token.id)
      .then((data) => { if (!abgebrochen) setAudit(data) })
      .catch(() => { if (!abgebrochen) setAudit([]) })
      .finally(() => { if (!abgebrochen) setLadend(false) })
    return () => { abgebrochen = true }
  }, [isOpen, token])

  const timeline: TimelineEintrag[] = useMemo(() => {
    const lifecycle = lifecycleAusToken(token).map<TimelineEintrag>((e) => ({
      typ: 'lifecycle', datum: e.datum, entry: e,
    }))
    const auditEntries = audit.map<TimelineEintrag>((e) => ({
      typ: 'audit', datum: e.created_at, entry: e,
    }))
    return [...lifecycle, ...auditEntries].sort((a, b) =>
      new Date(b.datum).getTime() - new Date(a.datum).getTime()
    )
  }, [token, audit])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-drawer-titel"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 id="audit-drawer-titel" className="text-sm font-semibold text-gray-900">Freigabe-Verlauf</h2>
            <p className="text-[11px] text-gray-400 truncate">{tokenLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {ladend && <p className="text-xs text-gray-400">Lädt…</p>}
          {!ladend && timeline.length === 0 && (
            <p className="text-xs text-gray-400">Noch keine Ereignisse.</p>
          )}
          <ol className="space-y-4 relative">
            {timeline.length > 0 && (
              <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-100" aria-hidden />
            )}
            {timeline.map((item) => {
              if (item.typ === 'lifecycle') {
                const style = lifecycleStyle[item.entry.kind]
                const { Icon } = style
                return (
                  <li key={item.entry.key} className="relative pl-7">
                    <div className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                      <Icon className={`w-3 h-3 ${style.farbe}`} />
                    </div>
                    <div className="text-xs">
                      <p className="font-medium text-gray-900">{style.label}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500">von {item.entry.akteur}</p>
                      {item.entry.kommentar && (
                        <p className="mt-1 text-[11px] text-gray-500 italic">&bdquo;{item.entry.kommentar}&ldquo;</p>
                      )}
                      <p className="mt-1 text-[10px] text-gray-400">
                        {new Date(item.entry.datum).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </li>
                )
              }
              const a = item.entry
              const KanalIcon = kanalIcon[a.kanal]
              return (
                <li key={a.id} className="relative pl-7">
                  <div className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                    {statusIcon(a.neuer_status)}
                  </div>
                  <div className="text-xs text-gray-700">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <KanalIcon className="w-3 h-3" />
                      <span className="font-medium">{kanalLabel[a.kanal]}</span>
                      <span>·</span>
                      <span>{a.geaendert_von}</span>
                    </div>
                    <div className="mt-0.5 text-gray-900">
                      Status: <strong>{a.neuer_status}</strong>
                      {a.alter_status && <span className="text-gray-400"> (vorher: {a.alter_status})</span>}
                    </div>
                    {a.kommentar && (
                      <p className="mt-1 text-[11px] text-gray-500 italic">&bdquo;{a.kommentar}&ldquo;</p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">
                      {new Date(a.created_at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </aside>
    </>
  )
}
