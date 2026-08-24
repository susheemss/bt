import type { LiveStore } from '../types'

export interface DemandView {
  forecast: number[]
  sensed: number[]
  uplift: number
  /** true when a customer filter is active but the demand file has no rows for it --
   *  the caller should show a scope-mismatch notice rather than pretend it filtered. */
  customerScopeMismatch: boolean
}

/* Faithful port of the HTML build's buildSkuDataFromStores() + the SKU/customer
   branches of applySkuFilterToStores(). Resolves what the demand charts should
   actually show for the current SKU + customer selection:

   - customer = 'all', sku = 'all'        -> store-wide series
   - customer = 'all', sku = X             -> that SKU's real series
   - customer = C (has demand rows), sku = 'all' -> sum of that customer's SKU series
   - customer = C (has demand rows), sku = X     -> that customer's series for SKU X
   - customer = C (NO demand rows for it)  -> falls back to store-wide, with
     customerScopeMismatch:true so the UI can say so instead of silently
     showing a different scope than the inventory panels next to it. */
export function computeDemandView(store: LiveStore, skuFilter: string, customerFilter: string): DemandView {
  const n = store.forecast.length
  const custData =
    customerFilter !== 'all' && store.customerSkuSeries[customerFilter] ? store.customerSkuSeries[customerFilter] : null
  const customerScopeMismatch = customerFilter !== 'all' && !custData

  if (skuFilter !== 'all') {
    if (custData) {
      const c = custData[skuFilter]
      return {
        forecast: c ? c.forecast : new Array(n).fill(0),
        sensed: c ? c.sensed : new Array(n).fill(0),
        uplift: c ? c.uplift : 0,
        customerScopeMismatch,
      }
    }
    const sku = store.skus.find((s) => s.id === skuFilter)
    if (sku && sku.hasDemand) {
      return { forecast: sku.forecast, sensed: sku.sensed, uplift: sku.uplift, customerScopeMismatch }
    }
    return { forecast: new Array(n).fill(0), sensed: new Array(n).fill(0), uplift: 0, customerScopeMismatch }
  }

  if (custData) {
    const aggF = new Array(n).fill(0)
    const aggS = new Array(n).fill(0)
    store.skus.forEach((sku) => {
      const c = custData[sku.id]
      if (!c) return
      c.forecast.forEach((v, i) => (aggF[i] += v))
      c.sensed.forEach((v, i) => (aggS[i] += v))
    })
    const latest = n - 1
    const blLatest = aggF[latest] || 1
    const uplift = Math.round(((aggS[latest] - aggF[latest]) / blLatest) * 1000) / 10
    return { forecast: aggF, sensed: aggS, uplift, customerScopeMismatch }
  }

  return { forecast: store.forecast, sensed: store.sensed, uplift: store.uplift, customerScopeMismatch: false }
}
