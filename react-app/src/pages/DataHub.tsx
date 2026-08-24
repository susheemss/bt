import { CheckCircle2, AlertCircle, Database, FileSpreadsheet, RefreshCw, Loader2 } from 'lucide-react'
import AITag from '../components/ai/AITag'
import { useAppStore } from '../store/useAppStore'
import { DEMAND_REQUIRED_COLS } from '../lib/parseDemand'
import { INVENTORY_REQUIRED_COLS } from '../lib/parseInventory'

/* Mirrors the HTML build's Data Hub: this app never uploads a file from the
   browser. It reads /source-data.xlsx and /source-data-inventory.xlsx,
   which the existing server.py serves from whatever absolute path is
   written in source_path.txt / source_path_inventory.txt on the server --
   so refreshing here always shows exactly what's on disk on the server,
   not a copy pasted into a form. */
export default function DataHub() {
  const refresh = useAppStore((s) => s.refresh)
  const refreshFromSource = useAppStore((s) => s.refreshFromSource)
  const storeOrder = useAppStore((s) => s.storeOrder)
  const stores = useAppStore((s) => s.stores)

  const skuCount = storeOrder.reduce((a, id) => a + (stores[id]?.skus.length ?? 0), 0)
  const monthCount = storeOrder.length ? Math.max(...storeOrder.map((id) => stores[id]?.weekKeys.length ?? 0)) : 0

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-[15px] font-bold text-ink tracking-tight mb-1">Data Hub</h2>
        <p className="text-[12px] text-ink4">
          Live source, not an upload — this reads the two Excel files configured on the server (<code className="text-[11px] bg-surface2 px-1 py-0.5 rounded">source_path.txt</code> and{' '}
          <code className="text-[11px] bg-surface2 px-1 py-0.5 rounded">source_path_inventory.txt</code>) every time you refresh.
        </p>
      </div>

      <div className="panel p-4 flex items-center gap-3">
        <button className="btn-primary" onClick={() => refreshFromSource()} disabled={refresh.status === 'loading'}>
          {refresh.status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh from source files
        </button>
        <span className="text-[11.5px] text-ink4">
          {refresh.lastRefreshedAt ? `Last refreshed ${new Date(refresh.lastRefreshedAt).toLocaleTimeString()}` : 'Not refreshed yet this session'}
        </span>
      </div>

      {refresh.status === 'success' && (
        <div className="panel !border-green/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={15} className="text-green" />
            <span className="text-[12.5px] font-bold text-green">{refresh.message}</span>
            <span className="ml-auto"><AITag /></span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Stores', value: storeOrder.length },
              { label: 'SKU positions', value: skuCount },
              { label: 'Months of data', value: monthCount },
            ].map((s) => (
              <div key={s.label} className="bg-surface2 border border-border rounded-md px-3 py-2.5 text-center">
                <div className="text-[20px] font-bold text-ink num">{s.value.toLocaleString()}</div>
                <div className="text-[10.5px] text-ink4 uppercase tracking-wide font-semibold">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-ink4 mt-3">
            {refresh.inventoryFileNote
              ? 'Both demand and inventory data loaded successfully.'
              : 'Demand data loaded; inventory file was not reachable or did not match the expected columns — inventory panels will show as pending until it is.'}
          </p>
        </div>
      )}

      {refresh.status === 'error' && (
        <div className="panel !border-red/40 p-4 flex items-start gap-3">
          <AlertCircle size={15} className="text-red mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[12.5px] font-bold text-red mb-0.5">Refresh failed</div>
            <div className="text-[11.5px] text-ink4">{refresh.message}</div>
          </div>
        </div>
      )}

      <div className="panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database size={13} className="text-ink4" />
          <span className="text-[11px] font-bold text-ink4 uppercase tracking-wider">Expected schema</span>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2.5">
            <FileSpreadsheet size={14} className="text-blue flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[12px] font-semibold text-ink mb-0.5">Demand file (source_path.txt)</div>
              <div className="text-[11px] text-ink4 leading-relaxed">
                {DEMAND_REQUIRED_COLS.join(' · ')} <span className="text-ink5">(Customer Name optional — enables the customer filter when present)</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2.5">
            <FileSpreadsheet size={14} className="text-green flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[12px] font-semibold text-ink mb-0.5">Inventory file (source_path_inventory.txt)</div>
              <div className="text-[11px] text-ink4 leading-relaxed">{INVENTORY_REQUIRED_COLS.join(' · ')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
