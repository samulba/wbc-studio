'use client'

import Link from 'next/link'

function BackgroundPattern() {
  const squares = [200, 150, 100]
  return (
    <div className="absolute right-0 bottom-0 w-80 h-80 pointer-events-none overflow-hidden" aria-hidden>
      {squares.map((size, i) => (
        <div
          key={i}
          className="absolute border border-indigo-300 rounded-2xl"
          style={{
            width:   size,
            height:  size,
            right:   -16 + i * 40,
            bottom:  -16 + i * 40,
            opacity: 0.035 - i * 0.008,
          }}
        />
      ))}
    </div>
  )
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white pt-16">
      <BackgroundPattern />

      <div className="relative z-10 max-w-4xl mx-auto px-5 text-center">

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[13px] font-semibold mb-8 animate-fade-up"
          style={{ animationDelay: '0ms' }}
        >
          <span aria-hidden>✦</span>
          <span>Die einfachere Alternative zu Houzz Pro</span>
        </div>

        {/* Headline */}
        <h1
          className="font-syne font-bold text-[#0F1117] leading-[1.06] tracking-tight mb-6 animate-fade-up text-[40px] sm:text-[56px] md:text-[68px] lg:text-[76px]"
          style={{ animationDelay: '120ms' }}
        >
          Deine Projekte. Deine Preise.<br />
          <span className="text-[#6366F1]">Deine Kunden</span> begeistert.
        </h1>

        {/* Subheadline */}
        <p
          className="text-[17px] md:text-[20px] text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up"
          style={{ animationDelay: '220ms' }}
        >
          Produktlisten erstellen, Preise automatisch kalkulieren und Kunden mit einem Link
          zur Freigabe einladen – kein Login nötig. Für Interior Designer die mehr wollen als Excel.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 animate-fade-up"
          style={{ animationDelay: '320ms' }}
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[15px] font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 w-full sm:w-auto justify-center"
          >
            Kostenlos starten →
          </Link>
          <a
            href="#features"
            onClick={(e) => { e.preventDefault(); document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' }) }}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-[15px] font-semibold rounded-xl transition-all duration-200 hover:shadow-sm w-full sm:w-auto justify-center cursor-pointer"
          >
            Wie es funktioniert
          </a>
        </div>

        {/* Trust row */}
        <div
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 animate-fade-up"
          style={{ animationDelay: '420ms' }}
        >
          {['Kostenlos starten', 'Kein Login für Kunden', 'DSGVO-konform'].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[13px] text-gray-400">
              <span className="text-emerald-500 font-semibold">✓</span>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
