'use client'

import { useEffect, useRef } from 'react'
import { FolderOpen, Package, Calculator, Link2, Handshake, Users } from 'lucide-react'
import AnimateOnScroll from './AnimateOnScroll'

const features = [
  {
    icon: FolderOpen,
    title: 'Projektstruktur',
    desc: 'Kunde, Räume und Budget – alles sauber strukturiert an einem Ort. Kein Copy-Paste zwischen Dokumenten.',
  },
  {
    icon: Package,
    title: 'Produktlisten',
    desc: 'Produkte mit Links, Bildern und Kategorien übersichtlich erfassen und nach Räumen sortieren.',
  },
  {
    icon: Calculator,
    title: 'Auto-Kalkulation',
    desc: 'Einkaufspreis rein, Marge setzen – Verkaufspreis netto und brutto werden automatisch berechnet.',
  },
  {
    icon: Link2,
    title: 'Freigabe per Link',
    desc: 'Kunde klickt den Link, gibt frei oder lehnt ab – kein Account, keine App, keine Erklärung nötig.',
  },
  {
    icon: Handshake,
    title: 'Partnerverwaltung',
    desc: 'Konditionen, Provisionen und Lieferanteninfos immer griffbereit. Keine verlorenen E-Mails.',
  },
  {
    icon: Users,
    title: 'Team & Rollen',
    desc: 'Mehrere Designer, ein Tool. Zusammen an Projekten arbeiten ohne Datei-Wirrwarr.',
  },
]

export default function Features() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    cardRefs.current.forEach((el, i) => {
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add('visible'), i * 80)
            observer.disconnect()
          }
        },
        { threshold: 0.08 }
      )
      observer.observe(el)
      observers.push(observer)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  return (
    <section id="features" className="bg-[#F8F9FA] py-24">
      <div className="max-w-6xl mx-auto px-5">
        <AnimateOnScroll>
          <div className="text-center mb-14">
            <h2 className="font-syne font-bold text-[36px] md:text-[52px] text-[#0F1117] mb-4 leading-[1.1]">
              Alles was du brauchst –<br className="hidden md:block" /> nichts was du nicht brauchst
            </h2>
            <p className="text-[17px] text-gray-500 max-w-lg mx-auto leading-relaxed">
              Kein Overkill. Kein 3D-Renderer. Keine Buchhaltung. Nur das was dich täglich weiterbringt.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              ref={(el) => { cardRefs.current[i] = el }}
              className="fade-up bg-white rounded-2xl border border-gray-200 p-7 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 hover:-translate-y-1 transition-all duration-300 cursor-default"
            >
              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-5">
                <f.icon className="w-5 h-5 text-[#6366F1]" />
              </div>
              <h3 className="font-syne font-bold text-[16px] text-[#0F1117] mb-2">{f.title}</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
