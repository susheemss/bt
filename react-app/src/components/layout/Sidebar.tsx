import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Store, Truck, Sparkles, Target, ScanBarcode,
  Settings, Users, Database, Network,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { STORES } from '../../data/stores'
import type { StoreId } from '../../types'

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
  const currentStore = useAppStore((s) => s.currentStore)
  const setStore = useAppStore((s) => s.setStore)
  const navigate = useNavigate()
  const location = useLocation()

  const shortfallCount = Object.values(STORES).reduce(
    (acc, s) => acc + s.skus.filter((k) => k.st === 'replenish' || k.st === 'low').length,
    0
  )

  function handleStoreClick(id: StoreId) {
    setStore(id)
    navigate(`/stores/${id}`)
  }

  return (
    <aside
      className="w-[218px] flex-shrink-0 flex flex-col h-full"
      style={{ background: '#1B2537' }}
    >
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
            <NavItem
              to={`/stores/${currentStore}`}
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
            <NavItem to="/overview#sensing" icon={Sparkles}    label="Demand sensing" aiDot active={false} />
            <NavItem to="/overview#accuracy" icon={Target}     label="Forecast accuracy" active={false} />
            <NavItem to="/overview#pos" icon={ScanBarcode}     label="POS sell-through" active={false} />
          </div>
        </div>

        <div>
          <div className="sidebar-section">Configuration</div>
          <div className="space-y-0.5">
            <NavItem to="/data-hub" icon={Database} label="Data Hub" />
            <NavItem to="/settings" icon={Settings} label="Store settings" active={false} />
            <NavItem to="/users"    icon={Users}    label="Users & roles" active={false} />
          </div>
        </div>

        <div>
          <div className="sidebar-section">Network · 5 stores</div>
          <div className="space-y-0.5">
            {(Object.keys(STORES) as StoreId[]).map((id) => {
              const s = STORES[id]
              const flagged = s.skus.filter((k) => k.st === 'replenish' || k.st === 'low').length
              const isActive = location.pathname === `/stores/${id}`
              return (
                <button
                  key={id}
                  onClick={() => handleStoreClick(id)}
                  className={`w-full text-left sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="w-[26px] h-[18px] rounded bg-white/[0.08] flex items-center justify-center text-[9px] font-bold text-white/60 num flex-shrink-0">
                    {id}
                  </span>
                  <span className="flex-1 truncate text-[12px]">{s.name.split(' — ')[0]}</span>
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
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5 px-1.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6C5CE7, #2E6BE6)' }}
          >
            SK
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-white/90 truncate leading-tight">Sumedha K.</div>
            <div className="text-[10px] text-white/35 leading-tight">Supply Chain Planner</div>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wide text-white/40 border border-white/15 rounded px-1.5 py-0.5">
            Prod
          </span>
        </div>
      </div>
    </aside>
  )
}
