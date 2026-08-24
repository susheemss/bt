import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Series } from '../../types'

interface Props {
  labels: string[]
  onHandSeries: Series
  replenQtySeries: Series
  ropSeries: Series
}

const axis = { fontSize: 10, fill: '#8B95A5' }

/* Both bars are read straight off the inventory file: on-hand is the
   "On hand inventory" cell for that month, replenishment is the
   "Replenishment quantity" cell -- drawn side by side, never one derived
   by subtracting the other. A month with no replenishment recorded simply
   has no bar; a month the file has no row for at all is a genuine gap
   (null), not a zero. ROP follows the value recorded for each month
   rather than one flat line for the whole chart. */
export default function OnHandDRPChart({ labels, onHandSeries, replenQtySeries, ropSeries }: Props) {
  const hasData = onHandSeries.some((v) => v !== null)
  if (!hasData) {
    return (
      <div className="h-[172px] flex items-center justify-center text-center text-[11.5px] text-ink4 leading-relaxed px-6">
        Awaiting inventory data for this selection.
      </div>
    )
  }

  const data = labels.map((month, i) => ({
    month,
    onHand: onHandSeries[i],
    replenQty: replenQtySeries[i],
    rop: ropSeries[i],
  }))

  return (
    <ResponsiveContainer width="100%" height={172}>
      <ComposedChart data={data} barSize={11} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#E8ECF1" vertical={false} />
        <XAxis dataKey="month" tick={axis} axisLine={{ stroke: '#E2E6EB' }} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={44}
               tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)} />
        <Tooltip
          cursor={{ fill: 'rgba(46,107,230,0.05)' }}
          contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #E2E6EB', boxShadow: '0 4px 12px rgba(16,24,40,0.08)', padding: '6px 10px' }}
          formatter={(v: number, name: string) => [
            v.toLocaleString(),
            name === 'onHand' ? 'On-hand' : name === 'replenQty' ? 'Replenishment qty' : 'ROP',
          ]}
        />
        <Bar dataKey="onHand" fill="#94A3B8" radius={[2, 2, 0, 0]} />
        <Bar dataKey="replenQty" fill="#16A34A" radius={[2, 2, 0, 0]} />
        <Line type="stepAfter" dataKey="rop" stroke="#D97706" strokeDasharray="4 3" strokeWidth={1.4} dot={false} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
