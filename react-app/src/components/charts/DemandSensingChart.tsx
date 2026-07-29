import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { WEEK_LABELS } from '../../data/stores'

interface Props {
  forecast: number[]
  sensed: number[]
}

const axis = { fontSize: 10, fill: '#8B95A5' }

export default function DemandSensingChart({ forecast, sensed }: Props) {
  const data = forecast.map((v, i) => ({
    week: WEEK_LABELS[i],
    baseline: v,
    sensed: sensed[i] ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={172}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="sensedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#6C5CE7" stopOpacity={0.14} />
            <stop offset="100%" stopColor="#6C5CE7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#E8ECF1" vertical={false} />
        <XAxis dataKey="week" tick={axis} axisLine={{ stroke: '#E2E6EB' }} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={44}
               tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
               domain={['dataMin - 50', 'dataMax + 50']} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #E2E6EB', boxShadow: '0 4px 12px rgba(16,24,40,0.08)', padding: '6px 10px' }}
          formatter={(v: number, name: string) => [v.toLocaleString(), name === 'baseline' ? 'Baseline forecast' : 'Sensed demand']}
        />
        <Area type="monotone" dataKey="sensed" stroke="none" fill="url(#sensedFill)" />
        <Line
          type="monotone" dataKey="baseline" name="baseline"
          stroke="#8B95A5" strokeDasharray="5 3" strokeWidth={1.5} dot={false}
        />
        <Line
          type="monotone" dataKey="sensed" name="sensed"
          stroke="#6C5CE7" strokeWidth={2.2}
          dot={{ r: 2.5, fill: '#6C5CE7', strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
