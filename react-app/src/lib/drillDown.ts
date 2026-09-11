import type { SkuRow } from '../types'
import type { DrillDownContext } from '../store/useDrillDownStore'

const isNum = (v: number | null | undefined): v is number => v !== null && v !== undefined && !isNaN(v)

export interface DemandSignalContribution {
  type: string
  units: number
}

export interface TopDemandSku {
  id: string
  name: string
  units: number
  deltaPct: number | null // null when there's no real prior-month value to compare against
}

export interface DemandStockWatchRow {
  id: string
  name: string
  onHand: number
  rop: number
  risk: 'critical' | 'watch'
}

export interface DemandDrillDown {
  monthLabel: string
  storeName: string
  scopeLabel: string // "All items" or the selected SKU's name
  baseline: number
  sensed: number
  upliftUnits: number
  upliftPct: number | null
  wowPct: number | null // null when there's no real prior month to compare against
  signals: DemandSignalContribution[]
  topSkus: TopDemandSku[] | null // null when a single SKU is already selected
  stockWatch: DemandStockWatchRow[]
  hasInv: boolean
  actions: { urgent: boolean; text: string }[]
}

export function buildDemandDrillDown(ctx: DrillDownContext, monthIndex: number): DemandDrillDown {
  const { store, selectedSku, labels, demandForecast, demandSensed } = ctx
  const baseline = demandForecast[monthIndex] ?? 0
  const sensed = demandSensed[monthIndex] ?? 0
  const upliftUnits = sensed - baseline
  const upliftPct = baseline > 0 ? (upliftUnits / baseline) * 100 : null

  const prevBaseline = monthIndex > 0 ? demandForecast[monthIndex - 1] : null
  const wowPct = isNum(prevBaseline) && prevBaseline > 0 ? ((baseline - prevBaseline) / prevBaseline) * 100 : null

  // Signal % is a store-wide figure (see parseDemand.ts) -- only decompose the
  // waterfall against it when the scope is the whole store, so "Sensed total"
  // in the breakdown actually sums from the rows above it instead of mixing
  // a store-wide % with a single SKU's own (possibly different) real uplift.
  const signals: DemandSignalContribution[] = selectedSku
    ? []
    : store.signals.filter((sg) => sg.on && sg.pct > 0).map((sg) => ({ type: sg.t, units: Math.round(baseline * (sg.pct / 100)) }))

  let topSkus: TopDemandSku[] | null = null
  if (!selectedSku) {
    topSkus = [...store.skus]
      .filter((sk) => sk.hasDemand && sk.forecast.length > monthIndex)
      .sort((a, b) => (b.forecast[monthIndex] ?? 0) - (a.forecast[monthIndex] ?? 0))
      .slice(0, 5)
      .map((sk) => {
        const units = sk.forecast[monthIndex] ?? 0
        const prev = monthIndex > 0 ? sk.forecast[monthIndex - 1] : null
        const deltaPct = isNum(prev) && prev > 0 ? ((units - prev) / prev) * 100 : null
        return { id: sk.id, name: sk.name, units, deltaPct }
      })
  }

  const scopeSkus: SkuRow[] = selectedSku ? [selectedSku] : store.skus
  const stockWatch: DemandStockWatchRow[] = scopeSkus
    .filter((sk) => sk.hasInv)
    .map((sk) => {
      const oh = sk.onHandSeries[monthIndex]
      const rop = sk.ropSeries[monthIndex]
      if (!isNum(oh) || !isNum(rop) || rop <= 0) return null
      const risk: DemandStockWatchRow['risk'] | null = oh < rop * 0.7 ? 'critical' : oh < rop ? 'watch' : null
      if (!risk) return null
      return { id: sk.id, name: sk.name, onHand: oh, rop, risk }
    })
    .filter((r): r is DemandStockWatchRow => r !== null)
    .sort((a, b) => (a.risk === 'critical' ? -1 : 1) - (b.risk === 'critical' ? -1 : 1))

  const critCount = stockWatch.filter((r) => r.risk === 'critical').length
  const watchCount = stockWatch.filter((r) => r.risk === 'watch').length
  const hasInv = scopeSkus.some((sk) => sk.hasInv)

  const actions: DemandDrillDown['actions'] = []
  if (critCount > 0) {
    actions.push({
      urgent: true,
      text: `${critCount} SKU${critCount > 1 ? 's' : ''} below 70% of ROP at ${labels[monthIndex]} — release replenishment.`,
    })
  }
  if (watchCount > 0) {
    actions.push({
      urgent: false,
      text: `${watchCount} SKU${watchCount > 1 ? 's' : ''} below ROP at ${labels[monthIndex]}. Monitor sell-through.`,
    })
  }
  if (upliftPct !== null && upliftPct > 4) {
    actions.push({
      urgent: false,
      text: `Demand sensing shows +${upliftPct.toFixed(1)}% uplift above baseline this month.`,
    })
  }
  if (!hasInv) {
    actions.push({ urgent: false, text: `ROP-based stock actions need on-hand inventory data for this scope, not available yet.` })
  } else if (actions.length === 0 || (critCount === 0 && watchCount === 0)) {
    actions.push({ urgent: false, text: `Stock position healthy for ${labels[monthIndex]}. No immediate action required.` })
  }

  return {
    monthLabel: labels[monthIndex],
    storeName: store.name,
    scopeLabel: selectedSku ? selectedSku.name : 'All items',
    baseline,
    sensed,
    upliftUnits,
    upliftPct,
    wowPct,
    signals,
    topSkus,
    stockWatch,
    hasInv,
    actions,
  }
}

