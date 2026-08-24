import * as XLSX from 'xlsx'
import { dateKey } from './dates'
import { slug } from './slug'
import type { CustomerSkuPoint, DemandSignal, LiveStore, SkuRow } from '../types'

export const DEMAND_REQUIRED_COLS = ['SKU Name', 'Store Name', 'Week Start Date', 'Baseline (units)', 'Promo Units']

function normalizeKey(k: string): string {
  let s = String(k)
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)
  return s.trim()
}

function normalizeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => {
    const out: Record<string, unknown> = {}
    Object.keys(r).forEach((k) => {
      out[normalizeKey(k)] = r[k]
    })
    return out
  })
}

export function findDemandSheet(wb: XLSX.WorkBook): string | null {
  for (const name of wb.SheetNames) {
    const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null }) as Record<string, unknown>[]
    if (!rawRows.length) continue
    const rows = normalizeRows(rawRows)
    if (DEMAND_REQUIRED_COLS.every((c) => c in rows[0])) return name
  }
  return null
}

interface MonthAgg {
  baseline: number
  promo: number
}

/* Faithful port of the HTML build's dhAggregateData(). Same grouping,
   same "latest month drives current signals/uplift" convention (a live
   dashboard's "what's happening now" should track the most recent data
   point, not month index 0), same customer-series behaviour: only built
   when the file's Customer Name column is actually present, never
   fabricated as a proportional split. */
