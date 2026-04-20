'use client'

import { useRef, useState } from 'react'
import {
  FolderOpen, Package, Calculator, Link2, Handshake, Users,
  type LucideIcon,
} from 'lucide-react'
import {
  AnimatePresence, m, useMotionValueEvent, useScroll, useTransform, useReducedMotion,
} from 'framer-motion'
import Reveal from './Reveal'
import { useIsMobile } from '@/hooks/useIsMobile'

type Feature = {
  icon: LucideIcon
  title: string
  desc: string
  blob:  string   // Tailwind background für Blob
  ring:  string   // Ring-Glow
  chip:  string   // Chip-Text-Farbe
  stage: string   // Stage-Background Gradient
  tag:   string   // Category-Tag
}

const features: Feature[] = [
  {
    icon: FolderOpen,
    tag:  'Struktur',
    title: 'Projektstruktur',
    desc: 'Kunde, Räume und Budget – alles sauber strukturiert an einem Ort. Kein Copy-Paste zwischen Dokumenten, keine Version 17 im Postfach.',
    blob:  'bg-wellbeing-cream',
    ring:  'shadow-[0_0_60px_24px_rgba(203,161,120,0.25)]',
    chip:  'text-wellbeing-terracotta',
    stage: 'bg-gradient-to-br from-wellbeing-cream/60 via-white to-white',
  },
  {
    icon: Package,
    tag:  'Katalog',
    title: 'Produktlisten',
    desc: 'Produkte mit Links, Bildern und Kategorien übersichtlich erfassen und nach Räumen sortieren. Import aus URL mit einem Klick.',
    blob:  'bg-violet-100',
    ring:  'shadow-[0_0_60px_24px_rgba(139,92,246,0.20)]',
    chip:  'text-violet-600',
    stage: 'bg-gradient-to-br from-violet-50/60 via-white to-white',
  },
  {
    icon: Calculator,
    tag:  'Automatik',
    title: 'Auto-Kalkulation',
    desc: 'Einkaufspreis rein, Marge setzen – Verkaufspreis netto und brutto werden automatisch berechnet. Nie wieder Excel-Formeln pflegen.',
    blob:  'bg-emerald-100',
    ring:  'shadow-[0_0_60px_24px_rgba(16,185,129,0.20)]',
    chip:  'text-emerald-600',
    stage: 'bg-gradient-to-br from-emerald-50/60 via-white to-white',
  },
  {
    icon: Link2,
    tag:  'Freigabe',
    title: 'Freigabe per Link',
    desc: 'Kunde klickt den Link, gibt frei oder lehnt ab – kein Account, keine App, keine Erklärung nötig. Feedback sofort im Dashboard.',
    blob:  'bg-sky-100',
    ring:  'shadow-[0_0_60px_24px_rgba(14,165,233,0.20)]',
    chip:  'text-sky-600',
    stage: 'bg-gradient-to-br from-sky-50/60 via-white to-white',
  },
  {
    icon: Handshake,
    tag:  'Netzwerk',
    title: 'Partnerverwaltung',
    desc: 'Konditionen, Provisionen und Lieferanten­infos immer griffbereit. Keine verlorenen E-Mails, keine vergessenen Rabattsätze.',
    blob:  'bg-amber-100',
    ring:  'shadow-[0_0_60px_24px_rgba(245,158,11,0.20)]',
    chip:  'text-amber-600',
    stage: 'bg-gradient-to-br from-amber-50/60 via-white to-white',
  },
  {
    icon: Users,
    tag:  'Team',
    title: 'Team & Rollen',
    desc: 'Mehrere Designer, ein Tool. Zusammen an Projekten arbeiten ohne Datei-Wirrwarr, mit klaren Rollen und Berechtigungen.',
    blob:  'bg-rose-100',
    ring:  'shadow-[0_0_60px_24px_rgba(244,63,94,0.20)]',
    chip:  'text-rose-600',
    stage: 'bg-gradient-to-br from-rose-50/60 via-white to-white',
  },
]

