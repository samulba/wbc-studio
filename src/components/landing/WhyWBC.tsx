import AnimateOnScroll from './AnimateOnScroll'

type Cell = { label: string; good?: boolean; bad?: boolean }

const rows: { feature: string; wbc: Cell; houzz: Cell; mydoma: Cell }[] = [
  {
    feature: 'Preis',
    wbc:    { label: 'ab kostenlos', good: true  },
    houzz:  { label: '$199/mo',      bad:  true  },
    mydoma: { label: '$64/mo',       bad:  true  },
  },
  {
    feature: 'Kunden-Login nötig',
    wbc:    { label: 'Nein',  good: true },
    houzz:  { label: 'Ja',   bad:  true },
    mydoma: { label: 'Ja',   bad:  true },
  },
  {
    feature: 'Fokus',
    wbc:    { label: 'Produkte & Freigabe' },
    houzz:  { label: 'Marketing'           },
    mydoma: { label: 'Client UX'           },
  },
  {
    feature: 'DSGVO EU-Server',
    wbc:    { label: 'Ja',   good: true },
    houzz:  { label: 'Nein', bad:  true },
    mydoma: { label: 'Nein', bad:  true },
  },
  {
    feature: 'Einstieg',
    wbc:    { label: 'Sofort',  good: true },
    houzz:  { label: 'Komplex'             },
    mydoma: { label: 'Mittel'              },
  },
]

function CellValue({ cell, isWBC }: { cell: Cell; isWBC?: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-1.5 text-[14px] font-medium ${
      isWBC
        ? 'text-[#6366F1] font-semibold'
        : cell.bad
          ? 'text-red-400'
          : 'text-gray-400'
    }`}>
      {cell.good && <span className="text-emerald-500 text-[12px]">✓</span>}
      {cell.bad  && !isWBC && <span className="text-[12px]">✗</span>}
      {cell.label}
    </div>
  )
}

export default function WhyWBC() {
  return (
    <section id="warum-wbc" className="bg-[#0F1117] py-24">
      <div className="max-w-5xl mx-auto px-5">
        <AnimateOnScroll>
          <h2 className="font-syne font-bold text-[36px] md:text-[52px] text-white text-center mb-14 leading-[1.1]">
            Warum Designer WBC Studio wählen
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <div className="bg-white rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200">
              <div className="px-5 py-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                Feature
              </div>
              {[
                { label: 'WBC Studio', highlight: true },
                { label: 'Houzz Pro',  highlight: false },
                { label: 'Mydoma',     highlight: false },
              ].map(({ label, highlight }) => (
                <div key={label} className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-widest">
                  <span className={highlight ? 'text-[#6366F1]' : 'text-gray-400'}>{label}</span>
                </div>
              ))}
            </div>

            {rows.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-4 border-b border-gray-100 last:border-0 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                }`}
              >
                <div className="px-5 py-4 text-[13px] font-medium text-gray-700 flex items-center">
                  {row.feature}
                </div>
                <div className="px-4 py-4 flex items-center justify-center">
                  <CellValue cell={row.wbc}    isWBC />
                </div>
                <div className="px-4 py-4 flex items-center justify-center">
                  <CellValue cell={row.houzz} />
                </div>
                <div className="px-4 py-4 flex items-center justify-center">
                  <CellValue cell={row.mydoma} />
                </div>
              </div>
            ))}
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={200}>
          <p className="text-center text-white/40 text-[14px] mt-8">
            Kein 3D-Renderer den du nie nutzt. Kein Marketing-Paket das du nicht brauchst.
          </p>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
