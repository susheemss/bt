import type { LiveStore, SkuStatus } from '../types'

/* Pure aggregation over the already-joined, network-wide store data (same
   join buildChatPayload uses for the chat assistant) -- nothing here reads
   from any UI filter, since the report is always a whole-network snapshot.
   Every number below is either read directly from a SkuRow/LiveStore field
   or a straightforward sum/min of real fields -- nothing invented, nothing
   estimated, matching the app's data-honesty rule everywhere else. */

export interface StatusCounts {
  ok: number
  low: number
  replenish: number
  hold: number
  redeploy: number
}

const EMPTY_COUNTS: StatusCounts = { ok: 0, low: 0, replenish: 0, hold: 0, redeploy: 0 }

function countStatuses(stores: LiveStore[]): StatusCounts {
  const counts = { ...EMPTY_COUNTS }
  stores.forEach((store) => {
    store.skus.forEach((sk) => {
      if (!sk.hasInv || !sk.st) return
      counts[sk.st] += 1
    })
  })
  return counts
}

export interface StoreStatusRow {
  storeName: string
  totalSkus: number
  counts: StatusCounts
}

export interface CriticalSkuRow {
  storeName: string
  skuName: string
  onHand: number
  rop: number
  netRequirement: number
  status: SkuStatus
}

export interface RedeployMatch {
  skuId: string
  skuName: string
  sourceStore: string
  targetStore: string
  sourceSurplus: number
  targetShortfall: number
  suggestedQty: number
}

/** Greedy per-SKU allocation of real surplus (on-hand − ROP at a Redeploy-
 *  flagged store) against real shortfall (net requirement at a Replenish/Low
 *  store) -- conserves units (a source's surplus is never promised to more
 *  than it actually has), same definitions chat_backend.py's redeploy tools
 *  use, reimplemented here in TS so the report never depends on the LLM
 *  backend or an API key being configured. */
export function findRedeployMatches(stores: LiveStore[]): RedeployMatch[] {
  interface Src { storeName: string; skuName: string; surplus: number }
  interface Tgt { storeName: string; skuName: string; shortfall: number }
  const sourcesBySku: Record<string, Src[]> = {}
  const targetsBySku: Record<string, Tgt[]> = {}

  stores.forEach((store) => {
    store.skus.forEach((sk) => {
      if (!sk.hasInv || !sk.st) return
      if (sk.st === 'redeploy') {
        const surplus = (sk.oh ?? 0) - (sk.rop ?? 0)
        if (surplus > 0) (sourcesBySku[sk.id] ??= []).push({ storeName: store.name, skuName: sk.name, surplus })
      } else if (sk.st === 'replenish' || sk.st === 'low') {
        const shortfall = sk.nr ?? 0
        if (shortfall > 0) (targetsBySku[sk.id] ??= []).push({ storeName: store.name, skuName: sk.name, shortfall })
      }
    })
  })

  const matches: RedeployMatch[] = []
  Object.keys(sourcesBySku).forEach((skuId) => {
    const targets = targetsBySku[skuId]
    if (!targets?.length) return
    const sources = [...sourcesBySku[skuId]].sort((a, b) => b.surplus - a.surplus)
    const tgts = [...targets].sort((a, b) => b.shortfall - a.shortfall)
    let si = 0, ti = 0
    let sRemain = sources[0].surplus
    let tRemain = tgts[0].shortfall
    while (si < sources.length && ti < tgts.length) {
      const qty = Math.min(sRemain, tRemain)
      if (qty > 0) {
        matches.push({
          skuId,
          skuName: sources[si].skuName,
          sourceStore: sources[si].storeName,
          targetStore: tgts[ti].storeName,
          sourceSurplus: sources[si].surplus,
          targetShortfall: tgts[ti].shortfall,
          suggestedQty: qty,
        })
      }
      sRemain -= qty
      tRemain -= qty
      if (sRemain <= 0 && ++si < sources.length) sRemain = sources[si].surplus
      if (tRemain <= 0 && ++ti < tgts.length) tRemain = tgts[ti].shortfall
    }
  })
  return matches
}

export interface NetworkDemandTrend {
  labels: string[]
  baseline: number[]
  sensed: number[]
}

/** Sums each store's real forecast/sensed onto a shared month axis, matched
 *  by the month label itself (not raw index) -- a store missing a month
 *  simply contributes nothing to it, same alignment principle
 *  joinInventory.ts uses for the inventory series. */
function aggregateDemandTrend(stores: LiveStore[]): NetworkDemandTrend {
  const withDemand = stores.filter((s) => s.weekKeys.length > 0)
  const axis = withDemand.reduce((longest, s) => (s.weekKeys.length > longest.length ? s.weekKeys : longest), [] as string[])
  const baseline = new Array(axis.length).fill(0)
  const sensed = new Array(axis.length).fill(0)
  withDemand.forEach((store) => {
    store.weekKeys.forEach((wk, i) => {
      const axisIdx = axis.indexOf(wk)
      if (axisIdx === -1) return
      baseline[axisIdx] += store.forecast[i] ?? 0
      sensed[axisIdx] += store.sensed[i] ?? 0
    })
  })
  return { labels: axis, baseline, sensed }
}

export interface DataCoverage {
  storeName: string
  hasDemand: boolean
  hasInv: boolean
  hasSensing: boolean
}

export interface ReportData {
  generatedAt: Date
  storeCount: number
  skuPositionCount: number
  networkCounts: StatusCounts
  perStore: StoreStatusRow[]
  criticalSkus: CriticalSkuRow[]
  redeployMatches: RedeployMatch[]
  demandTrend: NetworkDemandTrend
  networkUpliftPct: number | null
  coverage: DataCoverage[]
}

export function buildReportData(joinedStores: Record<string, LiveStore>): ReportData {
  const stores = Object.values(joinedStores)

  const perStore: StoreStatusRow[] = stores.map((store) => ({
    storeName: store.name,
    totalSkus: store.skus.length,
    counts: countStatuses([store]),
  }))

  const criticalSkus: CriticalSkuRow[] = []
  stores.forEach((store) => {
    store.skus.forEach((sk) => {
      if (sk.hasInv && (sk.st === 'low' || sk.st === 'replenish')) {
        criticalSkus.push({
          storeName: store.name,
          skuName: sk.name,
          onHand: sk.oh ?? 0,
          rop: sk.rop ?? 0,
          netRequirement: sk.nr ?? 0,
          status: sk.st,
        })
      }
    })
  })
  // Most urgent first: Low (closer to stockout) before Replenish, then by largest gap.
  criticalSkus.sort((a, b) => (a.status === b.status ? b.netRequirement - a.netRequirement : a.status === 'low' ? -1 : 1))

  const demandTrend = aggregateDemandTrend(stores)
  const latest = demandTrend.baseline.length - 1
  const networkUpliftPct =
    latest >= 0 && demandTrend.baseline[latest] > 0
      ? ((demandTrend.sensed[latest] - demandTrend.baseline[latest]) / demandTrend.baseline[latest]) * 100
      : null

  return {
    generatedAt: new Date(),
    storeCount: stores.length,
    skuPositionCount: stores.reduce((a, s) => a + s.skus.length, 0),
    networkCounts: countStatuses(stores),
    perStore,
    criticalSkus,
    redeployMatches: findRedeployMatches(stores),
    demandTrend,
    networkUpliftPct,
    coverage: stores.map((s) => ({ storeName: s.name, hasDemand: s.weekKeys.length > 0, hasInv: s.hasInv, hasSensing: s.hasSensing })),
  }
}
