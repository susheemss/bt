import { useState } from 'react'
import { Truck, ShieldCheck, PackageCheck, Gauge, Container, CheckCircle2 } from 'lucide-react'
import KpiTile from '../components/kpi/KpiTile'
import Panel, { LegendDot } from '../components/ui/Panel'
import DemandForecastChart from '../components/charts/DemandForecastChart'
import DemandSensingChart from '../components/charts/DemandSensingChart'
import OnHandDRPChart from '../components/charts/OnHandDRPChart'
import InventoryGapChart from '../components/charts/InventoryGapChart'
import AIRecommendationStrip from '../components/ai/AIRecommendationStrip'
import { useAppStore, getSkuOptions } from '../store/useAppStore'
import { STORES } from '../data/stores'

export default function Overview() {
  const { currentStore, currentSkuFilter, setSkuFilter } = useAppStore()
  const store = STORES[currentStore]
  const kpis = store.kpis
  const skuOptions = getSkuOptions(currentStore)
  const [horizon, setHorizon] = useState<4 | 8>(8)
  const [released, setReleased] = useState(false)

  function handleRelease() {
    setReleased(true)
    setTimeout(() => setReleased(false), 3200)
  }

  // Filter-aware chart series
  let forecast = store.forecast
  let sensed = store.sensed
  let gap = store.gap

  if (currentSkuFilter !== 'all') {
    const sku = store.skus.find((s) => s.id === currentSkuFilter)
    if (sku) {
      const total = store.skus.reduce((a, s) => a + s.dmd, 0)
      const ratio = total > 0 ? sku.dmd / total : 1
      forecast = store.forecast.map((v) => Math.round(v * ratio))
      sensed = store.sensed.map((v) => Math.round(v * ratio))
      gap = store.gap.map((v) => Math.round(v * ratio))
    }
  }

  forecast = forecast.slice(0, horizon)
  sensed = sensed.slice(0, horizon)
  gap = gap.slice(0, horizon)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="field-label">SKU</span>
          <select
            value={currentSkuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            className="select min-w-[200px]"
          >
            {skuOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="field-label">Horizon</span>
          <div className="seg">
            {([4, 8] as const).map((h) => (
              <span
                key={h}
                className={`seg-item ${horizon === h ? 'seg-item-active' : ''}`}
                onClick={() => setHorizon(h)}
              >
                {h} weeks
              </span>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 text-[11px] text-ink4">
          <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
          Demand sensing live · last run 09:42
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3">
        <KpiTile
          label="Service level" value={kpis.sl}
          delta={kpis.slD} deltaClass={kpis.slC}
          icon={<ShieldCheck size={15} />}
          spark={store.sensed.map((s, i) => s / (store.forecast[i] || 1))}
          sparkColor="#1A8754"
        />
        <KpiTile
          label="Fill rate" value={kpis.fr}
          delta={kpis.frD} deltaClass={kpis.frC}
          icon={<PackageCheck size={15} />}
          spark={store.forecast}
          sparkColor="#8B95A5"
        />
        <KpiTile
          label="Capacity utilisation" value={kpis.cu}
          delta={kpis.cuD} deltaClass={kpis.cuC}
          icon={<Gauge size={15} />}
        />
        <KpiTile
          label="In-transit units" value={kpis.it}
          delta={kpis.itD} deltaClass={kpis.itC}
          icon={<Container size={15} />}
        />
        <KpiTile
          label="Transportation cost MTD" value={kpis.tc}
          delta={kpis.tcD} deltaClass={kpis.tcC}
          highlight icon={<Truck size={15} />}
          spark={[...store.gap].reverse().map((g) => Math.abs(g))}
          sparkColor="#2E6BE6"
        />
      </div>

      {/* Chart panels */}
      <div className="grid grid-cols-4 gap-3">
        <Panel
          title="Demand forecast — baseline"
          subtitle={`Units per week · W1–W${horizon}`}
          legend={
            <>
              <LegendDot color="#2E6BE6" label="Baseline" />
              <LegendDot color="#6C5CE7" label="Uplift" />
            </>
          }
        >
          <DemandForecastChart forecast={forecast} sensed={sensed} />
        </Panel>

        <Panel
          title="Demand sensing vs baseline"
          subtitle="Sensed demand · AI technology"
          badge={
            <span className="chip bg-green-light text-green font-bold num">+{store.uplift.toFixed(1)}%</span>
          }
          legend={
            <>
              <LegendDot color="#8B95A5" label="Baseline" dashed />
              <LegendDot color="#6C5CE7" label="Sensed" />
            </>
          }
        >
          <DemandSensingChart forecast={forecast} sensed={sensed} />
        </Panel>

        <Panel
          title="On-hand inventory — DRP"
          subtitle="Projected draw-down vs ROP"
          legend={
            <>
              <LegendDot color="#2E6BE6" label="On-hand" />
              <LegendDot color="#C93B3B" label="Below ROP" />
            </>
          }
        >
          <OnHandDRPChart gap={gap} rop={store.rop} onHand={store.onHand} />
        </Panel>

        <Panel
          title="Inventory gap / net requirement"
          subtitle="Below zero = shortfall"
          legend={
            <>
              <LegendDot color="#2E6BE6" label="Surplus" />
              <LegendDot color="#C93B3B" label="Shortfall" />
            </>
          }
        >
          <InventoryGapChart gap={gap} />
        </Panel>
      </div>

      {/* AI recommendation strip */}
      <AIRecommendationStrip
        recs={store.aiRecs}
        saving={store.saving}
        storeId={currentStore}
        onRelease={handleRelease}
      />

      {released && (
        <div className="toast">
          <CheckCircle2 size={15} className="text-green" />
          DRP order released to DC · Store #{currentStore}
        </div>
      )}
    </div>
  )
}
