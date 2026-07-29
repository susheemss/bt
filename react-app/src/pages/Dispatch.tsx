import { useState } from 'react'
import { CheckCircle2, Truck, Container, Gauge, ShieldCheck } from 'lucide-react'
import KpiTile from '../components/kpi/KpiTile'
import ReplenishmentPlanTable from '../components/tables/ReplenishmentPlanTable'
import AIRationalePanel from '../components/ai/AIRationalePanel'
import { REPLENISHMENT_LANES, NETWORK_KPIS } from '../data/stores'

export default function Dispatch() {
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState('')
  const n = NETWORK_KPIS

  const allApproved = approvedIds.size === REPLENISHMENT_LANES.length

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3200)
  }

  function toggleLane(storeId: string) {
    setApprovedIds((prev) => {
      const next = new Set(prev)
      if (next.has(storeId)) next.delete(storeId)
      else {
        next.add(storeId)
        showToast(`DRP order released to DC · lane DC → #${storeId}`)
      }
      return next
    })
  }

  function approveAll() {
    setApprovedIds(new Set(REPLENISHMENT_LANES.map((l) => l.storeId)))
    showToast('All 5 lanes approved · DRP orders released to DC')
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[11.5px] text-ink4">
            Cycle W28 · consolidated plan · <span className="font-semibold text-ink3">5 lanes, 1 DC</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink4 mr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple" />
          AI-optimised 09:42 · objective: min. transportation cost @ 98% SL
        </div>
        <button
          onClick={approveAll}
          disabled={allApproved}
          className={allApproved ? 'btn bg-green-light text-green cursor-default' : 'btn-green'}
        >
          {allApproved ? (<><CheckCircle2 size={14} /> All lanes approved</>) : (<><Truck size={14} /> Approve all lanes</>)}
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <KpiTile
          label="Transportation cost — week"
          value={n.transportCostWeek}
          delta={n.transportCostDelta} deltaClass="delta-up"
          highlight icon={<Truck size={15} />}
        />
        <KpiTile
          label="Avg truck utilisation"
          value={n.avgTruckUtil}
          delta={n.avgTruckUtilDelta} deltaClass="delta-up"
          sub="vs unoptimised"
          icon={<Gauge size={15} />}
        />
        <KpiTile
          label="LTL / expedite loads"
          value={String(n.ltlLoads)}
          delta={n.ltlLoadsDelta} deltaClass="delta-up"
          sub="this cycle"
          icon={<Container size={15} />}
        />
        <KpiTile
          label="Capacity-feasible"
          value={n.capacityFeasible}
          sub="all lanes within open-to-ship headroom"
          icon={<ShieldCheck size={15} />}
        />
      </div>

      {/* Plan + rationale */}
      <div className="grid grid-cols-[1fr_330px] gap-4 items-stretch">
        <div className="min-w-0">
          <ReplenishmentPlanTable
            lanes={REPLENISHMENT_LANES}
            approvedIds={approvedIds}
            onToggle={toggleLane}
          />
        </div>
        <AIRationalePanel />
      </div>

      {toast && (
        <div className="toast">
          <CheckCircle2 size={15} className="text-green" />
          {toast}
        </div>
      )}
    </div>
  )
}
