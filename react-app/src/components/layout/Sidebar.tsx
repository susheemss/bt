import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Store, Truck, Network, Gauge } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

function NavItem({ to, icon: Icon, label, badge, aiDot, active }: {
  to: string; icon: any; label: string; badge?: number; aiDot?: boolean; active?: boolean
}) {
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
  const location = useLocation()

  const shortfallCount = storeOrder.reduce((acc, id) => {
    const store = stores[id]
    return acc + (store ? store.skus.filter((k) => k.st === 'replenish' || k.st === 'low').length : 0)
  }, 0)

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
            <NavItem to="/overview" icon={LayoutDashboard} label="Demand Overview" />
            <NavItem to="/kpi" icon={Gauge} label="Demand KPI" />
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
      </nav>
    </aside>
  )
}
