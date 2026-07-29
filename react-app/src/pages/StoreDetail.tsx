import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, Truck, CheckCircle2 } from 'lucide-react'
import StoreSummaryCard from '../components/store/StoreSummaryCard'
import SkuTable from '../components/tables/SkuTable'
import AITag from '../components/ai/AITag'
import { useAppStore } from '../store/useAppStore'
import { STORES } from '../data/stores'
import type { StoreId } from '../types'

export default function StoreDetail() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const setStore = useAppStore((s) => s.setStore)
  const [released, setReleased] = useState(false)

  const id = (storeId ?? '0142') as StoreId
  const store = STORES[id] ?? STORES['0142']

  useEffect(() => {
    setStore(id)
  }, [id, setStore])

  const flagged = store.skus.filter((s) => s.st === 'replenish' || s.st === 'low')
  const totalReplenUnits = flagged.reduce((a, s) => a + s.rq, 0)
  const truckFill = Math.min(Math.round(56 + (totalReplenUnits / Math.max(store.ots, 1)) * 40), 98)

  function handleRelease() {
    setReleased(true)
    setTimeout(() => setReleased(false), 3200)
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[11.5px] text-ink4">
        <button onClick={() => navigate('/overview')} className="hover:text-blue font-medium">
          Network overview
        </button>
        <ChevronRight size={12} />
        <span className="text-ink2 font-semibold">Store #{id} · SKU replenishment detail</span>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-ink4">
          <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
          POS sell-through live
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[264px_1fr] gap-4 items-start">
        <StoreSummaryCard store={store} />

        <div className="space-y-3">
          <SkuTable skus={store.skus} />

          {/* AI footer bar */}
          <div className="rounded-lg border border-dashed border-purple/45 bg-purple-light/25 px-4 py-3 flex items-center gap-3 flex-wrap">
            <AITag />
            <span className="text-[12px] text-ink2 flex-1 min-w-[280px]">
              <span className="font-bold num">{flagged.length} SKUs</span> flagged for replenishment
              <span className="text-ink4 mx-1.5">·</span>
              consolidated lane <span className="font-semibold">DC → #{id}</span>
              <span className="text-ink4 mx-1.5">·</span>
              truck fill <span className="font-bold text-green num">{truckFill}%</span>
            </span>
            <button className="btn-purple" onClick={handleRelease}>
              <Truck size={13} /> Auto-release to DC
            </button>
          </div>
        </div>
      </div>

      {released && (
        <div className="toast">
          <CheckCircle2 size={15} className="text-green" />
          DRP order auto-released to DC · Store #{id}
        </div>
      )}
    </div>
  )
}
