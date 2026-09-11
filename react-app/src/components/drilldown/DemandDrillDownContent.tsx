import type { DrillDownContext } from '../../store/useDrillDownStore'
import { buildDemandDrillDown } from '../../lib/drillDown'

const SIGNAL_COLOR: Record<string, string> = {
  Promo: '#6C5CE7',
  Festival: '#D97706',
  Weather: '#2E6BE6',
  Trend: '#1A8754',
  Event: '#C93B3B',
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export default function DemandDrillDownContent({ ctx, monthIndex }: { ctx: DrillDownContext; monthIndex: number }) {
  const d = buildDemandDrillDown(ctx, monthIndex)
  const maxSig = Math.max(...d.signals.map((s) => s.units), 1)

  return (
    <div className="flex flex-col">
      <Section title="At a glance">
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Forecast demand"
            value={fmt(d.baseline)}
            delta={d.wowPct !== null ? `${d.wowPct >= 0 ? '↑' : '↓'} ${Math.abs(d.wowPct).toFixed(1)}% vs prior month` : null}
            deltaUp={d.wowPct !== null && d.wowPct >= 0}
          />
          <Stat
            label="Sensed demand"
            value={fmt(d.sensed)}
            delta={d.upliftPct !== null ? `${d.upliftPct >= 0 ? '+' : ''}${d.upliftPct.toFixed(1)}% vs baseline` : null}
            deltaUp={d.upliftPct !== null && d.upliftPct >= 0}
          />
        </div>
      </Section>

      {d.signals.length > 0 && (
        <Section title="What's driving demand this month">
          <div className="flex flex-col gap-1.5">
            <WaterfallRow label="Base forecast" width={100} color="#2E6BE6" opacity={0.55} value={`${fmt(d.baseline)} u`} />
            {d.signals.map((sg) => (
              <WaterfallRow
                key={sg.type}
                label={`${sg.type} signal`}
                width={Math.round((sg.units / maxSig) * 100)}
                color={SIGNAL_COLOR[sg.type] ?? '#8B95A5'}
                value={`+${fmt(sg.units)} u`}
                valueColor={SIGNAL_COLOR[sg.type]}
              />
            ))}
            <div className="pt-1.5 mt-0.5 border-t border-border">
              <WaterfallRow label="Sensed total" width={100} color="#1A1D23" value={`${fmt(d.sensed)} u`} bold />
            </div>
          </div>
        </Section>
      )}

      {d.topSkus && d.topSkus.length > 0 && (
        <Section title="Top SKUs by demand">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[10.5px] font-semibold uppercase tracking-wide text-ink4">
                <th className="text-left pb-1.5 border-b border-border font-semibold">SKU</th>
                <th className="text-right pb-1.5 border-b border-border font-semibold">Fcst units</th>
                <th className="text-right pb-1.5 border-b border-border font-semibold">vs prior mo.</th>
              </tr>
            </thead>
            <tbody>
              {d.topSkus.map((sk) => (
                <tr key={sk.id} className="border-b border-surface2 last:border-0">
                  <td className="py-1.5 text-[11.5px] text-ink2">{sk.name}</td>
                  <td className="py-1.5 text-right text-[12px] font-semibold text-ink">{fmt(sk.units)}</td>
                  <td className="py-1.5 text-right text-[11.5px]">
                    {sk.deltaPct === null ? (
                      <span className="text-ink5">—</span>
                    ) : (
                      <span className={sk.deltaPct >= 0 ? 'text-green' : 'text-red'}>
                        {sk.deltaPct >= 0 ? '↑' : '↓'}{Math.abs(sk.deltaPct).toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {d.stockWatch.length > 0 && (
        <Section title={`Stock watch — ${d.monthLabel}`}>
          <div className="flex flex-col gap-1.5">
            {d.stockWatch.slice(0, 6).map((sk) => (
              <div
                key={sk.id}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border ${
                  sk.risk === 'critical' ? 'border-red/25 bg-red-light/40' : 'border-amber/25 bg-amber-light/40'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[11.5px] font-semibold text-ink truncate">{sk.name}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10.5px] text-ink3">On-hand: {fmt(sk.onHand)} · ROP: {fmt(sk.rop)}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      sk.risk === 'critical' ? 'bg-red text-white' : 'bg-amber text-white'
                    }`}
                  >
                    {sk.risk === 'critical' ? 'Critical' : 'Watch'}
                  </span>
                </div>
              </div>
            ))}
          </div>
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

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`px-5 py-3.5 ${last ? '' : 'border-b border-surface2'}`}>
      <div className="text-[9.5px] font-bold uppercase tracking-wide text-ink4 mb-2.5">{title}</div>
      {children}
    </div>
  )
}

function Stat({ label, value, delta, deltaUp }: { label: string; value: string; delta: string | null; deltaUp: boolean }) {
  return (
    <div className="bg-surface2 border border-border rounded-md px-3.5 py-3">
      <div className="text-[11px] text-ink3 mb-1">{label}</div>
      <div className="text-[22px] font-bold text-ink tabular-nums tracking-tight">{value}</div>
      {delta && <div className={`text-[11.5px] mt-0.5 font-medium ${deltaUp ? 'text-green' : 'text-red'}`}>{delta}</div>}
    </div>
  )
}

function WaterfallRow({
  label,
  width,
  color,
  value,
  valueColor,
  opacity,
  bold,
}: {
  label: string
  width: number
  color: string
  value: string
  valueColor?: string
  opacity?: number
  bold?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-[92px] flex-shrink-0 text-[11px] ${bold ? 'font-semibold text-ink' : 'text-ink3'}`}>{label}</span>
      <div className="flex-1 h-[7px] bg-surface2 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: color, opacity: opacity ?? 1 }} />
      </div>
      <span className={`w-[64px] flex-shrink-0 text-right text-[11px] tabular-nums ${bold ? 'font-bold text-ink' : 'font-medium'}`} style={{ color: bold ? undefined : valueColor }}>
        {value}
      </span>
    </div>
  )
}
