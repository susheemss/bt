import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import Overview from './pages/Overview'
import StoreDetail from './pages/StoreDetail'
import Dispatch from './pages/Dispatch'
import DataHub from './pages/DataHub'
import { STORES } from './data/stores'

function StatusBar() {
  const storeCount = Object.keys(STORES).length
  const skuCount = Object.values(STORES).reduce((a, s) => a + s.skus.length, 0)
  return (
    <footer className="statusbar">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green" />
        Connected · POS sell-through live
      </span>
      <span>Data as of 14 Jul 2026 09:42</span>
      <span className="ml-auto hidden sm:inline">{storeCount} stores · {skuCount} SKU positions · 1 DC</span>
      <span className="hidden md:inline">Plan cycle W28 · FY26</span>
      <span className="text-ink5">v0.2</span>
    </footer>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-5 bg-bg">
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/stores/:storeId" element={<StoreDetail />} />
              <Route path="/replenishment" element={<Dispatch />} />
              <Route path="/data-hub" element={<DataHub />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </main>
          <StatusBar />
        </div>
      </div>
    </BrowserRouter>
  )
}
