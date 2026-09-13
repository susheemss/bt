import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'

interface Props {
  labels: string[]
  forecast: number[]
  sensed: number[]
  onBarClick?: (index: number) => void
}

const axis = { fontSize: 10, fill: '#8B95A5' }

/* Small downward marker above the top of each bar, purely decorative --
   position is driven by Recharts' own stack-top coordinates (x/width from
   whichever segment this is attached to), so it lands correctly whether or
   not that segment has a real nonzero value. */
function TopMarker({ x, y, width }: { x?: number | string; y?: number | string; width?: number | string }) {
  if (x === undefined || y === undefined || width === undefined) return null
  const cx = Number(x) + Number(width) / 2
  const tipY = Number(y) - 6
  return <polygon points={`${cx - 4},${tipY - 6} ${cx + 4},${tipY - 6} ${cx},${tipY}`} fill="#2E6BE6" />
}

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
        <BarChart data={data} barCategoryGap="24%" margin={{ top: 20, right: 4, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="dfBaseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B95A5" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#CBD5E1" stopOpacity={0.4} />
            </linearGradient>
          </defs>
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
            fill="url(#dfBaseGrad)"
            radius={[0, 0, 2, 2]}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={(_, index) => onBarClick?.(index)}
          />
          <Bar
            dataKey="uplift"
            stackId="a"
            fill="#2E6BE6"
            radius={[2, 2, 0, 0]}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={(_, index) => onBarClick?.(index)}
          >
            <LabelList dataKey="uplift" content={TopMarker} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
