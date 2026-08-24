import type { SkuStatus } from '../types'

/* CLAUDE.md section 12 formula, kept for reference / for when lead-time and
   open-to-ship headroom data becomes available per SKU. The live join in
   src/lib/joinInventory.ts currently computes net requirement as the
   simpler max(0, ROP - on-hand) directly from the real ROP/on-hand columns,
   since lead time and per-store capacity aren't columns either source file
   has yet -- this function is not wired into that path today. */
export function computeNetRequirement(p: {
  sensedDemandPerWeek: number
  leadTimeDays: number
  safetyStock: number
  onHand: number
  inTransit: number
  openToShipHeadroom: number
}): number {
  const demandOverLeadTime = p.sensedDemandPerWeek * (p.leadTimeDays / 7)
  const required = demandOverLeadTime + p.safetyStock
  const available = p.onHand + p.inTransit
  const raw = required - available
  return Math.min(Math.max(raw, 0), p.openToShipHeadroom)
}

export const STATUS_META: Record<SkuStatus, { label: string; bg: string; text: string }> = {
  replenish: { label: 'Replenish', bg: 'bg-red-light', text: 'text-red' },
  low: { label: 'Low', bg: 'bg-amber-light', text: 'text-amber' },
  ok: { label: 'OK', bg: 'bg-green-light', text: 'text-green' },
  hold: { label: 'Hold', bg: 'bg-surface3', text: 'text-ink3' },
  redeploy: { label: 'Redeploy', bg: 'bg-purple-light', text: 'text-purple' },
}

export function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const av = Math.abs(n)
  if (av >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toLocaleString('en-GB', { maximumFractionDigits: av > 0 && av < 10 ? 2 : 0 })
}

export function fmtExact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('en-GB', { maximumFractionDigits: 2 })
}