function FeatureGrid() {
  return (
    <section id="features" className="bg-[#F8F9FA] py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.018] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #445c49 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden
      />
      <div className="relative z-10 max-w-[1300px] mx-auto px-6">
        <Reveal variant="blur-in">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">Features</p>
            <h2 className="font-syne font-bold text-[32px] md:text-[52px] text-[#445c49] mb-4 leading-[1.1]">
              Alles was du brauchst –<br className="hidden md:block" /> nichts was du nicht brauchst
            </h2>
            <p className="text-[15px] md:text-[17px] text-gray-500 max-w-lg mx-auto leading-relaxed">
              Kein Overkill. Kein 3D-Renderer. Keine Buchhaltung. Nur das was dich täglich weiterbringt.
            </p>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08} variant="fade-up">
              <div className={`bg-white rounded-2xl border border-gray-200 p-7 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300`}>
                <div className={`w-12 h-12 rounded-xl ${f.blob} flex items-center justify-center mb-5`}>
                  <f.icon className={`w-5 h-5 ${f.chip}`} />
                </div>
                <h3 className="font-syne font-bold text-[17px] text-[#445c49] mb-2">{f.title}</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Features() {
  const isMobile = useIsMobile()
  const prefersReduced = useReducedMotion()

  const outerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })

  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const clamped = Math.max(0, Math.min(0.9999, p))
    const idx = Math.floor(clamped * features.length)
    if (idx !== active) setActive(idx)
  })

  if (isMobile || prefersReduced) return <FeatureGrid />

  const f = features[active]
  const Icon = f.icon

  return (
    <section id="features" className="bg-white relative">
      <div ref={outerRef} className="relative" style={{ height: `${features.length * 100}vh` }}>
        <div className="sticky top-0 h-screen w-full overflow-hidden">

          {/* Animated Stage Background */}
          <AnimatePresence mode="wait">
            <m.div
              key={`bg-${active}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={`absolute inset-0 ${f.stage}`}
              aria-hidden
            />
          </AnimatePresence>

          {/* Subtle dot pattern */}
          <div
            className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #445c49 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
            aria-hidden
          />

          <div className="relative z-10 h-full w-full max-w-[1300px] mx-auto px-8 flex flex-col justify-center">

            {/* Top section header */}
            <div className="text-center mb-6 md:mb-10">
              <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-2">
                Features
              </p>
              <h2 className="font-syne font-bold text-[28px] md:text-[38px] text-[#445c49] leading-[1.1]">
                Alles was du brauchst
              </h2>
            </div>

            {/* Main stage: 2-column split */}
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 md:gap-14 items-center">

              {/* Left: animated blob + icon + ghost number */}
              <div className="relative flex items-center justify-center aspect-square max-w-[460px] mx-auto w-full">
                {/* Ghost number */}
                <AnimatePresence mode="wait">
                  <m.span
                    key={`num-${active}`}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.15 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex items-center justify-center select-none font-syne font-bold leading-none tracking-tight"
                    style={{
                      fontSize: 'clamp(160px, 22vw, 320px)',
                      background: 'linear-gradient(135deg, rgba(68,92,73,0.12) 0%, rgba(148,193,164,0.12) 50%, rgba(68,92,73,0.12) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {String(active + 1).padStart(2, '0')}
                  </m.span>
                </AnimatePresence>

                {/* Animated Blob */}
                <AnimatePresence mode="wait">
                  <m.div
                    key={`blob-${active}`}
                    initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 1.3, rotate: 15 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className={`relative w-[280px] h-[280px] md:w-[340px] md:h-[340px] rounded-[46%_54%_60%_40%_/_48%_42%_58%_52%] ${f.blob} ${f.ring}`}
                  />
                </AnimatePresence>

                {/* Icon on top */}
                <AnimatePresence mode="wait">
                  <m.div
                    key={`icon-${active}`}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.2, y: -10 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white flex items-center justify-center shadow-2xl shadow-black/5 border border-white"
                  >
                    <Icon className={`w-12 h-12 md:w-16 md:h-16 ${f.chip}`} strokeWidth={1.5} />
                  </m.div>
                </AnimatePresence>

                {/* Floating mini chip */}
                <AnimatePresence mode="wait">
                  <m.div
                    key={`chip-${active}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="absolute top-8 right-8 bg-white rounded-full px-3.5 py-1.5 shadow-lg border border-gray-100"
                  >
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${f.chip}`}>
                      {f.tag}
                    </span>
                  </m.div>
                </AnimatePresence>
              </div>

              {/* Right: text content */}
              <div className="relative min-h-[260px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <m.div
                    key={`text-${active}`}
                    initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className={`text-[11px] font-bold uppercase tracking-[0.25em] mb-3 ${f.chip}`}>
                      Feature {String(active + 1).padStart(2, '0')} / {String(features.length).padStart(2, '0')}
                    </p>
                    <h3 className="font-syne font-bold text-[40px] md:text-[60px] text-[#2d3e31] leading-[1.02] tracking-tight mb-5">
                      {f.title}
                    </h3>
                    <p className="text-[17px] md:text-[19px] text-gray-600 leading-relaxed max-w-[560px]">
                      {f.desc}
                    </p>
                  </m.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom: progress dots + scrub-line */}
            <div className="mt-8 md:mt-12">
              <div className="relative mx-auto max-w-[640px]">
                {/* Base line */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-gray-200 rounded-full" aria-hidden />
                {/* Fill line */}
                <m.div
                  style={{ scaleX: lineScale, transformOrigin: '0% 50%' }}
                  className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#445c49] rounded-full"
                  aria-hidden
                />
                {/* Dots */}
                <div className="relative flex justify-between items-center">
                  {features.map((ff, i) => {
                    const isActive = i === active
                    const isDone   = i < active
                    return (
                      <m.div
                        key={ff.title}
                        animate={{ scale: isActive ? 1.15 : 1 }}
                        transition={{ duration: 0.3 }}
                        className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                          isActive
                            ? 'bg-[#445c49] border-[#445c49]'
                            : isDone
                              ? 'bg-[#445c49] border-[#445c49]'
                              : 'bg-white border-gray-300'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
              <p className="text-center mt-4 text-[11px] text-gray-400 tracking-widest uppercase">
                Scroll weiter
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
