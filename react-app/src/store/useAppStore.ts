import { create } from 'zustand'
import * as XLSX from 'xlsx'
import type { LiveStore, RefreshState } from '../types'
import { DEMAND_REQUIRED_COLS, findDemandSheet, parseDemandWorkbook } from '../lib/parseDemand'
import { INVENTORY_REQUIRED_COLS, findInventorySheet, parseInventoryWorkbook, type InvStoreData } from '../lib/parseInventory'
import { mergeInventoryRoster } from '../lib/joinInventory'

/* Same two routes the existing server.py already exposes -- each reads a
   path from a local config .txt file on every request and serves whatever
   Excel file is at that path, so this fetch is agnostic to where the real
   source files actually live on disk. Root-absolute, since server.py
   registers these two routes at the server root regardless of which
   subfolder actually serves this build's index.html. */
const DEMAND_URL = '/source-data.xlsx'
const INVENTORY_URL = '/source-data-inventory.xlsx'

interface AppState {
  stores: Record<string, LiveStore>
  storeOrder: string[]
  invData: Record<string, InvStoreData>
  currentStore: string | null
  currentSkuFilter: string
  currentCustomerFilter: string
  horizon: 4 | 8
  refresh: RefreshState
  setStore: (id: string) => void
  setSkuFilter: (id: string) => void
  setCustomerFilter: (id: string) => void
  setHorizon: (h: 4 | 8) => void
  refreshFromSource: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  stores: {},
  storeOrder: [],
  invData: {},
  currentStore: null,
  currentSkuFilter: 'all',
  currentCustomerFilter: 'all',
  horizon: 8,
  refresh: { status: 'idle', message: '', lastRefreshedAt: null, demandFileNote: null, inventoryFileNote: null },

  setStore: (id) => set({ currentStore: id, currentSkuFilter: 'all', currentCustomerFilter: 'all' }),
  setSkuFilter: (id) => set({ currentSkuFilter: id }),
  setCustomerFilter: (id) => set({ currentCustomerFilter: id }),
  setHorizon: (h) => set({ horizon: h }),

  refreshFromSource: async () => {
    set((s) => ({ refresh: { ...s.refresh, status: 'loading', message: 'Refreshing…' } }))
    try {
      const res = await fetch(DEMAND_URL + '?t=' + Date.now(), { cache: 'no-store' })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error('Demand file: HTTP ' + res.status + (detail ? ' — ' + detail.slice(0, 180) : ''))
      }
      const buf = await res.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const sheetName = findDemandSheet(wb)
      if (!sheetName) throw new Error('No sheet found with the expected demand columns: ' + DEMAND_REQUIRED_COLS.join(', '))
      const demandStores = parseDemandWorkbook(wb, sheetName)
      const storeOrder = Object.keys(demandStores)

      let invNote: string | null = null
      let invData: Record<string, InvStoreData> = {}
      let stores = demandStores
      try {
        const invRes = await fetch(INVENTORY_URL + '?t=' + Date.now(), { cache: 'no-store' })
        if (invRes.ok) {
          const invBuf = await invRes.arrayBuffer()
          const invWb = XLSX.read(invBuf, { type: 'array', cellDates: true })
          const invSheetName = findInventorySheet(invWb)
          if (invSheetName) {
            invData = parseInventoryWorkbook(invWb, invSheetName)
            stores = Object.fromEntries(
              Object.entries(demandStores).map(([id, store]) => [id, mergeInventoryRoster(store, invData[id])])
            )
            invNote = 'inventory'
          } else {
            console.warn('[Refresh] Inventory file reachable but no sheet matched the expected columns:', INVENTORY_REQUIRED_COLS)
          }
        } else {
          console.warn('[Refresh] Inventory file not reachable (HTTP ' + invRes.status + ') — continuing with demand data only.')
        }
      } catch (invErr) {
        console.warn('[Refresh] Inventory refresh failed, continuing with demand data only:', invErr)
      }

      const prevStore = get().currentStore
      const nextStore = prevStore && stores[prevStore] ? prevStore : storeOrder[0] ?? null

      set({
        stores,
        storeOrder,
        invData,
        currentStore: nextStore,
        currentSkuFilter: 'all',
        currentCustomerFilter: 'all',
        refresh: {
          status: 'success',
          message: '✓ Refreshed from source file' + (invNote ? ' + ' + invNote : ''),
          lastRefreshedAt: Date.now(),
          demandFileNote: `${storeOrder.length} store${storeOrder.length === 1 ? '' : 's'}`,
          inventoryFileNote: invNote,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set((s) => ({ refresh: { ...s.refresh, status: 'error', message: 'Refresh failed — ' + message } }))
      console.error('[Refresh]', err)
    }
  },
}))
