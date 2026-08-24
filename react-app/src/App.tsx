import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import Overview from './pages/Overview'
import Kpi from './pages/Kpi'
import StoreDetail from './pages/StoreDetail'
import Dispatch from './pages/Dispatch'
import DataHub from './pages/DataHub'
import ChatPreview from './components/ai/ChatPreview'
import { useAppStore } from './store/useAppStore'

function StatusBar() {
  const storeOrder = useAppStore((s) => s.storeOrder)
  const stores = useAppStore((s) => s.stores)
  const refresh = useAppStore((s) => s.refresh)
  const skuCount = storeOrder.reduce((a, id) => a + (stores[id]?.skus.length ?? 0), 0)

  return (
    <footer className="statusbar">
      <span className="inline-flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${refresh.status === 'success' ? 'bg-green' : refresh.status === 'error' ? 'bg-red' : 'bg-ink5'}`} />
        {refresh.status === 'success' ? 'Connected · live source files' : refresh.status === 'loading' ? 'Refreshing…' : refresh.status === 'error' ? 'Refresh failed' : 'Not connected'}
      </span>
      {refresh.lastRefreshedAt && <span>Data as of {new Date(refresh.lastRefreshedAt).toLocaleString()}</span>}
      <span className="ml-auto hidden sm:inline">{storeOrder.length} store{storeOrder.length === 1 ? '' : 's'} · {skuCount} SKU positions · 1 DC</span>
      <span className="text-ink5">Enterprise preview</span>
    </footer>
  )
}

export default function App() {
  const refreshFromSource = useAppStore((s) => s.refreshFromSource)

  useEffect(() => {
    refreshFromSource()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-5 bg-bg">
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/kpi" element={<Kpi />} />
              <Route path="/stores/:storeId" element={<StoreDetail />} />
              <Route path="/replenishment" element={<Dispatch />} />
              <Route path="/data-hub" element={<DataHub />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </main>
          <StatusBar />
        </div>
        <ChatPreview />
      </div>
    </HashRouter>
  )
}
