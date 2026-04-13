'use client'

import { useState } from 'react'
import AnimateOnScroll from './AnimateOnScroll'
import DemoModal from './DemoModal'

export default function Pricing() {
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <section id="preise" className="bg-white py-28 relative overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-wellbeing-cream/80 blur-[80px] rounded-full pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 max-w-[1300px] mx-auto px-8">
        <AnimateOnScroll type="blur-in">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">
              Preise
            </p>
            <h2 className="font-syne font-bold text-[36px] md:text-[52px] text-[#445c49] mb-3 leading-[1.1]">
              Ehrliche Preise.<br className="hidden md:block" /> Kein Abo-Chaos.
            </h2>
            <p className="text-gray-500 text-[16px]">
              Alle Preise zzgl. MwSt. · Monatlich kündbar · Keine Jahresbindung.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll type="fade-up">
          <div className="max-w-2xl mx-auto">
            <div className="relative rounded-2xl border-2 border-dashed border-[#445c49]/20 bg-wellbeing-cream/30 p-10 text-center overflow-hidden">
              {/* Decorative corner dots */}
              <div className="absolute top-5 left-5 w-2 h-2 rounded-full bg-[#445c49]/20" />
              <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-[#445c49]/20" />
              <div className="absolute bottom-5 left-5 w-2 h-2 rounded-full bg-[#445c49]/20" />
              <div className="absolute bottom-5 right-5 w-2 h-2 rounded-full bg-[#445c49]/20" />

              {/* Beta badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 border border-amber-200 rounded-full text-amber-700 text-[12px] font-bold uppercase tracking-widest mb-6">
                <span>🚧</span>
                Beta-Phase
              </div>

              {/* Title */}
              <p className="text-gray-600 text-[16px] leading-relaxed max-w-lg mx-auto mb-5">
                Wellbeing Spaces befindet sich aktuell in der <strong className="text-gray-800">geschlossenen Beta</strong>.
              </p>

              <p className="text-gray-500 text-[15px] leading-relaxed max-w-md mx-auto mb-4">
                Du möchtest die App testen? Schreib uns und wir richten dir einen Demo-Zugang ein.
                Schau dir alles in Ruhe an und gib uns dein ehrliches Feedback.
              </p>

              {/* Bonus */}
              <div className="inline-flex items-start gap-2.5 bg-[#445c49]/5 border border-[#445c49]/10 rounded-xl px-5 py-3.5 text-left mb-8 max-w-md mx-auto">
                <span className="text-[18px] shrink-0 mt-0.5">💡</span>
                <p className="text-[14px] text-gray-600 leading-snug">
                  <strong className="text-[#445c49]">Bonus:</strong> Beta-Tester mit konstruktivem Feedback erhalten
                  einen <strong className="text-[#445c49]">exklusiven Rabatt</strong>, sobald wir live gehen!
                </p>
              </div>

              {/* Checkmarks */}
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2.5 text-[14px] text-gray-500 mb-8">
                {[
                  'Voller Funktionsumfang',
                  'Persönliche Einführung',
                  'Direkter Draht zu uns',
                ].map((t) => (
                  <span key={t} className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold text-[16px]">✓</span>
                    {t}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => setDemoOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#445c49] hover:bg-[#2d3e31] text-white text-[15px] font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#445c49]/30 hover:-translate-y-0.5"
              >
                Demo anfragen →
              </button>
            </div>
          </div>
        </AnimateOnScroll>
      </div>

      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  )
}
