'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, Plus, X, Pencil, Check } from 'lucide-react'
import {
  labelAnlegen, labelAktualisieren, labelLoeschen,
  type AufgabePickerLabel,
} from '@/app/actions/aufgaben'

const FARB_PRESETS = [
  '#94c1a4', '#445c49', '#2d3e31',  // wellbeing-greens
  '#cba178', '#823509',              // sand / terracotta
  '#3b82f6', '#6366f1', '#a855f7',  // blue/indigo/purple
  '#f59e0b', '#ef4444', '#ec4899',  // amber/red/pink
  '#6b7280',                         // gray
]

export default function AufgabeLabelsPicker({
  selectedIds, labels, onChange, kompakt = false,
}: {
  selectedIds: string[]
  labels:      AufgabePickerLabel[]
  onChange:    (neue: string[]) => void
  kompakt?:    boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [offen, setOffen] = useState(false)
  const [neuModus, setNeuModus] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [farbe, setFarbe] = useState(FARB_PRESETS[0])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!offen) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOffen(false); setNeuModus(false); setEditId(null)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [offen])

  const aktiveLabels = labels.filter((l) => selectedIds.includes(l.id))

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    )
  }

  function startNeu() {
    setNeuModus(true); setEditId(null)
    setName(''); setFarbe(FARB_PRESETS[0])
  }
  function startEdit(l: AufgabePickerLabel) {
    setNeuModus(false); setEditId(l.id)
    setName(l.name); setFarbe(l.farbe)
  }

  function speichern() {
    const n = name.trim()
    if (!n) return
    startTransition(async () => {
      if (editId) {
        await labelAktualisieren(editId, { name: n, farbe })
      } else {
        await labelAnlegen({ name: n, farbe })
      }
      setNeuModus(false); setEditId(null); setName('')
      router.refresh()
    })
  }

  function loeschen(id: string) {
    startTransition(async () => {
      await labelLoeschen(id)
      onChange(selectedIds.filter((x) => x !== id))
      router.refresh()
    })
  }

  return (
    <div ref={ref} className="relative">
      {!kompakt && (
        <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1.5 flex items-center gap-1.5">
          <Tag className="w-3 h-3" /> Labels
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        className={
          'w-full min-h-[34px] flex items-center gap-1.5 px-2 py-1 text-sm border rounded-lg transition-colors flex-wrap ' +
          'border-gray-200 hover:bg-gray-50 ' +
          (offen ? 'border-wellbeing-green-light ring-2 ring-wellbeing-green/20' : '')
        }
      >
        {kompakt && <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
        {aktiveLabels.length === 0 ? (
          <span className="text-gray-400">Keine Labels</span>
        ) : (
          aktiveLabels.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
              style={{ backgroundColor: l.farbe }}
            >{l.name}</span>
          ))
        )}
      </button>

      {offen && (
        <div className="absolute z-30 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-96 flex flex-col">
          <ul className="overflow-y-auto py-1">
            {labels.length === 0 && !neuModus && (
              <li className="px-3 py-3 text-xs text-gray-400 italic">
                Noch keine Labels — leg eines an.
              </li>
            )}
            {labels.map((l) => (
              <li key={l.id} className="group flex items-center gap-2 px-2 py-1 hover:bg-gray-50">
                {editId === l.id ? (
                  <EditForm
                    name={name} setName={setName}
                    farbe={farbe} setFarbe={setFarbe}
                    onSave={speichern}
                    onCancel={() => setEditId(null)}
                  />
                ) : (
                  <>
                    <button
                      onClick={() => toggle(l.id)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      <span
                        className="w-4 h-4 rounded shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: l.farbe }}
                      >
                        {selectedIds.includes(l.id) && <Check size={10} className="text-white" />}
                      </span>
                      <span className="text-sm text-gray-700">{l.name}</span>
                    </button>
                    <button
                      onClick={() => startEdit(l)}
                      aria-label="Bearbeiten"
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-wellbeing-green p-1"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => loeschen(l.id)}
                      aria-label="Loeschen"
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1"
                    >
                      <X size={12} />
                    </button>
                  </>
                )}
              </li>
            ))}
            {neuModus && (
              <li className="px-2 py-1">
                <EditForm
                  name={name} setName={setName}
                  farbe={farbe} setFarbe={setFarbe}
                  onSave={speichern}
                  onCancel={() => setNeuModus(false)}
                />
              </li>
            )}
          </ul>
          {!neuModus && !editId && (
            <button
              type="button"
              onClick={startNeu}
              className="border-t border-gray-100 px-3 py-2 text-xs text-wellbeing-green hover:bg-gray-50 flex items-center gap-1.5"
            >
              <Plus size={12} /> Neues Label
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function EditForm({
  name, setName, farbe, setFarbe, onSave, onCancel,
}: {
  name:    string
  setName: (s: string) => void
  farbe:   string
  setFarbe: (s: string) => void
  onSave:  () => void
  onCancel: () => void
}) {
  return (
    <div className="w-full space-y-1.5 py-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onSave() }
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Label-Name"
        maxLength={40}
        className="w-full text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-wellbeing-green-light"
      />
      <div className="flex items-center gap-1 flex-wrap">
        {FARB_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFarbe(c)}
            className={
              'w-5 h-5 rounded border-2 transition-transform ' +
              (farbe === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110')
            }
            style={{ backgroundColor: c }}
            aria-label={`Farbe ${c}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-end gap-1 text-xs">
        <button onClick={onCancel} className="px-2 py-1 text-gray-500 hover:text-gray-700">Abbrechen</button>
        <button
          onClick={onSave}
          disabled={!name.trim()}
          className="px-2 py-1 bg-wellbeing-green text-white rounded disabled:opacity-50"
        >Speichern</button>
      </div>
    </div>
  )
}
