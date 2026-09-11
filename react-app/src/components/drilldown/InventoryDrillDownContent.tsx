import type { DrillDownContext } from '../../store/useDrillDownStore'
import { buildInventoryDrillDown, type InvClassRow } from '../../lib/drillDown'

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export default function InventoryDrillDownContent({ ctx, monthIndex }: { ctx: DrillDownContext; monthIndex: number }) {
  const d = buildInventoryDrillDown(ctx, monthIndex)

  if (!d.hasData) {
    return (
      <div className="px-5 py-8 text-center text-[12px] text-ink4 leading-relaxed">
        No real on-hand data recorded for {d.scopeLabel === 'All items' ? d.storeName : d.scopeLabel} at {d.monthLabel}.
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Section title={`Stock health overview · ${fmt(d.totalUnits)} units`}>
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Fast-moving" color="#1A8754" units={d.fast.reduce((a, r) => a + r.units, 0)} count={d.fast.length} />
          <MiniStat label="Slow-moving" color="#D97706" units={d.slow.reduce((a, r) => a + r.units, 0)} count={d.slow.length} />
          <MiniStat label="Dead stock" color="#C93B3B" units={d.dead.reduce((a, r) => a + r.units, 0)} count={d.dead.length} />
        </div>
      </Section>

      {d.dead.length > 0 && (
        <Section title="Dead stock — over a month of supply" titleColor="#C93B3B">
          <RowList rows={d.dead} tone="critical" />
        </Section>
      )}

      {d.slow.length > 0 && (
        <Section title="Slow-moving stock — monitor & act" titleColor="#D97706">
          <ClassTable rows={d.slow} />
        </Section>
      )}

      {d.fast.length > 0 && (
        <Section title="Fast-moving stock — watch for gaps" titleColor="#1A8754">
          <ClassTable rows={d.fast} risk />
        </Section>
      )}

      <Section title="Recommended actions" last>
        <div className="flex flex-col gap-1.5">
          {d.actions.map((a, i) => (
            <div key={i} className={`flex gap-2 px-2.5 py-2 rounded-md text-[11.5px] leading-snug ${a.urgent ? 'bg-red-light text-[#9B2C2C]' : 'bg-surface2 text-ink2'}`}>
              <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9.5px] font-bold ${a.urgent ? 'bg-red text-white' : 'bg-ink4 text-white'}`}>
                {i + 1}
              </span>
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, titleColor, children, last }: { title: string; titleColor?: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`px-5 py-3.5 ${last ? '' : 'border-b border-surface2'}`}>
      <div className="text-[9.5px] font-bold uppercase tracking-wide mb-2.5" style={{ color: titleColor ?? '#8B95A5' }}>{title}</div>
      {children}
    </div>
  )
}

function MiniStat({ label, color, units, count }: { label: string; color: string; units: number; count: number }) {
  return (
    <div className="bg-surface2 border border-border rounded-md px-2.5 py-2.5" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="text-[10.5px] text-ink3 mb-0.5">{label}</div>
      <div className="text-[18px] font-bold tabular-nums" style={{ color }}>{fmt(units)}</div>
      <div className="text-[10px] text-ink4">{count} SKU{count === 1 ? '' : 's'}</div>
    </div>
  )
}

function RowList({ rows, tone }: { rows: InvClassRow[]; tone: 'critical' }) {
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <div key={r.id} className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border ${tone === 'critical' ? 'border-red/25 bg-red-light/40' : ''}`}>
          <div className="min-w-0">
            <div className="text-[11.5px] font-semibold text-ink truncate">{r.name}</div>
            <div className="text-[10.5px] text-ink4 mt-0.5">
              {fmt(r.units)} units{r.monthsSupply !== null ? ` · ${r.monthsSupply.toFixed(1)} mo. supply` : ''}
            </div>
          </div>
          <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red text-white">Dead</span>
        </div>
      ))}
    </div>
  )
}

function ClassTable({ rows, risk }: { rows: InvClassRow[]; risk?: boolean }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-[10.5px] font-semibold uppercase tracking-wide text-ink4">
          <th className="text-left pb-1.5 border-b border-border font-semibold">SKU</th>
          <th className="text-right pb-1.5 border-b border-border font-semibold">Units</th>
          <th className="text-right pb-1.5 border-b border-border font-semibold">Days supply</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const dos = r.daysSupply
          const riskColor = risk && dos !== null ? (dos <= 5 ? '#C93B3B' : dos <= 10 ? '#D97706' : '#1A8754') : undefined
          return (
            <tr key={r.id} className="border-b border-surface2 last:border-0">
              <td className="py-1.5 text-[11.5px] text-ink2">{r.name}</td>
              <td className="py-1.5 text-right text-[12px] font-semibold text-ink">{fmt(r.units)}</td>
              <td className="py-1.5 text-right text-[11.5px] font-semibold" style={{ color: riskColor }}>
                {dos === null ? '—' : `${dos}d`}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
