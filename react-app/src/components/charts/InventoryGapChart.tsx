import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { WEEK_LABELS } from '../../data/stores'

interface Props {
  gap: number[]
}

const axis = { fontSize: 10, fill: '#8B95A5' }

export default function InventoryGapChart({ gap }: Props) {
  const data = gap.map((g, i) => ({ week: WEEK_LABELS[i], gap: g }))
  const values = data.map((d) => d.gap)
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  // Offset of the zero line inside the gradient (0 = top, 1 = bottom)
  const zeroOffset = max <= 0 ? 0 : max / (max - min)

  return (
    <ResponsiveContainer width="100%" height={172}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="gapSplit" x1="0" y1="0" x2="0" y2="1">
            <stop offset={0} stopColor="#2E6BE6" stopOpacity={0.25} />
            <stop offset={zeroOffset} stopColor="#2E6BE6" stopOpacity={0.03} />
            <stop offset={zeroOffset} stopColor="#C93B3B" stopOpacity={0.03} />
            <stop offset={1} stopColor="#C93B3B" stopOpacity={0.25} />
          </linearGradient>
          <linearGradient id="gapStroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset={Math.max(zeroOffset - 0.01, 0)} stopColor="#2E6BE6" />
            <stop offset={Math.min(zeroOffset + 0.01, 1)} stopColor="#C93B3B" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#E8ECF1" vertical={false} />
        <XAxis dataKey="week" tick={axis} axisLine={{ stroke: '#E2E6EB' }} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={44}
               tickFormatter={(v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #E2E6EB', boxShadow: '0 4px 12px rgba(16,24,40,0.08)', padding: '6px 10px' }}
          formatter={(v: number) => [v.toLocaleString(), v < 0 ? 'Shortfall (net requirement)' : 'Surplus vs baseline']}
        />
        <ReferenceLine y={0} stroke="#3B4150" strokeWidth={1.2} />
        <Area
          type="monotone" dataKey="gap"
          stroke="url(#gapStroke)" strokeWidth={2}
          fill="url(#gapSplit)"
          activeDot={{ r: 3.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
