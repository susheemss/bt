import { useLocation } from 'react-router-dom'
import { RefreshCw, Search, HelpCircle, ChevronRight, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const PAGE_META: Record<string, { section: string; title: string }> = {
  '/overview': { section: 'Planning', title: 'Network overview' },
  '/kpi': { section: 'Planning', title: 'Network KPIs' },
  '/replenishment': { section: 'Planning', title: 'Replenishment & DC dispatch' },
  '/data-hub': { section: 'Configuration', title: 'Data Hub' },
}

export default function Topbar() {
  const location = useLocation()
  const stores = useAppStore((s) => s.stores)
  const storeOrder = useAppStore((s) => s.storeOrder)
  const currentStore = useAppStore((s) => s.currentStore)
  const setStore = useAppStore((s) => s.setStore)
  const currentSkuFilter = useAppStore((s) => s.currentSkuFilter)
  const setSkuFilter = useAppStore((s) => s.setSkuFilter)
  const currentCustomerFilter = useAppStore((s) => s.currentCustomerFilter)
  const setCustomerFilter = useAppStore((s) => s.setCustomerFilter)
  const horizon = useAppStore((s) => s.horizon)
  const setHorizon = useAppStore((s) => s.setHorizon)
  const refresh = useAppStore((s) => s.refresh)
  const refreshFromSource = useAppStore((s) => s.refreshFromSource)

  const isStores = location.pathname.startsWith('/stores/')
  const store = currentStore ? stores[currentStore] : null
  const meta = isStores
    ? { section: 'Planning', title: store ? `${store.name} — SKU replenishment detail` : 'Store detail' }
    : PAGE_META[location.pathname] ?? { section: 'Planning', title: 'Network overview' }

  const showFilters = (location.pathname === '/overview' || location.pathname === '/kpi' || isStores) && !!store

  // Union of both files' customers, same principle as the HTML build: a
  // customer known to only one file still shows up, tagged, rather than
  // vanishing silently.
  const customerOptions = store
    ? Array.from(new Set([...(store.invCustomers ?? []), ...(store.demandCustomers ?? [])])).sort()
    : []

  return (
    <header className="bg-surface border-b border-border h-14 px-5 flex items-center gap-3 flex-shrink-0">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-[11px] font-medium text-ink4">{meta.section}</span>
        <ChevronRight size={12} className="text-ink5 flex-shrink-0" />
        <h1 className="text-[14px] font-bold text-ink tracking-tight truncate">{meta.title}</h1>
      </div>

      <div className="relative hidden lg:block">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink5 pointer-events-none" />
        <input className="input pl-8 w-[190px]" placeholder="Search SKU, store…" />
      </div>

      {showFilters && store && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="field-label hidden sm:block">Store</span>
            <select value={currentStore ?? ''} onChange={(e) => setStore(e.target.value)} className="select font-medium min-w-[140px]">
              {storeOrder.map((id) => (
                <option key={id} value={id}>{stores[id]?.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="field-label hidden sm:block">SKU</span>
            <select value={currentSkuFilter} onChange={(e) => setSkuFilter(e.target.value)} className="select min-w-[130px]">
              <option value="all">All items</option>
              {store.skus.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {customerOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="field-label hidden sm:block">Customer</span>
              <select value={currentCustomerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="select min-w-[130px]">
                <option value="all">All customers</option>
                {customerOptions.map((c) => {
                  const inInv = (store.invCustomers ?? []).includes(c)
                  const inDem = (store.demandCustomers ?? []).includes(c)
                  const tag = inInv && inDem ? '' : inDem ? ' (no inventory rows)' : ' (no demand rows)'
                  return <option key={c} value={c}>{c}{tag}</option>
                })}
              </select>
            </div>
          )}

          <div className="seg">
            {([4, 8] as const).map((h) => (
              <span key={h} className={`seg-item ${horizon === h ? 'seg-item-active' : ''}`} onClick={() => setHorizon(h)}>
                {h}mo
              </span>
            ))}
          </div>
        </>
      )}

      <div className="h-5 w-px bg-border mx-0.5" />

      <button
        className="btn-ghost !px-2.5 !text-[11px] !font-semibold gap-1.5"
        title="Refresh from source files"
        onClick={() => refreshFromSource()}
        disabled={refresh.status === 'loading'}
      >
        {refresh.status === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        Refresh
      </button>
      <button className="btn-ghost !px-2 hidden sm:flex" title="Help">
        <HelpCircle size={14} />
      </button>
    </header>
  )
}
