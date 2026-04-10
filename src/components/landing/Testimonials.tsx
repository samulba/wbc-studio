import AnimateOnScroll from './AnimateOnScroll'

const testimonials = [
  {
    name: 'Sarah M.',
    role: 'Interior Designerin, München',
    initials: 'SM',
    color: 'bg-violet-500',
    quote:
      'Endlich kein Excel-Chaos mehr. Mit WBC Studio erstelle ich Produktlisten in Minuten und meine Kunden geben per Link frei – ohne eine einzige Rückfrage.',
  },
  {
    name: 'Tobias K.',
    role: 'Architektur Studio, Berlin',
    initials: 'TK',
    color: 'bg-indigo-500',
    quote:
      'Die Preiskalkulation spart uns täglich Zeit. Einkaufspreis rein, Marge setzen und der Verkaufspreis steht – automatisch. Genau das was wir gebraucht haben.',
  },
  {
    name: 'Lisa R.',
    role: 'Raumplanerin, Hamburg',
    initials: 'LR',
    color: 'bg-emerald-500',
    quote:
      'Meine Kunden lieben es, dass sie keine App installieren oder ein Konto erstellen müssen. Einfach Link öffnen und freigeben. So unkompliziert sollte das immer sein.',
  },
]

export default function Testimonials() {
  return (
    <section className="bg-white py-24">
      <div className="max-w-5xl mx-auto px-5">
        <AnimateOnScroll>
          <h2 className="font-syne font-bold text-[36px] md:text-[48px] text-[#0F1117] text-center mb-14 leading-[1.1]">
            Was Designer sagen
          </h2>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <AnimateOnScroll key={t.name} delay={i * 100}>
              <div className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col gap-5 hover:border-gray-300 hover:shadow-md transition-all duration-200 h-full">
                {/* Stars */}
                <div className="flex gap-0.5 text-amber-400 text-[14px]">★★★★★</div>

                {/* Quote */}
                <p className="text-[14px] text-gray-600 leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                  <div
                    className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-[12px] font-bold shrink-0`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900">{t.name}</p>
                    <p className="text-[11px] text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
