import type { SkuStatus } from '../types'

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

export function computeStatus(p: {
  netRequirement: number
  onHand: number
  sensedDemandPerWeek: number
  rop: number
}): SkuStatus {
  if (p.netRequirement > 0 && p.onHand < p.rop * 0.7) return 'low'
  if (p.netRequirement > 0) return 'replenish'
  if (p.onHand > p.sensedDemandPerWeek * 6) return 'redeploy'
  if (p.onHand > p.rop) return 'ok'
  return 'hold'
}

export const STATUS_META: Record<SkuStatus, { label: string; bg: string; text: string }> = {
  replenish: { label: 'Replenish', bg: 'bg-red-light',    text: 'text-red' },
  low:       { label: 'Low',       bg: 'bg-amber-light',  text: 'text-amber' },
  ok:        { label: 'OK',        bg: 'bg-green-light',  text: 'text-green' },
  hold:      { label: 'Hold',      bg: 'bg-surface3',     text: 'text-ink3' },
  redeploy:  { label: 'Redeploy',  bg: 'bg-purple-light', text: 'text-purple' },
}

export const DAY_FACTORS = [0.82, 0.91, 0.97, 1.18, 1.08, 1.32, 0.68]
export const DAY_LABELS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export function buildDailyDemand(weeklyBase: number, weeklySensed: number) {
  return DAY_FACTORS.map((f, i) => ({
    day:     DAY_LABELS[i],
    baseline: Math.round((weeklyBase   / 7) * f * 4.2),
    sensed:   Math.round((weeklySensed / 7) * f * 4.2),
  }))
}

export function fmt(n: number) {
  return n.toLocaleString('en-GB')
}
