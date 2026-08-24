import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Store, Truck, Sparkles, Target, ScanBarcode,
  Settings, Users, Database, Network, Gauge,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

function NavItem({ to, icon: Icon, label, badge, aiDot, active, disabled }: {
  to: string; icon: any; label: string; badge?: number; aiDot?: boolean; active?: boolean; disabled?: boolean
}) {
  if (disabled) {
    return (
      <div className="sidebar-link !cursor-default !text-white/25 hover:!bg-transparent hover:!text-white/25">
        <Icon size={15} strokeWidth={1.8} className="flex-shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        <span className="text-[8.5px] font-bold uppercase tracking-wide text-white/25 border border-white/15 rounded px-1">Soon</span>
      </div>
    )
  }
  return (
    <NavLink to={to} className={({ isActive }) => `sidebar-link ${active ?? isActive ? 'active' : ''}`}>
      <Icon size={15} strokeWidth={1.8} className="flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {typeof badge === 'number' && badge > 0 && (
        <span className="text-[10px] leading-none bg-red text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold num">
          {badge}
        </span>
      )}
      {aiDot && <span className="w-1.5 h-1.5 rounded-full bg-purple flex-shrink-0" />}
    </NavLink>
  )
}

export default function Sidebar() {
  const stores = useAppStore((s) => s.stores)
  const storeOrder = useAppStore((s) => s.storeOrder)
  const currentStore = useAppStore((s) => s.currentStore)
  const setStore = useAppStore((s) => s.setStore)
  const navigate = useNavigate()
  const location = useLocation()

  const shortfallCount = storeOrder.reduce((acc, id) => {
    const store = stores[id]
    return acc + (store ? store.skus.filter((k) => k.st === 'replenish' || k.st === 'low').length : 0)
  }, 0)

  function handleStoreClick(id: string) {
    setStore(id)
    navigate(`/stores/${id}`)
  }

  return (
    <aside className="w-[218px] flex-shrink-0 flex flex-col h-full" style={{ background: '#1B2537' }}>
      {/* Brand */}
      <div className="px-4 h-14 flex items-center gap-2.5 border-b border-white/[0.07]">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6C5CE7, #2E6BE6)' }}
        >
          <Network size={14} className="text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-white leading-tight tracking-tight truncate">Decision Intelligence</div>
          <div className="text-[10px] text-white/35 leading-tight">Demand &amp; Replenishment</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div>
          <div className="sidebar-section">Planning</div>
          <div className="space-y-0.5">
            <NavItem to="/overview" icon={LayoutDashboard} label="Network overview" />
            <NavItem to="/kpi" icon={Gauge} label="Network KPIs" />
            <NavItem
              to={currentStore ? `/stores/${currentStore}` : '/overview'}
              icon={Store}
              label="Stores"
              badge={shortfallCount}
              active={location.pathname.startsWith('/stores/')}
            />
            <NavItem to="/replenishment" icon={Truck} label="Replenishment" aiDot />
          </div>
        </div>

        <div>
          <div className="sidebar-section">Intelligence</div>
          <div className="space-y-0.5">
            <NavItem to="/overview" icon={Sparkles} label="Demand sensing" aiDot active={false} />
            <NavItem to="#" icon={Target} label="Forecast accuracy" disabled />
            <NavItem to="#" icon={ScanBarcode} label="POS sell-through" disabled />
          </div>
        </div>

        <div>
          <div className="sidebar-section">Configuration</div>
          <div className="space-y-0.5">
            <NavItem to="/data-hub" icon={Database} label="Data Hub" />
            <NavItem to="#" icon={Settings} label="Store settings" disabled />
            <NavItem to="#" icon={Users} label="Users & roles" disabled />
          </div>
        </div>

        {storeOrder.length > 0 && (
          <div>
            <div className="sidebar-section">Network · {storeOrder.length} store{storeOrder.length === 1 ? '' : 's'}</div>
            <div className="space-y-0.5">
              {storeOrder.map((id) => {
                const s = stores[id]
                if (!s) return null
                const flagged = s.skus.filter((k) => k.st === 'replenish' || k.st === 'low').length
                const isActive = location.pathname === `/stores/${id}`
                return (
                  <button
                    key={id}
                    onClick={() => handleStoreClick(id)}
                    className={`w-full text-left sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/25 flex-shrink-0" />
                    <span className="flex-1 truncate text-[12px]">{s.name}</span>
                    {flagged > 0 && (
                      <span className="text-[9px] leading-none bg-amber/90 text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-bold num">
                        {flagged}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5 px-1.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6C5CE7, #2E6BE6)' }}
          >
            SP
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-white/90 truncate leading-tight">Supply Planner</div>
            <div className="text-[10px] text-white/35 leading-tight">Demo workspace</div>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wide text-white/40 border border-white/15 rounded px-1.5 py-0.5">
            Preview
          </span>
        </div>
      </div>
    </aside>
  )
}
