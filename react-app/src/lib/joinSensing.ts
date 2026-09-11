import type { LiveStore, Series, SkuRow } from '../types'
import type { SensingStoreData } from './parseSensing'

/** SKUs the sensing file references that the demand file doesn't (yet) --
 *  added to the roster with dmd:0, genuinely unknown, not fabricated.
 *  Also records the sensing file's own customer list, for the
 *  union-of-all-three-files customer selector. */
export function mergeSensingRoster(store: LiveStore, sens: SensingStoreData | undefined): LiveStore {
  if (!sens) return store
  const existingIds = new Set(store.skus.map((s) => s.id))
  const extraSkus: SkuRow[] = []
  Object.keys(sens.skuNames).forEach((skuId) => {
    if (existingIds.has(skuId)) return
    extraSkus.push({
      id: skuId,
      name: sens.skuNames[skuId],
      hasDemand: false,
      hasInv: false,
      dmd: 0,
      forecast: [],
      sensed: [],
      uplift: 0,
      oh: null,
      ss: null,
      rop: null,
      nr: null,
      rq: null,
      st: null,
      onHandSeries: [],
      ropSeries: [],
      replenQtySeries: [],
      gapSeries: [],
      hasSensing: false,
      sensingForecast: [],
      sensingSensed: [],
      sensingUplift: 0,
    })
    existingIds.add(skuId)
  })
  return {
    ...store,
    skus: extraSkus.length ? [...store.skus, ...extraSkus] : store.skus,
    sensingCustomers: sens.customers,
  }
}

/* Faithful port of the HTML build's computeSensingSeries(): recomputes
   store-level and per-SKU Total Demand / Sensed Forecast series from the
   sensing file for whichever customer(s) are currently selected, with the
   same month-axis-alignment onto the demand file's weekKeys and
   null-preservation as inventory. "Current" uplift comes from the latest
   month where a SKU has BOTH a real total demand and a real sensed
   forecast -- not just the file's last month, which can have one blank
   (the real file does). */
export function computeSensingView(
  store: LiveStore,
  sens: SensingStoreData | undefined,
  customerFilter: string
): LiveStore {
  if (!sens) {
    return { ...store, hasSensing: false, skus: store.skus.map((sk) => ({ ...sk, hasSensing: false })) }
  }

  const customers = customerFilter === 'all' ? sens.customers : [customerFilter]
  const axis = store.weekKeys.length ? store.weekKeys : sens.weekKeys
  const axisPos: Record<string, number> = {}
  axis.forEach((d, i) => (axisPos[d] = i))
  const sensKeys = sens.weekKeys
  const sensToAxis = sensKeys.map((d) => (d in axisPos ? axisPos[d] : -1))
  const N = axis.length

  function addAt(arr: Series, i: number, v: number) {
    arr[i] = (arr[i] ?? 0) + v
  }

  const skus: SkuRow[] = store.skus.map((sk) => {
    const skForecast: Series = new Array(N).fill(null)
    const skSensed: Series = new Array(N).fill(null)

    customers.forEach((cust) => {
      const bySkuAtCust = sens.cell[cust] ?? {}
      const cellForSku = bySkuAtCust[sk.id]
      if (!cellForSku) return
      for (let w = 0; w < sensKeys.length; w++) {
        const c = cellForSku[w]
        if (!c) continue
        const a = sensToAxis[w]
        if (a < 0) continue
        if (c.totalDemand !== null) addAt(skForecast, a, c.totalDemand)
        if (c.sensedForecast !== null) addAt(skSensed, a, c.sensedForecast)
      }
    })

    let latestF: number | null = null
    let latestS: number | null = null
    for (let a = N - 1; a >= 0; a--) {
      if (skForecast[a] !== null && skSensed[a] !== null) {
        latestF = skForecast[a]
        latestS = skSensed[a]
        break
      }
    }
    const hasSensing = skForecast.some((v) => v !== null) || skSensed.some((v) => v !== null)
    const sensingUplift = latestF !== null && latestS !== null ? Math.round(((latestS - latestF) / (latestF || 1)) * 1000) / 10 : 0

    return { ...sk, hasSensing, sensingForecast: skForecast, sensingSensed: skSensed, sensingUplift }
  })

  const forecastArr: Series = new Array(N).fill(null)
  const sensedArr: Series = new Array(N).fill(null)
  let anyMonth = false
  for (let w = 0; w < sensKeys.length; w++) {
    const a = sensToAxis[w]
    if (a < 0) continue
    customers.forEach((cust) => {
      const bySku = sens.cell[cust] ?? {}
      Object.keys(bySku).forEach((skuId) => {
        const c = bySku[skuId][w]
        if (!c) return
        if (c.totalDemand !== null) {
          addAt(forecastArr, a, c.totalDemand)
          anyMonth = true
        }
        if (c.sensedForecast !== null) {
          addAt(sensedArr, a, c.sensedForecast)
          anyMonth = true
        }
      })
    })
  }
  let latestF: number | null = null
  let latestS: number | null = null
  for (let a = N - 1; a >= 0; a--) {
    if (forecastArr[a] !== null && sensedArr[a] !== null) {
      latestF = forecastArr[a]
      latestS = sensedArr[a]
      break
    }
  }
  const storeUplift = latestF !== null && latestS !== null ? Math.round(((latestS - latestF) / (latestF || 1)) * 1000) / 10 : 0

  return {
    ...store,
    skus,
    hasSensing: anyMonth,
    sensingForecast: forecastArr,
    sensingSensed: sensedArr,
    sensingUplift: storeUplift,
  }
}
