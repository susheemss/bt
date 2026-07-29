import { MapPin, Clock } from 'lucide-react'
import AITag from '../ai/AITag'
import type { Store } from '../../types'

const SIGNAL_COLORS: Record<string, string> = {
  Promo:    'bg-blue-light text-blue-dark',
  Weather:  'bg-amber-light text-amber',
  Festival: 'bg-purple-light text-purple',
  Trend:    'bg-green-light text-green',
  Event:    'bg-surface3 text-ink3',
}

interface Props {
  store: Store
}

export default function StoreSummaryCard({ store }: Props) {
  const activeSignals = store.signals.filter((s) => s.on)
  const capColor = store.capPct > 85 ? '#C93B3B' : store.capPct > 70 ? '#D97706' : '#2E6BE6'

  return (
    <div className="panel p-4 flex flex-col gap-4 h-full">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-ink4 bg-surface2 border border-border rounded px-1.5 py-0.5 num">#{store.id}</span>
          <span className="chip bg-surface2 text-ink3 border border-border">Format {store.format}</span>
        </div>
        <div className="text-[15px] font-bold text-ink tracking-tight mt-2">{store.name.split(' — ')[0]}</div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-ink4">
          <span className="inline-flex items-center gap-1"><MapPin size={11} />{store.name.split(' — ')[1] ?? ''}</span>
          <span className="inline-flex items-center gap-1"><Clock size={11} />Lead time {store.lead}d</span>
        </div>
      </div>

      {/* Capacity */}
      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="field-label">Capacity utilisation</span>
          <span className="text-[13px] font-bold num" style={{ color: capColor }}>{store.capPct}%</span>
        </div>
        <div className="meter !h-2">
          <div style={{ width: `${store.capPct}%`, background: capColor }} />
        </div>
        <div className="flex justify-between text-[10.5px] text-ink4 mt-1 num">
          <span>{store.onHand.toLocaleString()} on-hand</span>
          <span>{store.maxCap.toLocaleString()} max</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'On-hand',              value: store.onHand.toLocaleString() },
          { label: 'In-transit',           value: store.inTransit.toLocaleString() },
          { label: 'Open-to-ship',         value: store.ots.toLocaleString() },
          { label: 'Target service level', value: '98%' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface2 border border-border rounded-md px-2.5 py-2">
            <div className="text-[9.5px] text-ink4 uppercase tracking-wide font-semibold">{stat.label}</div>
            <div className="text-[14px] font-bold text-ink num mt-0.5">{stat.value}</div>
          </div>
        ))}
      </div>

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

      {/* AI note */}
      <div className="mt-auto rounded-md border border-dashed border-purple/45 bg-purple-light/30 p-3">
        <AITag label="AI-Powered sensing" />
        <p className="text-[11.5px] text-ink3 leading-relaxed mt-2">
          AI technology detects <span className="font-bold text-purple num">+{store.uplift.toFixed(1)}%</span> demand
          uplift vs baseline this horizon.
        </p>
      </div>
    </div>
  )
}
