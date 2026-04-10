import AnimateOnScroll from './AnimateOnScroll'

const steps = [
  {
    num: '01',
    title: 'Projekt anlegen',
    desc: 'Kunde und Räume anlegen, Budget setzen – in unter 2 Minuten startklar.',
  },
  {
    num: '02',
    title: 'Produkte erfassen',
    desc: 'Links einfügen, Preise automatisch berechnen lassen, Kategorien vergeben.',
  },
  {
    num: '03',
    title: 'Freigabe senden',
    desc: 'Link an Kunden schicken, Feedback sofort im Tool sehen – ohne E-Mail-Chaos.',
  },
]

export default function HowItWorks() {
  return (
    <section className="bg-white py-24">
      <div className="max-w-5xl mx-auto px-5">
        <AnimateOnScroll>
          <h2 className="font-syne font-bold text-[36px] md:text-[52px] text-[#0F1117] text-center mb-16 leading-[1.1]">
            So einfach funktioniert WBC Studio
          </h2>
        </AnimateOnScroll>

        <div className="relative grid md:grid-cols-3 gap-10 md:gap-6">
          {/* Connector line */}
          <div
            className="hidden md:block absolute top-6 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-px bg-gradient-to-r from-indigo-200 via-indigo-300 to-indigo-200"
            aria-hidden
          />

          {steps.map((step, i) => (
            <AnimateOnScroll key={step.num} delay={i * 140}>
              <div className="flex flex-col items-center text-center">
                <div className="relative w-12 h-12 rounded-2xl bg-[#6366F1] flex items-center justify-center mb-5 z-10 shadow-md shadow-indigo-200">
                  <span className="font-syne font-bold text-white text-[13px]">{step.num}</span>
                </div>
                <h3 className="font-syne font-bold text-[18px] text-[#0F1117] mb-2">{step.title}</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed max-w-[230px]">{step.desc}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
