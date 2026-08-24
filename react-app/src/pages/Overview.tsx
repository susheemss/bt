import Panel, { LegendDot } from '../components/ui/Panel'
import PendingNote from '../components/ui/PendingNote'
import DemandForecastChart from '../components/charts/DemandForecastChart'
import DemandSensingChart from '../components/charts/DemandSensingChart'
import OnHandDRPChart from '../components/charts/OnHandDRPChart'
import InventoryGapChart from '../components/charts/InventoryGapChart'
import AITag from '../components/ai/AITag'
import { useAppStore } from '../store/useAppStore'
import { useStoreView, useDemandView } from '../hooks/useStoreView'
import { Sparkles } from 'lucide-react'

export default function Overview() {
  const currentStore = useAppStore((s) => s.currentStore)
  const currentSkuFilter = useAppStore((s) => s.currentSkuFilter)
  const currentCustomerFilter = useAppStore((s) => s.currentCustomerFilter)
  const horizon = useAppStore((s) => s.horizon)
  const refresh = useAppStore((s) => s.refresh)

  const store = useStoreView(currentStore)
  const demand = useDemandView(currentStore)

  if (!store || !demand) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <PendingNote>
          {refresh.status === 'loading'
            ? 'Loading live data from the configured source files…'
            : 'No data loaded yet. Use Refresh in the top bar, or visit Data Hub for details on the expected file format.'}
        </PendingNote>
      </div>
    )
  }

  const n = Math.min(horizon, store.weekKeys.length)
  const labels = Array.from({ length: n }, (_, i) => `M${i + 1}`)
  const forecast = demand.forecast.slice(0, n)
  const sensed = demand.sensed.slice(0, n)

  // Chart 3/4 respect the SKU filter -- otherwise "replenishment" could
  // reflect a completely different SKU's reorder landing in the same month.
  const selectedSku = currentSkuFilter === 'all' ? null : store.skus.find((s) => s.id === currentSkuFilter) ?? null
  const onHandSeries = (selectedSku ? selectedSku.onHandSeries : store.onHandSeries).slice(0, n)
  const replenQtySeries = (selectedSku ? selectedSku.replenQtySeries : store.replenQtySeries).slice(0, n)
  const ropSeries = (selectedSku ? selectedSku.ropSeries : store.ropSeries).slice(0, n)
  const gapSeries = (selectedSku ? selectedSku.gapSeries : store.gap).slice(0, n)

  return (
    <div className="space-y-4">
      {demand.customerScopeMismatch && (
        <PendingNote>
          <b className="text-ink3">Showing all customers.</b> The demand file has no rows for{' '}
          <b>{currentCustomerFilter}</b> — demand charts are store-wide here, while the inventory panels below stay
          filtered to that customer.
        </PendingNote>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Panel
          title="Demand forecast"
          subtitle={`Units / month · baseline vs AI sensed uplift · M1–M${n}`}
          legend={<><LegendDot color="#2E6BE6" label="Baseline" /><LegendDot color="#6C5CE7" label="AI uplift" /></>}
        >
          <DemandForecastChart labels={labels} forecast={forecast} sensed={sensed} />
        </Panel>

        <Panel
          title="Demand sensing vs baseline"
          subtitle="Monthly overlay · dashed = baseline, solid = sensed"
          badge={<span className="chip bg-purple-light text-purple font-bold num">{demand.uplift >= 0 ? '+' : ''}{demand.uplift.toFixed(1)}%</span>}
          legend={<><LegendDot color="#8B95A5" label="Baseline" dashed /><LegendDot color="#6C5CE7" label="Sensed" /></>}
        >
          <DemandSensingChart labels={labels} forecast={forecast} sensed={sensed} />
        </Panel>

        <Panel
          title="On-hand inventory"
          subtitle={`M1–M${n} · from your inventory file`}
          legend={<><LegendDot color="#94A3B8" label="On-hand" /><LegendDot color="#16A34A" label="Replen qty" /></>}
        >
          <OnHandDRPChart labels={labels} onHandSeries={onHandSeries} replenQtySeries={replenQtySeries} ropSeries={ropSeries} />
        </Panel>

        <Panel
          title="Inventory gap / net requirement"
          subtitle="On-hand minus ROP, from your inventory file"
          legend={<><LegendDot color="#16A34A" label="Surplus" /><LegendDot color="#DC2626" label="Shortfall" /></>}
        >
          <InventoryGapChart labels={labels} gap={gapSeries} />
        </Panel>
      </div>

      {/* AI recommendation strip -- honest empty state. Nothing in either
          source file gives freight cost or truck capacity, so this panel
          has never had real recommendations to show; it stays a clearly
          labelled preview of what it will do once that data exists. */}
      <section className="rounded-lg overflow-hidden border border-purple/25 bg-surface">
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #6C5CE7, #2E6BE6, #6C5CE7)' }} />
        <div className="p-4 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5">
              <AITag label="AI technology" />
              <span className="text-[11px] text-ink4">Replenishment recommendations</span>
            </div>
            <PendingNote>
              AI replenishment recommendations need <b className="text-ink3">on-hand inventory and freight-cost data</b> together
              to compute lane consolidation and redeploy suggestions — freight cost isn't available yet.
            </PendingNote>
          </div>
          <div className="w-[210px] flex-shrink-0 border-l border-border pl-4 flex flex-col justify-center gap-1">
            <div className="text-[11px] font-medium text-ink4 uppercase tracking-wide">Est. freight saving</div>
            <div className="text-[22px] font-bold text-ink5 leading-7 num">—</div>
            <div className="text-[11px] text-ink4 mb-3">per cycle vs un-optimised</div>
            <button className="btn-purple w-full opacity-40 cursor-not-allowed" disabled>
              <Sparkles size={13} /> Release DRP order to DC
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
