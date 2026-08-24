import type { LiveStore, Series, SkuRow, SkuStatus } from '../types'
import type { InvStoreData } from './parseInventory'

/* Same formula the app has always used for status (CLAUDE.md section 12),
   applied to real ROP/on-hand/net-requirement/sensed-demand values. */
export function deriveInvStatus(oh: number, rop: number, nr: number, sensedPerMonth: number): SkuStatus {
  if (nr > 0 && oh < rop * 0.7) return 'low'
  if (nr > 0) return 'replenish'
  if (sensedPerMonth > 0 && oh > sensedPerMonth * 6) return 'redeploy'
  if (oh > rop) return 'ok'
  return 'hold'
}

/** Inventory can reference SKUs the demand file doesn't have (yet) -- add them to
 *  the roster (with dmd:0, genuinely unknown, not fabricated) rather than silently
 *  dropping real inventory rows. Also records which customers the inventory file
 *  actually has, for the union-of-both-files customer selector. */
export function mergeInventoryRoster(store: LiveStore, inv: InvStoreData | undefined): LiveStore {
  if (!inv) return store
  const existingIds = new Set(store.skus.map((s) => s.id))
  const extraSkus: SkuRow[] = []
  Object.keys(inv.skuNames).forEach((skuId) => {
    if (existingIds.has(skuId)) return
    extraSkus.push({
      id: skuId,
      name: inv.skuNames[skuId],
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
    })
    existingIds.add(skuId)
  })
  return {
    ...store,
    skus: extraSkus.length ? [...store.skus, ...extraSkus] : store.skus,
    invCustomers: inv.customers,
  }
}

/* Faithful port of the HTML build's applyCustomerFilterToStores(): recomputes
   real oh/ss/rop/nr/rq/status per SKU, and the store-level on-hand/ROP/gap
   month-series for the charts, from the inventory file for whichever
   customer(s) are currently selected. Independent of the SKU demand filter
   -- inventory figures are real per-SKU data, not a proportional share of a
   total.

   The critical fix ported over: inventory months are projected onto the
   DEMAND file's month axis by actual calendar month (store.weekKeys), not
   by raw index -- the two files can start, end, or skip months differently.
   A month the inventory file has no row for stays null: a genuine gap in
   the series, never coerced to zero. */
export function computeInventoryView(
  store: LiveStore,
  inv: InvStoreData | undefined,
  customerFilter: string
): LiveStore {
  if (!inv) {
    return { ...store, hasInv: false, skus: store.skus.map((sk) => ({ ...sk, hasInv: false })) }
  }

  const customers = customerFilter === 'all' ? inv.customers : [customerFilter]
  const axis = store.weekKeys.length ? store.weekKeys : inv.weekKeys
  const axisPos: Record<string, number> = {}
  axis.forEach((d, i) => (axisPos[d] = i))
  const invKeys = inv.weekKeys
  const invToAxis = invKeys.map((d) => (d in axisPos ? axisPos[d] : -1))
  const N = axis.length

  function addAt(arr: Series, i: number, v: number) {
    arr[i] = (arr[i] ?? 0) + v
  }

  const skus: SkuRow[] = store.skus.map((sk) => {
    let oh = 0,
      ss = 0,
      rop = 0,
      rq = 0,
      found = false
    const skOnHand: Series = new Array(N).fill(null)
    const skRop: Series = new Array(N).fill(null)
    const skReplenQty: Series = new Array(N).fill(null)

    customers.forEach((cust) => {
      const bySkuAtCust = inv.cell[cust] ?? {}
      const cellForSku = bySkuAtCust[sk.id]
      if (!cellForSku) return
      for (let w = 0; w < invKeys.length; w++) {
        const c = cellForSku[w]
        if (!c) continue
        const a = invToAxis[w]
        if (a < 0) continue
        addAt(skOnHand, a, c.onHand)
        addAt(skRop, a, c.rop)
        addAt(skReplenQty, a, c.replenQty)
      }
      // "Current" figures come from the most recent month this SKU/customer
      // actually has a row for -- not blindly the file's last month, which
      // may simply be missing for this particular combination.
      for (let w = invKeys.length - 1; w >= 0; w--) {
        const c = cellForSku[w]
        if (!c) continue
        found = true
        oh += c.onHand
        ss += c.ss
        rop += c.rop
        rq += c.replenQty
        break
      }
    })

    const gapSeries: Series = skOnHand.map((v, i) => (v === null ? null : Math.round(v - (skRop[i] ?? 0))))

    if (!found) {
      return { ...sk, hasInv: false, onHandSeries: skOnHand, ropSeries: skRop, replenQtySeries: skReplenQty, gapSeries }
    }
    const nr = Math.max(0, rop - oh)
    const st = deriveInvStatus(oh, rop, nr, sk.dmd)
    return {
      ...sk,
      hasInv: true,
      oh,
      ss,
      rop,
      nr,
      rq,
      st,
      onHandSeries: skOnHand,
      ropSeries: skRop,
      replenQtySeries: skReplenQty,
      gapSeries,
    }
  })

  const onHandArr: Series = new Array(N).fill(null)
  const ropArr: Series = new Array(N).fill(null)
  const replenQtyArr: Series = new Array(N).fill(null)
  let anyMonth = false
  let lastFilled = -1
  for (let w = 0; w < invKeys.length; w++) {
    const a = invToAxis[w]
    if (a < 0) continue
    customers.forEach((cust) => {
      const bySku = inv.cell[cust] ?? {}
      Object.keys(bySku).forEach((skuId) => {
        const c = bySku[skuId][w]
        if (c) {
          addAt(onHandArr, a, c.onHand)
          addAt(ropArr, a, c.rop)
          addAt(replenQtyArr, a, c.replenQty)
          anyMonth = true
        }
      })
    })
    if (onHandArr[a] !== null) lastFilled = a
  }

  return {
    ...store,
    skus,
    hasInv: anyMonth,
    onHandSeries: onHandArr,
    ropSeries: ropArr,
    replenQtySeries: replenQtyArr,
    rop: lastFilled >= 0 ? (ropArr[lastFilled] ?? 0) : null,
    onHand: lastFilled >= 0 ? (onHandArr[lastFilled] ?? 0) : null,
    gap: onHandArr.map((v, i) => (v === null ? null : Math.round(v - (ropArr[i] ?? 0)))),
  }
}
