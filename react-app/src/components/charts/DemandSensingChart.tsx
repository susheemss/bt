import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Series } from '../../types'

interface Props {
  labels: string[]
  /** Sensed Forecast column, from the separate demand-sensing file. */
  sensed: Series
  /** Total Demand column, same file. Independent of chart1's Baseline/Promo demand file. */
  totalDemand: Series
}

const axis = { fontSize: 10, fill: '#8B95A5' }

/* Recharts breaks a Line/Area at a null data point by default
   (connectNulls is false unless set), so a month either file has no row
   for reads as a genuine gap rather than a fabricated zero -- no extra
   logic needed here beyond passing the values through as-is. */
export default function DemandSensingChart({ labels, sensed, totalDemand }: Props) {
  const hasData = sensed.some((v) => v !== null) || totalDemand.some((v) => v !== null)
  if (!hasData) {
    return (
      <div className="h-full min-h-[172px] flex items-center justify-center text-center text-[11.5px] text-ink4 leading-relaxed px-6">
        Awaiting demand sensing data for this selection.
      </div>
    )
  }

  const data = labels.map((month, i) => ({
    month,
    totalDemand: totalDemand[i],
    sensed: sensed[i],
  }))

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={172}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="sensedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C5CE7" stopOpacity={0.14} />
            <stop offset="100%" stopColor="#6C5CE7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#E8ECF1" vertical={false} />
        <XAxis dataKey="month" tick={axis} axisLine={{ stroke: '#E2E6EB' }} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={44}
               tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
               domain={['dataMin - 5', 'dataMax + 5']} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #E2E6EB', boxShadow: '0 4px 12px rgba(16,24,40,0.08)', padding: '6px 10px' }}
          formatter={(v: number, name: string) => [v.toLocaleString(), name === 'totalDemand' ? 'Total demand' : 'Sensed forecast']}
        />
        <Area type="monotone" dataKey="sensed" stroke="none" fill="url(#sensedFill)" connectNulls={false} />
        <Line type="monotone" dataKey="totalDemand" name="totalDemand" stroke="#8B95A5" strokeDasharray="5 3" strokeWidth={1.5} dot={false} connectNulls={false} />
        <Line type="monotone" dataKey="sensed" name="sensed" stroke="#6C5CE7" strokeWidth={2.2}
              dot={{ r: 2.5, fill: '#6C5CE7', strokeWidth: 0 }} activeDot={{ r: 4 }} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
