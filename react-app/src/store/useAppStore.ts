import { create } from 'zustand'
import type { StoreId } from '../types'
import { STORES } from '../data/stores'

interface AppStore {
  currentStore: StoreId
  currentSkuFilter: string
  liveDataLoaded: boolean
  setStore: (id: StoreId) => void
  setSkuFilter: (sku: string) => void
  setLiveDataLoaded: (v: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  currentStore: '0142',
  currentSkuFilter: 'all',
  liveDataLoaded: false,
  setStore: (id) => set({ currentStore: id, currentSkuFilter: 'all' }),
  setSkuFilter: (sku) => set({ currentSkuFilter: sku }),
  setLiveDataLoaded: (v) => set({ liveDataLoaded: v }),
}))

export function getSkuOptions(storeId: StoreId) {
  const store = STORES[storeId]
  return [{ id: 'all', name: 'All SKUs' }, ...store.skus.map((s) => ({ id: s.id, name: s.name }))]
}
