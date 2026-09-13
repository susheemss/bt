import Panel, { LegendDot } from '../components/ui/Panel'
import PendingNote from '../components/ui/PendingNote'
import DemandForecastChart from '../components/charts/DemandForecastChart'
import DemandSensingChart from '../components/charts/DemandSensingChart'
import OnHandDRPChart from '../components/charts/OnHandDRPChart'
import InventoryGapChart from '../components/charts/InventoryGapChart'
import { useAppStore } from '../store/useAppStore'
import { useStoreView, useDemandView } from '../hooks/useStoreView'
import { useDrillDownStore } from '../store/useDrillDownStore'

export default function Overview() {
  const currentStore = useAppStore((s) => s.currentStore)
  const currentSkuFilter = useAppStore((s) => s.currentSkuFilter)
  const currentCustomerFilter = useAppStore((s) => s.currentCustomerFilter)
  const horizon = useAppStore((s) => s.horizon)
  const refresh = useAppStore((s) => s.refresh)
  const openDrillDown = useDrillDownStore((s) => s.openDrillDown)

  const store = useStoreView(currentStore)
  const demand = useDemandView(currentStore)

  if (!store || !demand) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <PendingNote>
          {refresh.status === 'loading'
            ? 'Loading live data from the configured source files…'
            : 'No data loaded yet. Use Refresh in the top bar to load it.'}
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

  // Chart 2 is a separate live source (Total Demand / Sensed Forecast) from
  // chart1's Baseline/Promo demand file -- also SKU-filter-aware, same
  // reasoning as chart3/4.
  const sensingForecast = (selectedSku ? selectedSku.sensingForecast : store.sensingForecast).slice(0, n)
  const sensingSensed = (selectedSku ? selectedSku.sensingSensed : store.sensingSensed).slice(0, n)

  const drillDownCtx = {
    store,
    selectedSku,
    labels,
    demandForecast: forecast,
    demandSensed: sensed,
    onHandSeries,
    replenQtySeries,
    ropSeries,
  }
  const handleDemandBarClick = (i: number) => openDrillDown('demand', i, drillDownCtx)
  const handleInventoryBarClick = (i: number) => openDrillDown('inventory', i, drillDownCtx)

  return (
    <div className="h-full flex flex-col gap-4">
      {demand.customerScopeMismatch && (
        <PendingNote>
          <b className="text-ink3">Showing all customers.</b> The demand file has no rows for{' '}
          <b>{currentCustomerFilter}</b> — demand charts are store-wide here, while the inventory panels below stay
          filtered to that customer.
        </PendingNote>
      )}

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <Panel
          title="Demand forecast"
          subtitle="Units / month · baseline vs AI sensed uplift · click any bar to drill down"
          legend={<><LegendDot color="#8B95A5" label="Baseline" /><LegendDot color="#2E6BE6" label="AI uplift" /></>}
        >
          <DemandForecastChart labels={labels} forecast={forecast} sensed={sensed} onBarClick={handleDemandBarClick} />
        </Panel>

        <Panel
          title="Demand sensing vs baseline"
          legend={<><LegendDot color="#8B95A5" label="Total demand" dashed /><LegendDot color="#6C5CE7" label="Sensed forecast" /></>}
        >
          <DemandSensingChart labels={labels} sensed={sensingSensed} totalDemand={sensingForecast} />
        </Panel>

        <Panel
          title="On-hand inventory"
          subtitle="From your inventory file · click any bar to drill down"
          legend={<><LegendDot color="#94A3B8" label="On-hand" /><LegendDot color="#16A34A" label="Replen qty" /></>}
        >
          <OnHandDRPChart labels={labels} onHandSeries={onHandSeries} replenQtySeries={replenQtySeries} ropSeries={ropSeries} onBarClick={handleInventoryBarClick} />
        </Panel>

        <Panel
          title="Inventory gap / net requirement"
          subtitle="On-hand minus ROP, from your inventory file"
          legend={<><LegendDot color="#16A34A" label="Surplus" /><LegendDot color="#DC2626" label="Shortfall" /></>}
        >
          <InventoryGapChart labels={labels} gap={gapSeries} />
        </Panel>
      </div>
    </div>
  )
}
