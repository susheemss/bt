export type StoreId = '0142' | '0137' | '0151' | '0165' | '0188'

export type SkuStatus = 'replenish' | 'low' | 'ok' | 'hold' | 'redeploy'
export type ShipmentMode = 'FTL' | 'FTL_CONSOL' | 'MILK_RUN'
export type SignalType = 'Promo' | 'Weather' | 'Festival' | 'Trend' | 'Event'

export interface Store {
  id: StoreId
  name: string
  format: 'S' | 'M' | 'L'
  maxCap: number
  onHand: number
  inTransit: number
  ots: number
  lead: number
  capPct: number
  uplift: number
  signals: DemandSignal[]
  kpis: StoreKpis
  forecast: number[]
  sensed: number[]
  gap: number[]
  rop: number
  aiRecs: AiRec[]
  saving: string
  skus: SkuRow[]
}

export interface DemandSignal {
  t: SignalType
  pct: number
  on: boolean
}

export interface StoreKpis {
  sl: string;  slD: string;  slC: DeltaClass
  fr: string;  frD: string;  frC: DeltaClass
  cu: string;  cuD: string;  cuC: DeltaClass
  it: string;  itD: string;  itC: DeltaClass
  tc: string;  tcD: string;  tcC: DeltaClass
}

export type DeltaClass = 'delta-up' | 'delta-down' | 'delta-neu'

export interface AiRec {
  type: 'order' | 'consol' | 'redeploy'
  text: string
  meta: string
}

export interface SkuRow {
  id: string
  name: string
  oh: number
  it: number
  dmd: number
  ss: number
  rop: number
  nr: number
  rq: number
  st: SkuStatus
}

export interface ReplenishmentLane {
  storeId: StoreId
  storeName: string
  skuCount: number
  totalUnits: number
  truckFillPct: number
  mode: ShipmentMode
  freightCost: number
  vsBaselinePct: number
  approved: boolean
}

export interface NetworkKpis {
  transportCostWeek: string
  transportCostDelta: string
  avgTruckUtil: string
  avgTruckUtilDelta: string
  ltlLoads: number
  ltlLoadsDelta: string
  capacityFeasible: string
}

export interface AppState {
  currentStore: StoreId
  currentSkuFilter: string
  horizon: 4 | 8
  liveDataLoaded: boolean
}
