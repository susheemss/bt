import { Truck, Package, ArrowRightLeft, ChevronRight } from 'lucide-react'
import AITag from './AITag'
import type { AiRec } from '../../types'

const REC_META: Record<string, { icon: React.ReactNode; tag: string }> = {
  order:    { icon: <Package size={13} />,        tag: 'DRP order' },
  consol:   { icon: <Truck size={13} />,          tag: 'Lane consolidation' },
  redeploy: { icon: <ArrowRightLeft size={13} />, tag: 'Redeploy' },
}

interface Props {
  recs: AiRec[]
  saving: string
  storeId: string
  onRelease?: () => void
}

export default function AIRecommendationStrip({ recs, saving, storeId, onRelease }: Props) {
  return (
    <section className="rounded-lg overflow-hidden border border-purple/25 bg-surface" style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
      {/* Gradient rail */}
      <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #6C5CE7, #2E6BE6, #6C5CE7)' }} />

      <div className="flex items-stretch">
        {/* Recommendations */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <AITag label="AI technology" />
            <span className="text-[11px] text-ink4">
              Recommendations · Store #{storeId} · confidence <span className="font-semibold text-ink3 num">94%</span>
            </span>
            <button className="ml-auto text-[11px] font-semibold text-purple hover:underline">
              View reasoning
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {recs.map((r, i) => {
              const m = REC_META[r.type]
              return (
                <div key={i} className="rounded-md border border-border bg-surface2/60 p-3 flex flex-col gap-1.5 hover:border-purple/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-purple">
                    {m.icon}
                    <span className="text-[10px] font-bold uppercase tracking-wide">{m.tag}</span>
                  </div>
                  <p className="text-[12px] text-ink2 leading-snug flex-1">{r.text}</p>
                  <div className="text-[11px] text-ink4 font-medium">{r.meta}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA rail */}
        <div className="w-[230px] flex-shrink-0 border-l border-border bg-purple-light/30 p-4 flex flex-col justify-center gap-1">
          <div className="text-[11px] font-medium text-ink4 uppercase tracking-wide">Est. freight saving</div>
          <div className="text-[26px] font-bold text-green leading-8 num" style={{ letterSpacing: '-0.02em' }}>{saving}</div>
          <div className="text-[11px] text-ink4 mb-3">per cycle vs un-optimised</div>
          <button onClick={onRelease} className="btn-purple w-full">
            Release DRP order to DC
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </section>
  )
}
