import * as XLSX from 'xlsx'
import { dateKey } from './dates'
import { slug } from './slug'

export const INVENTORY_REQUIRED_COLS = [
  'SKU Name',
  'Customer Name',
  'Store Name',
  'Week Start Date',
  'ROP',
  'Safety stock',
  'On hand inventory',
  'Replenishment quantity',
]

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

export function findInventorySheet(wb: XLSX.WorkBook): string | null {
  for (const name of wb.SheetNames) {
    const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null }) as Record<string, unknown>[]
    if (!rawRows.length) continue
    const rows = normalizeRows(rawRows)
    if (INVENTORY_REQUIRED_COLS.every((c) => c in rows[0])) return name
  }
  return null
}

export interface InvCell {
  rop: number
  ss: number
  onHand: number
  replenQty: number
}

export interface InvStoreData {
  name: string
  weekKeys: string[]
  customers: string[]
  /** customer -> skuId(slug) -> weekIdx(within THIS file's own axis) -> cell */
  cell: Record<string, Record<string, Record<number, InvCell>>>
  skuNames: Record<string, string>
}

/* Faithful port of the HTML build's dhAggregateInventory(). Indexes the
   inventory file's own month set independently of the demand file's --
   the two are reconciled onto a shared axis later in joinInventory(), by
   calendar month, not by index. */
export function parseInventoryWorkbook(wb: XLSX.WorkBook, sheetName: string): Record<string, InvStoreData> {
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

  const cell: Record<string, Record<string, Record<string, Record<number, InvCell>>>> = {}
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
      rop: Number(r['ROP'] ?? 0),
      ss: Number(r['Safety stock'] ?? 0),
      onHand: Number(r['On hand inventory'] ?? 0),
      replenQty: Number(r['Replenishment quantity'] ?? 0),
    }

    ;((storeSkuNames[store] ??= {})[skuId] ??= sku)
    ;(storeCustomers[store] ??= new Set()).add(customer)
  })

  const result: Record<string, InvStoreData> = {}
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
