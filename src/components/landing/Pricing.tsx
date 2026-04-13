import AnimateOnScroll from './AnimateOnScroll'

export default function Pricing() {
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
            <div className="relative rounded-2xl border-2 border-dashed border-[#445c49]/20 bg-wellbeing-cream/30 p-12 text-center overflow-hidden">
              {/* Decorative corner badges */}
              <div className="absolute top-5 left-5 w-2 h-2 rounded-full bg-[#445c49]/20" />
              <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-[#445c49]/20" />
              <div className="absolute bottom-5 left-5 w-2 h-2 rounded-full bg-[#445c49]/20" />
              <div className="absolute bottom-5 right-5 w-2 h-2 rounded-full bg-[#445c49]/20" />

              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 border border-amber-200 rounded-full text-amber-700 text-[12px] font-bold uppercase tracking-widest mb-6">
                <span>🚧</span>
                Beta-Phase
              </div>

              <h3 className="font-syne font-bold text-[28px] md:text-[36px] text-[#445c49] mb-4 leading-tight">
                Aktuell kostenfrei<br className="hidden sm:block" /> für alle Beta-Nutzer
              </h3>

              <p className="text-gray-500 text-[16px] leading-relaxed max-w-md mx-auto mb-8">
                Während der Beta-Phase ist Wellbeing Spaces für alle Tester vollständig
                kostenfrei. Preise werden transparent kommuniziert bevor die Beta endet.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[14px] text-gray-500">
                {[
                  'Keine Kreditkarte',
                  'Voller Funktionsumfang',
                  'DSGVO-konform',
                  'Feedback erwünscht',
                ].map((t) => (
                  <span key={t} className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold text-[16px]">✓</span>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
