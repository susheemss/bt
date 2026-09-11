import { ChevronLeft } from 'lucide-react'
import { useDrillDownStore } from '../../store/useDrillDownStore'
import DemandDrillDownContent from './DemandDrillDownContent'
import InventoryDrillDownContent from './InventoryDrillDownContent'

export default function DrillDownPanel() {
  const open = useDrillDownStore((s) => s.open)
  const kind = useDrillDownStore((s) => s.kind)
  const monthIndex = useDrillDownStore((s) => s.monthIndex)
  const ctx = useDrillDownStore((s) => s.context)
  const close = useDrillDownStore((s) => s.close)

  if (!ctx || !kind) return null
  const monthLabel = ctx.labels[monthIndex] ?? ''
  const scopeLabel = ctx.selectedSku ? ctx.selectedSku.name : 'All items'

  return (
    <>
      <div
        className={`fixed inset-0 bg-ink/25 backdrop-blur-[2px] z-[100] transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={close}
      />
      <div
        className={`fixed top-0 right-0 h-full w-[420px] max-w-[92vw] bg-surface z-[110] shadow-2xl flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="px-5 py-4 border-b border-border flex-shrink-0">
          <button onClick={close} className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue mb-2 hover:opacity-70">
            <ChevronLeft size={14} />
            Close
          </button>
          <div className="text-[17px] font-bold text-ink tracking-tight">
            {monthLabel} — {kind === 'demand' ? 'Demand detail' : 'Inventory detail'}
          </div>
          <div className="text-[12px] text-ink4 mt-0.5">{ctx.store.name} · {scopeLabel}</div>
        </div>
        <div className="flex-1 overflow-y-auto pb-8">
          {kind === 'demand' ? <DemandDrillDownContent ctx={ctx} monthIndex={monthIndex} /> : <InventoryDrillDownContent ctx={ctx} monthIndex={monthIndex} />}
        </div>
      </div>
    </>
  )
}
