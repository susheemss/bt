import type { LiveStore } from '../types'
import type { InvStoreData } from './parseInventory'
import type { SensingStoreData } from './parseSensing'
import { computeInventoryView } from './joinInventory'
import { computeSensingView } from './joinSensing'

/** Builds the {stores: ...} payload for POST /api/chat. Unlike the HTML
 *  build (where STORES is one mutable object already holding the current
 *  post-join state for whichever store was last viewed), this app's global
 *  state only holds the raw parsed data -- the real oh/rop/nr/rq/st values
 *  are computed per-render by useStoreView() and never written back. So the
 *  chatbot can answer about ANY store, not just the currently-viewed one,
 *  this recomputes the same join for every store fresh each time a
 *  question is sent, using the currently-selected customer filter (the
 *  same single global filter the charts use). */
export function buildChatPayload(
  stores: Record<string, LiveStore>,
  invData: Record<string, InvStoreData>,
  sensingData: Record<string, SensingStoreData>,
  customerFilter: string
): { stores: Record<string, LiveStore> } {
  const joined: Record<string, LiveStore> = {}
  Object.entries(stores).forEach(([id, store]) => {
    const withInv = computeInventoryView(store, invData[id], customerFilter)
    joined[id] = computeSensingView(withInv, sensingData[id], customerFilter)
  })
  return { stores: joined }
}
