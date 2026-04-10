import AnimateOnScroll from './AnimateOnScroll'

const competitors = ['Houzz Pro', 'Excel', 'E-Mail Chaos']

export default function CompetitorBadge() {
  return (
    <section className="bg-gray-50 border-y border-gray-100 py-14">
      <div className="max-w-5xl mx-auto px-5 text-center">
        <AnimateOnScroll>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-8">
            Die einfachere Alternative für Designer die produktiv arbeiten wollen
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {competitors.map((name) => (
              <div
                key={name}
                className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm"
              >
                <span className="text-[13px] font-medium text-gray-400 line-through decoration-gray-300">
                  {name}
                </span>
                <span className="text-red-400 text-[11px] font-bold">✕</span>
              </div>
            ))}

            <div className="hidden md:flex items-center text-gray-200 font-light text-xl">→</div>

            <div className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 rounded-xl border border-indigo-200 shadow-sm">
              <span className="text-[13px] font-bold text-[#6366F1]">WBC Studio</span>
              <span className="text-emerald-500 text-[11px] font-bold">✓</span>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
