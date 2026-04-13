'use client'

import { useState } from 'react'
import AnimateOnScroll from './AnimateOnScroll'
import DemoModal from './DemoModal'

export default function FinalCTA() {
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <section className="bg-[#2d3e31] py-36 relative overflow-hidden">

      {/* Large ambient glow – center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(148,193,164,0.18) 0%, transparent 70%)' }}
        aria-hidden
      />

      {/* Top-right accent glow */}
      <div
        className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(68,92,73,0.5) 0%, transparent 65%)' }}
        aria-hidden
      />

      {/* Floating border squares */}
      {[
        { size: 140, top: '8%',  right: '4%',  rotate: 18,  op: 0.06 },
        { size:  70, top: '72%', right: '12%', rotate: -10, op: 0.05 },
        { size: 200, top: '55%', left:  '2%',  rotate:  7,  op: 0.04 },
        { size:  55, top: '18%', left:  '16%', rotate: -22, op: 0.07 },
        { size:  90, top: '40%', right: '28%', rotate:  12, op: 0.03 },
      ].map((sq, i) => (
        <div
          key={i}
          className="absolute border border-wellbeing-green-light rounded-2xl pointer-events-none"
          style={{
            width: sq.size, height: sq.size,
            top: sq.top,
            ...(sq.right !== undefined ? { right: sq.right } : { left: sq.left }),
            opacity: sq.op,
            transform: `rotate(${sq.rotate}deg)`,
          }}
          aria-hidden
        />
      ))}

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #94c1a4 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-3xl mx-auto px-5 text-center">
        <AnimateOnScroll type="blur-in">
          <p className="text-[11px] font-bold text-wellbeing-green-light uppercase tracking-[0.25em] mb-6">
            Jetzt loslegen
          </p>
          <h2 className="font-syne font-bold text-[44px] md:text-[72px] text-white mb-6 leading-[1.03] tracking-tight">
            Weniger Chaos.<br />
            Mehr <span className="text-wellbeing-green-light">Projekte</span>.
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={150} type="fade-up">
          <p className="text-white/45 text-[18px] mb-12 leading-relaxed max-w-xl mx-auto">
            Fordere eine persönliche Demo an – wir zeigen dir alles in 20 Minuten und richten deinen Zugang ein.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Pulsing glow CTA */}
            <div className="relative w-full sm:w-auto">
              <div
                className="absolute inset-0 rounded-xl bg-wellbeing-green-light/30 blur-md animate-pulse pointer-events-none"
                style={{ animationDuration: '2.5s' }}
              />
              <button
                onClick={() => setDemoOpen(true)}
                className="relative inline-flex items-center gap-2 px-10 py-4 bg-white text-[#2d3e31] text-[16px] font-bold rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-white/20 hover:-translate-y-1 w-full sm:w-auto justify-center"
              >
                Demo anfragen →
              </button>
            </div>

            <a
              href="#preise"
              onClick={(e) => { e.preventDefault(); document.querySelector('#preise')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 hover:border-white/20 text-white/60 hover:text-white/80 text-[15px] font-semibold rounded-xl transition-all duration-200 w-full sm:w-auto justify-center cursor-pointer"
            >
              Preise ansehen
            </a>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 mt-12">
            {['Kostenfrei in der Beta', 'Kein Login für Kunden', 'DSGVO-konform · EU-Server'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[12px] text-white/25">
                <span className="text-emerald-400 font-bold">✓</span>
                {t}
              </span>
            ))}
          </div>
        </AnimateOnScroll>
      </div>

      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  )
}
