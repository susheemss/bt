import { useEffect, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { computeInventoryView } from '../lib/joinInventory'
import { computeSensingView } from '../lib/joinSensing'
import { computeDemandView, type DemandView } from '../lib/demandView'
import type { LiveStore } from '../types'

declare global {
  interface Window {
    __lastStoreView?: LiveStore | null
  }
}

/** The live store record with inventory AND demand-sensing recomputed for
 *  the current customer filter -- recomputed on every filter change, same
 *  as the HTML build's applyCustomerFilterToStores() + computeSensingSeries()
 *  pair, not cached, since it's cheap (bounded by months x SKUs x customers
 *  for one store). Inventory and sensing are independent live sources, so
 *  chaining them here just applies each on top of the same base store.
 *  Also publishes the result on window.__lastStoreView, mirroring the HTML
 *  build's STORES[currentStore] being a plain inspectable global -- run
 *  __lastStoreView in DevTools to see exactly what's currently computed. */
export function useStoreView(storeId: string | null): LiveStore | null {
  const stores = useAppStore((s) => s.stores)
  const invData = useAppStore((s) => s.invData)
  const sensingData = useAppStore((s) => s.sensingData)
  const customerFilter = useAppStore((s) => s.currentCustomerFilter)

  const view = useMemo(() => {
    if (!storeId || !stores[storeId]) return null
    const withInv = computeInventoryView(stores[storeId], invData[storeId], customerFilter)
    return computeSensingView(withInv, sensingData[storeId], customerFilter)
  }, [storeId, stores, invData, sensingData, customerFilter])

  useEffect(() => {
    if (typeof window !== 'undefined') window.__lastStoreView = view
  }, [view])

  return view
}

/** What the demand charts should show for the current SKU + customer selection. */
export function useDemandView(storeId: string | null): DemandView | null {
  const stores = useAppStore((s) => s.stores)
  const skuFilter = useAppStore((s) => s.currentSkuFilter)
  const customerFilter = useAppStore((s) => s.currentCustomerFilter)

  return useMemo(() => {
    if (!storeId || !stores[storeId]) return null
    return computeDemandView(stores[storeId], skuFilter, customerFilter)
  }, [storeId, stores, skuFilter, customerFilter])
}