export function parseDemandWorkbook(wb: XLSX.WorkBook, sheetName: string): Record<string, LiveStore> {
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: 0 }) as Record<string, unknown>[]
  const rows = normalizeRows(rawRows)

  const weekDatesByStore: Record<string, Set<string>> = {}
  rows.forEach((r) => {
    const store = String(r['Store Name'] ?? '').trim()
    const wk = r['Week Start Date']
    if (!store || !wk) return
    ;(weekDatesByStore[store] ??= new Set()).add(dateKey(wk))
  })
  const weekIdx: Record<string, Record<string, number>> = {}
  Object.keys(weekDatesByStore).forEach((store) => {
    const sorted = Array.from(weekDatesByStore[store]).sort()
    weekIdx[store] = {}
    sorted.forEach((d, i) => (weekIdx[store][d] = i))
  })

  const storeWeek: Record<string, Record<number, MonthAgg>> = {}
  const storeSkuWeek: Record<string, Record<string, Record<number, MonthAgg>>> = {}
  const storeSkuNames: Record<string, Record<string, string>> = {}
  const storeCustomerSkuWeek: Record<string, Record<string, Record<string, Record<number, MonthAgg>>>> = {}
  const storeCustomers: Record<string, Set<string>> = {}
  const hasCustomerCol = rows.length > 0 && 'Customer Name' in rows[0]

  rows.forEach((r) => {
    const store = String(r['Store Name'] ?? '').trim()
    const sku = String(r['SKU Name'] ?? '').trim()
    const wk = r['Week Start Date']
    if (!store || !sku || !wk) return
    const wi = weekIdx[store][dateKey(wk)]
    const bl = Number(r['Baseline (units)'] ?? 0)
    const pr = Number(r['Promo Units'] ?? 0)

    const sw = (storeWeek[store] ??= {})
    const cur = (sw[wi] ??= { baseline: 0, promo: 0 })
    cur.baseline += bl
    cur.promo += pr

    const skuId = slug(sku)
    ;((storeSkuNames[store] ??= {})[skuId] ??= sku)
    const ssw = ((storeSkuWeek[store] ??= {})[skuId] ??= {})
    const scur = (ssw[wi] ??= { baseline: 0, promo: 0 })
    scur.baseline += bl
    scur.promo += pr

    if (hasCustomerCol) {
      const customer = String(r['Customer Name'] ?? '').trim()
      if (customer) {
        ;(storeCustomers[store] ??= new Set()).add(customer)
        const csw = (((storeCustomerSkuWeek[store] ??= {})[customer] ??= {})[skuId] ??= {})
        const ccur = (csw[wi] ??= { baseline: 0, promo: 0 })
        ccur.baseline += bl
        ccur.promo += pr
      }
    }
  })

  const result: Record<string, LiveStore> = {}
  Object.keys(weekIdx).forEach((store) => {
    const numWeeks = Object.keys(weekIdx[store]).length
    const forecastArr: number[] = []
    const sensedArr: number[] = []
    for (let w = 0; w < numWeeks; w++) {
      const d = storeWeek[store]?.[w] ?? { baseline: 0, promo: 0 }
      forecastArr.push(Math.round(d.baseline * 100) / 100)
      sensedArr.push(Math.round((d.baseline + d.promo) * 100) / 100)
    }

    const latest = numWeeks - 1
    const wLatest = storeWeek[store]?.[latest] ?? { baseline: 1, promo: 0 }
    const blLatest = wLatest.baseline || 1
    const promoPct = Math.round((wLatest.promo / blLatest) * 1000) / 10
    const signals: DemandSignal[] = [
      { t: 'Promo', pct: promoPct, on: wLatest.promo > 0 },
      { t: 'Weather', pct: 0, on: false },
      { t: 'Festival', pct: 0, on: false },
      { t: 'Trend', pct: 0, on: false },
      { t: 'Event', pct: 0, on: false },
    ]

    const skus: SkuRow[] = Object.keys(storeSkuNames[store] ?? {}).map((skuId) => {
      const skuWeeks = storeSkuWeek[store][skuId] ?? {}
      const skuForecast: number[] = []
      const skuSensed: number[] = []
      for (let w = 0; w < numWeeks; w++) {
        const d = skuWeeks[w] ?? { baseline: 0, promo: 0 }
        skuForecast.push(Math.round(d.baseline * 100) / 100)
        skuSensed.push(Math.round((d.baseline + d.promo) * 100) / 100)
      }
      const skuLatest = skuWeeks[latest] ?? { baseline: 0, promo: 0 }
      const skuBlLatest = skuLatest.baseline || 1
      const skuUplift = Math.round((skuLatest.promo / skuBlLatest) * 1000) / 10
      return {
        id: skuId,
        name: storeSkuNames[store][skuId],
        hasDemand: true,
        hasInv: false,
        dmd: Math.round(skuLatest.baseline * 100) / 100,
        forecast: skuForecast,
        sensed: skuSensed,
        uplift: skuUplift,
        oh: null,
        ss: null,
        rop: null,
        nr: null,
        rq: null,
        st: null,
        onHandSeries: new Array(numWeeks).fill(null),
        ropSeries: new Array(numWeeks).fill(null),
        replenQtySeries: new Array(numWeeks).fill(null),
        gapSeries: new Array(numWeeks).fill(null),
      }
    })

    const customerSkuSeries: Record<string, Record<string, CustomerSkuPoint>> = {}
    Array.from(storeCustomers[store] ?? []).forEach((customer) => {
      customerSkuSeries[customer] = {}
      const bySku = storeCustomerSkuWeek[store]?.[customer] ?? {}
      Object.keys(bySku).forEach((skuId) => {
        const skuWeeks = bySku[skuId]
        const cf: number[] = []
        const cs: number[] = []
        for (let w = 0; w < numWeeks; w++) {
          const d = skuWeeks[w] ?? { baseline: 0, promo: 0 }
          cf.push(Math.round(d.baseline * 100) / 100)
          cs.push(Math.round((d.baseline + d.promo) * 100) / 100)
        }
        const cLatest = skuWeeks[latest] ?? { baseline: 0, promo: 0 }
        const cBlLatest = cLatest.baseline || 1
        const cUplift = Math.round((cLatest.promo / cBlLatest) * 1000) / 10
        customerSkuSeries[customer][skuId] = {
          dmd: Math.round(cLatest.baseline * 100) / 100,
          forecast: cf,
          sensed: cs,
          uplift: cUplift,
        }
      })
    })

    result[slug(store)] = {
      id: slug(store),
      name: store,
      weekKeys: Object.keys(weekIdx[store]).sort(),
      forecast: forecastArr,
      sensed: sensedArr,
      uplift: promoPct,
      signals,
      skus,
      demandCustomers: storeCustomers[store] ? Array.from(storeCustomers[store]).sort() : [],
      invCustomers: [],
      customerSkuSeries,
      hasInv: false,
      onHand: null,
      rop: null,
      onHandSeries: new Array(numWeeks).fill(null),
      ropSeries: new Array(numWeeks).fill(null),
      replenQtySeries: new Array(numWeeks).fill(null),
      gap: new Array(numWeeks).fill(null),
    }
  })
  return result
}
