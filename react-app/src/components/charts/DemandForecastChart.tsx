import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  labels: string[]
  forecast: number[]
  sensed: number[]
  onBarClick?: (index: number) => void
}

const axis = { fontSize: 10, fill: '#8B95A5' }

export default function DemandForecastChart({ labels, forecast, sensed, onBarClick }: Props) {
  const data = forecast.map((v, i) => ({
    month: labels[i],
    baseline: v,
    uplift: Math.max(0, (sensed[i] ?? 0) - v),
  }))

  return (
    // Absolutely positioned against .panel-bd (position: relative) rather than
    // sized via height:100% as a normal-flow flex child -- a ResponsiveContainer
    // that's part of normal flow can feed back into its own flex/grid ancestor's
    // computed height (each resize nudges the container, which re-triggers the
    // observer), a real bug that only showed up under real network timing, not
    // on localhost. Taking it out of flow breaks that feedback loop entirely
    // while still filling exactly the panel's available space.
    <div className="absolute inset-0 min-h-[172px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barSize={16} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#E8ECF1" vertical={false} />
          <XAxis dataKey="month" tick={axis} axisLine={{ stroke: '#E2E6EB' }} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} width={44}
                 tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)} />
          <Tooltip
            cursor={{ fill: 'rgba(46,107,230,0.05)' }}
            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #E2E6EB', boxShadow: '0 4px 12px rgba(16,24,40,0.08)', padding: '6px 10px' }}
            formatter={(v: number, name: string) => [v.toLocaleString(), name === 'baseline' ? 'Baseline forecast' : 'Sensing uplift']}
          />
          <Bar
            dataKey="baseline"
            stackId="a"
            fill="#2E6BE6"
            radius={[0, 0, 2, 2]}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={(_, index) => onBarClick?.(index)}
          />
          <Bar
            dataKey="uplift"
            stackId="a"
            fill="#6C5CE7"
            radius={[2, 2, 0, 0]}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={(_, index) => onBarClick?.(index)}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
