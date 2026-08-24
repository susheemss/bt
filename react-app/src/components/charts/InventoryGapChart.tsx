import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { Series } from '../../types'

interface Props {
  labels: string[]
  gap: Series
}

const axis = { fontSize: 10, fill: '#8B95A5' }

/* Y axis scales to the real data range -- it used to be floored at
   ±200 (leftover from placeholder data), which flattened any real series
   smaller than that onto the zero line. Null months (the inventory file
   has no row) are left null so the line breaks rather than reading as a
   fabricated zero. */
export default function InventoryGapChart({ labels, gap }: Props) {
  const hasData = gap.some((v) => v !== null)
  if (!hasData) {
    return (
      <div className="h-[172px] flex items-center justify-center text-center text-[11.5px] text-ink4 leading-relaxed px-6">
        Awaiting inventory data for this selection.
      </div>
    )
  }

  const data = labels.map((month, i) => ({ month, gap: gap[i] }))
  const real = gap.filter((v): v is number => v !== null)
  const max = Math.max(...real, 0)
  const min = Math.min(...real, 0)
  const zeroOffset = max <= 0 ? 0 : max / (max - min || 1)

  return (
    <ResponsiveContainer width="100%" height={172}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="gapSplit" x1="0" y1="0" x2="0" y2="1">
            <stop offset={0} stopColor="#16A34A" stopOpacity={0.18} />
            <stop offset={zeroOffset} stopColor="#16A34A" stopOpacity={0.02} />
            <stop offset={zeroOffset} stopColor="#DC2626" stopOpacity={0.02} />
            <stop offset={1} stopColor="#DC2626" stopOpacity={0.18} />
          </linearGradient>
          <linearGradient id="gapStroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset={Math.max(zeroOffset - 0.01, 0)} stopColor="#16A34A" />
            <stop offset={Math.min(zeroOffset + 0.01, 1)} stopColor="#DC2626" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#E8ECF1" vertical={false} />
        <XAxis dataKey="month" tick={axis} axisLine={{ stroke: '#E2E6EB' }} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={44}
               tickFormatter={(v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #E2E6EB', boxShadow: '0 4px 12px rgba(16,24,40,0.08)', padding: '6px 10px' }}
          formatter={(v: number) => [v.toLocaleString(), v < 0 ? 'Shortfall vs ROP' : 'Surplus over ROP']}
        />
        <ReferenceLine y={0} stroke="#1C2128" strokeWidth={1} strokeDasharray="3 3" opacity={0.35} />
        <Area type="monotone" dataKey="gap" stroke="url(#gapStroke)" strokeWidth={2} fill="url(#gapSplit)" connectNulls={false} activeDot={{ r: 3.5 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
