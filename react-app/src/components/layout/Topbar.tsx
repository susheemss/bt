import { useLocation } from 'react-router-dom'
import { Bell, RefreshCw, Search, HelpCircle, ChevronRight, CalendarRange } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { STORES } from '../../data/stores'
import type { StoreId } from '../../types'

const PAGE_META: Record<string, { section: string; title: string }> = {
  '/overview':      { section: 'Planning', title: 'Network overview' },
  '/replenishment': { section: 'Planning', title: 'Replenishment & DC dispatch' },
  '/data-hub':      { section: 'Configuration', title: 'Data Hub' },
  '/settings':      { section: 'Configuration', title: 'Store settings' },
  '/users':         { section: 'Configuration', title: 'Users & roles' },
}

export default function Topbar() {
  const location = useLocation()
  const { currentStore, setStore } = useAppStore()

  const isStores = location.pathname.startsWith('/stores/')
  const meta = isStores
    ? { section: 'Planning', title: `Store #${currentStore} — ${STORES[currentStore]?.name.split(' — ')[0] ?? ''}` }
    : PAGE_META[location.pathname] ?? { section: 'Planning', title: 'Network overview' }

  const showStoreSelector = location.pathname === '/overview' || isStores

  return (
    <header className="bg-surface border-b border-border h-14 px-5 flex items-center gap-3 flex-shrink-0">
      {/* Breadcrumb + title */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-[11px] font-medium text-ink4">{meta.section}</span>
        <ChevronRight size={12} className="text-ink5 flex-shrink-0" />
        <h1 className="text-[14px] font-bold text-ink tracking-tight truncate">{meta.title}</h1>
      </div>

      {/* Global search */}
      <div className="relative hidden lg:block">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink5 pointer-events-none" />
        <input
          className="input pl-8 w-[220px]"
          placeholder="Search SKU, store, lane…"
        />
      </div>

      {/* Plan cycle chip */}
      <div className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-surface2 border border-border text-[11px] font-medium text-ink3 num">
        <CalendarRange size={13} className="text-ink4" />
        Cycle W28 · FY26
      </div>

      {/* Store selector */}
      {showStoreSelector && (
        <div className="flex items-center gap-1.5">
          <span className="field-label hidden sm:block">Store</span>
          <select
            value={currentStore}
            onChange={(e) => setStore(e.target.value as StoreId)}
            className="select font-medium min-w-[150px]"
          >
            {(Object.keys(STORES) as StoreId[]).map((id) => (
              <option key={id} value={id}>
                #{id} · {STORES[id].name.split(' — ')[0]}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="h-5 w-px bg-border mx-0.5" />

      <button className="btn-ghost !px-2" title="Refresh data">
        <RefreshCw size={14} />
      </button>
      <button className="btn-ghost !px-2 relative" title="Alerts">
        <Bell size={14} />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red ring-2 ring-surface" />
      </button>
      <button className="btn-ghost !px-2 hidden sm:flex" title="Help">
        <HelpCircle size={14} />
      </button>
    </header>
  )
}
