import { useMemo, useState } from 'react'
import { ArrowUp, ArrowDown, ChevronsUpDown, Search, Download } from 'lucide-react'
import type { SkuRow, SkuStatus } from '../../types'
import { STATUS_META } from '../../utils/supplyChain'

type SortKey = keyof Pick<SkuRow, 'id' | 'oh' | 'it' | 'dmd' | 'ss' | 'rop' | 'nr' | 'rq' | 'st'>

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'id',  label: 'SKU' },
  { key: 'oh',  label: 'On-hand',       numeric: true },
  { key: 'it',  label: 'In-transit',    numeric: true },
  { key: 'dmd', label: 'Sensed dmd/wk', numeric: true },
  { key: 'ss',  label: 'Safety stock',  numeric: true },
  { key: 'rop', label: 'ROP',           numeric: true },
  { key: 'nr',  label: 'Net req.',      numeric: true },
  { key: 'rq',  label: 'Replen qty',    numeric: true },
  { key: 'st',  label: 'Status' },
]

const STATUS_ORDER: SkuStatus[] = ['replenish', 'low', 'ok', 'hold', 'redeploy']

interface Props {
  skus: SkuRow[]
  filter?: string
}

export default function SkuTable({ skus, filter = 'all' }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('nr')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<SkuStatus | 'all'>('all')

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of skus) c[s.st] = (c[s.st] ?? 0) + 1
    return c
  }, [skus])

  const rows = useMemo(() => {
    let r = filter === 'all' ? [...skus] : skus.filter((s) => s.id === filter)
    if (statusFilter !== 'all') r = r.filter((s) => s.st === statusFilter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      r = r.filter((s) => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    }
    r.sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey]
      let cmp: number
      if (sortKey === 'st') cmp = STATUS_ORDER.indexOf(a.st) - STATUS_ORDER.indexOf(b.st)
      else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return r
  }, [skus, filter, statusFilter, query, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(key === 'id' ? 'asc' : 'desc') }
  }

  return (
    <div className="panel overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border flex-wrap">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink5 pointer-events-none" />
          <input
            className="input pl-7 w-[190px] !h-7"
            placeholder="Search SKU…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="h-4 w-px bg-border" />
        <button
          className={`count-chip ${statusFilter === 'all' ? 'count-chip-active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All <span className="font-bold num">{skus.length}</span>
        </button>
        {STATUS_ORDER.map((st) => {
          const m = STATUS_META[st]
          const n = counts[st] ?? 0
          if (n === 0) return null
          return (
            <button
              key={st}
              className={`count-chip ${statusFilter === st ? 'count-chip-active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === st ? 'all' : st)}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${m.bg.replace('-light', '').replace('bg-surface3', 'bg-ink4')}`} />
              {m.label} <span className="font-bold num">{n}</span>
            </button>
          )
        })}
        <div className="ml-auto">
          <button className="btn-ghost !h-7 !text-[11px]">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-auto max-h-[calc(100vh-320px)]">
        <table className="grid-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`table-th table-th-sort ${c.numeric ? 'th-num' : ''}`}
                  onClick={() => toggleSort(c.key)}
                >
                  <span className={`inline-flex items-center gap-1 ${c.numeric ? 'flex-row-reverse' : ''}`}>
                    {c.label}
                    {sortKey === c.key
                      ? (sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)
                      : <ChevronsUpDown size={10} className="text-ink5" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((sku) => {
              const m = STATUS_META[sku.st]
              return (
                <tr key={sku.id} className="hover:bg-blue-light/30 transition-colors group">
                  <td className="table-td">
                    <div className="flex flex-col justify-center leading-tight py-1">
                      <span className="font-semibold text-ink text-[12px]">{sku.id}</span>
                      <span className="text-[10.5px] text-ink4 truncate max-w-[170px]">{sku.name}</span>
                    </div>
                  </td>
                  <td className="table-td td-num font-medium">{sku.oh.toLocaleString()}</td>
                  <td className="table-td td-num text-ink3">{sku.it > 0 ? sku.it.toLocaleString() : '—'}</td>
                  <td className="table-td td-num font-medium text-purple">{sku.dmd.toLocaleString()}</td>
                  <td className="table-td td-num text-ink3">{sku.ss.toLocaleString()}</td>
                  <td className="table-td td-num text-ink3">{sku.rop.toLocaleString()}</td>
                  <td className={`table-td td-num font-bold ${sku.nr > 0 ? 'text-red' : 'text-ink4'}`}>
                    {sku.nr > 0 ? `+${sku.nr.toLocaleString()}` : '0'}
                  </td>
                  <td className="table-td td-num font-bold">{sku.rq > 0 ? sku.rq.toLocaleString() : '—'}</td>
                  <td className="table-td">
                    <span className={`status-chip ${m.bg} ${m.text}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      {m.label}
                    </span>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="table-td text-center !text-ink4 py-10">
                  No SKUs match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 h-8 border-t border-border bg-surface2 text-[11px] text-ink4 num">
        <span>{rows.length} of {skus.length} SKUs</span>
        <span>Snapshot 14 Jul 2026 · POS sell-through live</span>
      </div>
    </div>
  )
}
