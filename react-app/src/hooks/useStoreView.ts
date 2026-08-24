import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { computeInventoryView } from '../lib/joinInventory'
import { computeDemandView, type DemandView } from '../lib/demandView'
import type { LiveStore } from '../types'

/** The live store record with inventory recomputed for the current customer
 *  filter -- recomputed on every filter change, same as the HTML build's
 *  applyCustomerFilterToStores(), not cached, since it's cheap (bounded by
 *  months x SKUs x customers for one store). */
export function useStoreView(storeId: string | null): LiveStore | null {
  const stores = useAppStore((s) => s.stores)
  const invData = useAppStore((s) => s.invData)
  const customerFilter = useAppStore((s) => s.currentCustomerFilter)

  return useMemo(() => {
    if (!storeId || !stores[storeId]) return null
    return computeInventoryView(stores[storeId], invData[storeId], customerFilter)
  }, [storeId, stores, invData, customerFilter])
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
