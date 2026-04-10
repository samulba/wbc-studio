import AnimateOnScroll from './AnimateOnScroll'
import Link from 'next/link'

export default function FinalCTA() {
  return (
    <section className="bg-gradient-to-br from-[#6366F1] via-[#5558E8] to-[#4F46E5] py-28 relative overflow-hidden">
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" aria-hidden>
        {[300, 220, 140].map((size, i) => (
          <div
            key={i}
            className="absolute border border-white rounded-3xl"
            style={{
              width:  size,
              height: size,
              right:  80 - i * 30,
              top:    '50%',
              transform: 'translateY(-50%)',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-5 text-center">
        <AnimateOnScroll>
          <h2 className="font-syne font-bold text-[36px] md:text-[56px] text-white mb-4 leading-[1.08]">
            Bereit, Projekte professionell zu managen?
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <p className="text-white/70 text-[18px] mb-10 leading-relaxed">
            Starte kostenlos – keine Kreditkarte nötig.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-[#6366F1] text-[15px] font-bold rounded-xl transition-all duration-200 hover:shadow-2xl hover:-translate-y-0.5"
          >
            Jetzt kostenlos starten →
          </Link>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
