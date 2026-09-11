import { create } from 'zustand'
import type { LiveStore, SkuRow, Series } from '../types'

/** Exactly the values Overview.tsx already computed for the clicked chart --
 *  passed straight through so the drill-down panel shows detail for exactly
 *  what's on screen (same SKU/customer scope), never a value recomputed
 *  separately that could drift out of sync with the chart the user clicked. */
export interface DrillDownContext {
  store: LiveStore
  selectedSku: SkuRow | null
  labels: string[]
  demandForecast: number[]
  demandSensed: number[]
  onHandSeries: Series
  replenQtySeries: Series
  ropSeries: Series
}

interface DrillDownState {
  open: boolean
  kind: 'demand' | 'inventory' | null
  monthIndex: number
  context: DrillDownContext | null
  openDrillDown: (kind: 'demand' | 'inventory', monthIndex: number, context: DrillDownContext) => void
  close: () => void
}

export const useDrillDownStore = create<DrillDownState>((set) => ({
  open: false,
  kind: null,
  monthIndex: 0,
  context: null,
  openDrillDown: (kind, monthIndex, context) => set({ open: true, kind, monthIndex, context }),
  close: () => set({ open: false }),
}))
