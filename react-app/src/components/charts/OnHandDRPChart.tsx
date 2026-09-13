import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import type { Series } from '../../types'

interface Props {
  labels: string[]
  onHandSeries: Series
  replenQtySeries: Series
  ropSeries: Series
  onBarClick?: (index: number) => void
}

const axis = { fontSize: 10, fill: '#8B95A5' }

/* Small downward marker above the top of each bar, purely decorative -- see
   DemandForecastChart.tsx's TopMarker for why it's driven by Recharts' own
   stack-top coordinates instead of a real value. */
function TopMarker({ x, y, width }: { x?: number | string; y?: number | string; width?: number | string }) {
  if (x === undefined || y === undefined || width === undefined) return null
  const cx = Number(x) + Number(width) / 2
  const tipY = Number(y) - 6
  return <polygon points={`${cx - 4},${tipY - 6} ${cx + 4},${tipY - 6} ${cx},${tipY}`} fill="#2E6BE6" />
}

/* Both bars are read straight off the inventory file: on-hand is the
   "On hand inventory" cell for that month, replenishment is the
   "Replenishment quantity" cell -- stacked on the same bar (shared stackId),
   each segment keeping its own real recorded value, never one derived by
   subtracting the other. A month with no replenishment recorded simply
   adds no segment; a month the file has no row for at all is a genuine gap
   (null), not a zero. ROP follows the value recorded for each month
   rather than one flat line for the whole chart. */
export default function OnHandDRPChart({ labels, onHandSeries, replenQtySeries, ropSeries, onBarClick }: Props) {
  const hasData = onHandSeries.some((v) => v !== null)
  if (!hasData) {
    return (
      <div className="h-full min-h-[172px] flex items-center justify-center text-center text-[11.5px] text-ink4 leading-relaxed px-6">
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
    // See DemandForecastChart.tsx for why this is absolutely positioned rather
    // than sized via height:100% as a normal-flow flex child.
    <div className="absolute inset-0 min-h-[172px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} barCategoryGap="24%" margin={{ top: 20, right: 4, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="ohOnHandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B95A5" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#CBD5E1" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="ohReplenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#4ADE80" stopOpacity={0.6} />
            </linearGradient>
          </defs>
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
          <Bar
            dataKey="onHand"
            stackId="stock"
            fill="url(#ohOnHandGrad)"
            radius={[0, 0, 2, 2]}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={(_, index) => onBarClick?.(index)}
          />
          <Bar
            dataKey="replenQty"
            stackId="stock"
            fill="url(#ohReplenGrad)"
            radius={[2, 2, 0, 0]}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={(_, index) => onBarClick?.(index)}
          >
            <LabelList dataKey="replenQty" content={TopMarker} />
          </Bar>
          <Line type="stepAfter" dataKey="rop" stroke="#D97706" strokeDasharray="4 3" strokeWidth={1.4} dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