export interface InvClassRow {
  id: string
  name: string
  units: number
  daysSupply: number | null
  monthsSupply: number | null
}

export interface InventoryDrillDown {
  monthLabel: string
  storeName: string
  scopeLabel: string
  totalUnits: number
  fast: InvClassRow[]
  slow: InvClassRow[]
  dead: InvClassRow[]
  actions: { urgent: boolean; text: string }[]
  hasData: boolean
}

export function buildInventoryDrillDown(ctx: DrillDownContext, monthIndex: number): InventoryDrillDown {
  const { store, selectedSku, labels } = ctx
  const scopeSkus: SkuRow[] = selectedSku ? [selectedSku] : store.skus

  const classified = scopeSkus
    .map((sk) => {
      const oh = sk.onHandSeries[monthIndex]
      if (!isNum(oh)) return null
      const dmd = sk.dmd // real monthly demand
      const monthsSupply = dmd > 0 ? oh / dmd : null
      const daysSupply = monthsSupply !== null ? Math.round(monthsSupply * 30) : null
      let cat: 'fast' | 'slow' | 'dead'
      if ((monthsSupply !== null && monthsSupply > 1.2) || sk.st === 'hold') cat = 'dead'
      else if ((monthsSupply !== null && monthsSupply > 0.5) || sk.st === 'redeploy') cat = 'slow'
      else cat = 'fast'
      return { id: sk.id, name: sk.name, units: oh, daysSupply, monthsSupply, cat }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const fast = classified.filter((r) => r.cat === 'fast')
  const slow = classified.filter((r) => r.cat === 'slow')
  const dead = classified.filter((r) => r.cat === 'dead')
  const totalUnits = classified.reduce((a, r) => a + r.units, 0)

  const actions: InventoryDrillDown['actions'] = []
  if (dead.length) {
    actions.push({
      urgent: true,
      text: `${dead.length} SKU${dead.length > 1 ? 's' : ''} carrying over a month of supply at ${labels[monthIndex]} — review for markdown or return to DC.`,
    })
  }
  if (slow.length) {
    actions.push({
      urgent: false,
      text: `${slow.length} slow-moving SKU${slow.length > 1 ? 's' : ''} over 2 weeks of supply. Consider redeployment or a targeted promotion.`,
    })
  }
  const critFast = fast.filter((r) => r.daysSupply !== null && r.daysSupply <= 5)
  if (critFast.length) {
    actions.push({
      urgent: true,
      text: `${critFast.length} fast-moving SKU${critFast.length > 1 ? 's' : ''} have ≤5 days of supply. Release replenishment.`,
    })
  }
  if (!actions.length && classified.length) {
    actions.push({ urgent: false, text: `Stock position balanced for ${labels[monthIndex]}. No immediate action required.` })
  }

  return {
    monthLabel: labels[monthIndex],
    storeName: store.name,
    scopeLabel: selectedSku ? selectedSku.name : 'All items',
    totalUnits,
    fast,
    slow,
    dead,
    actions,
    hasData: classified.length > 0,
  }
}
