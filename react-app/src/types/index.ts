/* Types for the live-data model. StoreId is a plain string (the store
   roster comes entirely from whatever Store Name values are in the
   uploaded demand file, not a fixed enum) -- there is no fixed network
   size or fixed store list baked into the app. */

export type SkuStatus = 'replenish' | 'low' | 'ok' | 'hold' | 'redeploy'
export type ShipmentMode = 'FTL' | 'FTL_CONSOL' | 'MILK_RUN'
export type SignalType = 'Promo' | 'Weather' | 'Festival' | 'Trend' | 'Event'
export type DeltaClass = 'delta-up' | 'delta-down' | 'delta-neu'

export interface DemandSignal {
  t: SignalType
  pct: number
  on: boolean
}

/* A month value that may be null: the inventory file simply has no row for
   that month (a genuine gap), never coerced to zero. */
export type Series = (number | null)[]

export interface CustomerSkuPoint {
  dmd: number
  forecast: number[]
  sensed: number[]
  uplift: number
}

export interface SkuRow {
  id: string
  name: string
  hasDemand: boolean
  hasInv: boolean
  dmd: number
  forecast: number[]
  sensed: number[]
  uplift: number
  oh: number | null
  ss: number | null
  rop: number | null
  nr: number | null
  rq: number | null
  st: SkuStatus | null
  onHandSeries: Series
  ropSeries: Series
  replenQtySeries: Series
  gapSeries: Series
}

export interface LiveStore {
  id: string
  name: string
  weekKeys: string[]
  forecast: number[]
  sensed: number[]
  uplift: number
  signals: DemandSignal[]
  skus: SkuRow[]
  demandCustomers: string[]
  invCustomers: string[]
  customerSkuSeries: Record<string, Record<string, CustomerSkuPoint>>
  hasInv: boolean
  onHand: number | null
  rop: number | null
  onHandSeries: Series
  ropSeries: Series
  replenQtySeries: Series
  gap: Series
}

/** Shape for a future real AI recommendation (order / lane consolidation /
 *  redeploy). Not populated anywhere today -- kept so AIRecommendationStrip
 *  can be dropped back in the moment freight-cost data makes this real. */
export interface AiRec {
  type: 'order' | 'consol' | 'redeploy'
  text: string
  meta: string
}

/* Network-level dispatch concepts (CLAUDE.md section 5, Screen 3). Nothing
   in either source file gives freight cost, truck capacity, or lane
   assignment, so this always renders as an honest "awaiting data" state --
   the shape exists so it's ready the day that data arrives, same principle
   as every other pending panel in this app. */
export interface ReplenishmentLane {
  storeId: string
  storeName: string
  skuCount: number
  totalUnits: number
  truckFillPct: number
  mode: ShipmentMode
  freightCost: number
  vsBaselinePct: number
  approved: boolean
}

export interface RefreshState {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
  lastRefreshedAt: number | null
  demandFileNote: string | null
  inventoryFileNote: string | null
}
