import AITag from '../ai/AITag'
import type { LiveStore } from '../../types'
import { fmtExact } from '../../utils/supplyChain'

const SIGNAL_COLORS: Record<string, string> = {
  Promo: 'bg-blue-light text-blue-dark',
  Weather: 'bg-amber-light text-amber',
  Festival: 'bg-purple-light text-purple',
  Trend: 'bg-green-light text-green',
  Event: 'bg-surface3 text-ink3',
}

interface Props {
  store: LiveStore
  customerFilter: string
}

export default function StoreSummaryCard({ store, customerFilter }: Props) {
  const activeSignals = store.signals.filter((s) => s.on)

  return (
    <div className="panel p-4 flex flex-col gap-4 h-full">
      <div>
        <div className="text-[15px] font-bold text-ink tracking-tight">{store.name}</div>
        <div className="text-[11px] text-ink4 mt-1">{store.weekKeys.length} month{store.weekKeys.length === 1 ? '' : 's'} of demand history</div>
        {customerFilter !== 'all' && (
          <span className="chip bg-blue-light text-blue-dark font-semibold mt-2 inline-flex">{customerFilter}</span>
        )}
      </div>

      {/* Real inventory stats -- shown only when the file actually has a row for this store/customer */}
      {store.hasInv ? (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'On-hand', value: fmtExact(store.onHand) },
            { label: 'ROP', value: fmtExact(store.rop) },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface2 border border-border rounded-md px-2.5 py-2">
              <div className="text-[9.5px] text-ink4 uppercase tracking-wide font-semibold">{stat.label}</div>
              <div className="text-[14px] font-bold text-ink num mt-0.5">{stat.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border2 bg-surface2/60 px-3 py-2.5 text-[11px] text-ink4 leading-relaxed">
          On-hand and ROP need inventory data for this store{customerFilter !== 'all' ? ' / customer' : ''}, not available yet.
        </div>
      )}

      {/* Active demand signals */}
      <div>
        <div className="field-label uppercase tracking-wide mb-1.5">Active demand signals</div>
        {activeSignals.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {activeSignals.map((s) => (
              <span key={s.t} className={`chip font-semibold ${SIGNAL_COLORS[s.t] ?? 'bg-surface3 text-ink3'}`}>
                {s.t} <span className="num">+{s.pct.toFixed(1)}%</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-ink4">No active signals this horizon</div>
        )}
      </div>

      {/* AI note -- real uplift, computed from Promo Units vs Baseline in the latest month */}
      <div className="mt-auto rounded-md border border-dashed border-purple/45 bg-purple-light/30 p-3">
        <AITag label="AI-Powered sensing" />
        <p className="text-[11.5px] text-ink3 leading-relaxed mt-2">
          AI technology detects <span className="font-bold text-purple num">{store.uplift >= 0 ? '+' : ''}{store.uplift.toFixed(1)}%</span> demand
          uplift vs baseline this horizon.
        </p>
      </div>
    </div>
  )
}
