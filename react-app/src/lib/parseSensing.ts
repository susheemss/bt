import * as XLSX from 'xlsx'
import { dateKey } from './dates'
import { slug } from './slug'

export const SENSING_REQUIRED_COLS = ['SKU Name', 'Customer Name', 'Store Name', 'Week Start Date', 'Total Demand', 'Sensed Forecast']

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

export function findSensingSheet(wb: XLSX.WorkBook): string | null {
  for (const name of wb.SheetNames) {
    const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null }) as Record<string, unknown>[]
    if (!rawRows.length) continue
    const rows = normalizeRows(rawRows)
    if (SENSING_REQUIRED_COLS.every((c) => c in rows[0])) return name
  }
  return null
}

export interface SensingCell {
  totalDemand: number | null
  sensedForecast: number | null
}

export interface SensingStoreData {
  name: string
  weekKeys: string[]
  customers: string[]
  cell: Record<string, Record<string, Record<number, SensingCell>>>
  skuNames: Record<string, string>
}

const isBlank = (v: unknown) => v === null || v === undefined || v === ''

/* Faithful port of the HTML build's dhAggregateSensing(). Parsed with
   defval:null (not the usual defval:0) so a row with Total Demand present
   but a blank Sensed Forecast keeps that blank as null -- the real source
   file has exactly this case, and defaulting it to 0 would read as "AI
   sensed zero demand" for that month, which was never actually recorded. */
export function parseSensingWorkbook(wb: XLSX.WorkBook, sheetName: string): Record<string, SensingStoreData> {
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null }) as Record<string, unknown>[]
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

  const cell: Record<string, Record<string, Record<string, Record<number, SensingCell>>>> = {}
  const storeCustomers: Record<string, Set<string>> = {}
  const storeSkuNames: Record<string, Record<string, string>> = {}

  rows.forEach((r) => {
    const store = String(r['Store Name'] ?? '').trim()
    const customer = String(r['Customer Name'] ?? '').trim()
    const sku = String(r['SKU Name'] ?? '').trim()
    const wk = r['Week Start Date']
    if (!store || !customer || !sku || !wk) return
    const wi = weekIdx[store][dateKey(wk)]
    const skuId = slug(sku)

    const bySkuAtCust = ((cell[store] ??= {})[customer] ??= {})
    const bySku = (bySkuAtCust[skuId] ??= {})
    bySku[wi] = {
      totalDemand: isBlank(r['Total Demand']) ? null : Number(r['Total Demand']),
      sensedForecast: isBlank(r['Sensed Forecast']) ? null : Number(r['Sensed Forecast']),
    }

    ;((storeSkuNames[store] ??= {})[skuId] ??= sku)
    ;(storeCustomers[store] ??= new Set()).add(customer)
  })

  const result: Record<string, SensingStoreData> = {}
  Object.keys(weekIdx).forEach((store) => {
    result[slug(store)] = {
      name: store,
      weekKeys: Object.keys(weekIdx[store]).sort(),
      customers: Array.from(storeCustomers[store] ?? []).sort(),
      cell: cell[store] ?? {},
      skuNames: storeSkuNames[store] ?? {},
    }
  })
  return result
}
