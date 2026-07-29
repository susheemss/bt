import { useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Database, FileSpreadsheet, UploadCloud } from 'lucide-react'
import * as XLSX from 'xlsx'
import AITag from '../components/ai/AITag'

interface Summary {
  stores: number
  skus: number
  weeks: number
  rows: number
}

export default function DataHub() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [fileName, setFileName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setStatus('loading')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        let totalRows = 0
        const stores = new Set<string>()
        const skus = new Set<string>()
        const weeks = new Set<string>()

        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName]
          const rows: any[] = XLSX.utils.sheet_to_json(ws)
          totalRows += rows.length
          rows.forEach((r) => {
            if (r['Store ID']) stores.add(String(r['Store ID']))
            if (r['SKU ID']) skus.add(String(r['SKU ID']))
            if (r['Week Start Date']) weeks.add(String(r['Week Start Date']))
          })
        })

        setSummary({ stores: stores.size, skus: skus.size, weeks: weeks.size, rows: totalRows })
        setStatus('success')
      } catch (err: any) {
        setErrorMsg(err.message ?? 'Failed to parse file.')
        setStatus('error')
      }
    }
    reader.readAsArrayBuffer(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-[15px] font-bold text-ink tracking-tight mb-1">Data Hub</h2>
        <p className="text-[12px] text-ink4">
          Upload <span className="font-semibold text-ink3">Dabur_Supply_Data.xlsx</span> to refresh demand
          forecasts, on-hand inventory and SKU replenishment calculations across the network.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="panel border-dashed !border-border2 p-10 text-center cursor-pointer hover:!border-blue hover:bg-blue-light/20 transition-colors"
      >
        <div className="w-11 h-11 rounded-lg bg-blue-light text-blue flex items-center justify-center mx-auto mb-3">
          <UploadCloud size={20} />
        </div>
        <div className="text-[13px] font-semibold text-ink mb-1">Click to upload workbook</div>
        <div className="text-[11.5px] text-ink4">
          .xlsx · Sheet 1: Demand Forecasting · Sheet 2: On Hand Inventory
        </div>
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
      </div>

      {status === 'loading' && (
        <div className="panel p-4 flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-blue border-t-transparent animate-spin" />
          <span className="text-[12px] text-ink3">Parsing <span className="font-semibold">{fileName}</span>…</span>
        </div>
      )}

      {status === 'success' && summary && (
        <div className="panel !border-green/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={15} className="text-green" />
            <span className="text-[12.5px] font-bold text-green">Data loaded successfully</span>
            <span className="text-[11px] text-ink4">{fileName}</span>
            <span className="ml-auto"><AITag /></span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: 'Stores', value: summary.stores },
              { label: 'SKUs', value: summary.skus },
              { label: 'Weeks', value: summary.weeks },
              { label: 'Rows processed', value: summary.rows },
            ].map((s) => (
              <div key={s.label} className="bg-surface2 border border-border rounded-md px-3 py-2.5 text-center">
                <div className="text-[20px] font-bold text-ink num">{s.value.toLocaleString()}</div>
                <div className="text-[10.5px] text-ink4 uppercase tracking-wide font-semibold">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-ink4 mt-3">
            Open Network overview or any store page to see refreshed charts and SKU tables.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="panel !border-red/40 p-4 flex items-start gap-3">
          <AlertCircle size={15} className="text-red mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[12.5px] font-bold text-red mb-0.5">Error processing file</div>
            <div className="text-[11.5px] text-ink4">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Schema reference */}
      <div className="panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database size={13} className="text-ink4" />
          <span className="text-[11px] font-bold text-ink4 uppercase tracking-wider">Expected schema</span>
        </div>
        <div className="space-y-3">
          {[
            {
              sheet: 'Sheet 1 — Demand Forecasting',
              cols: 'Store ID · Store Name · SKU ID · SKU Name · Week Start Date · Baseline (units) · Promo Units · Weather Units · Festival Units · Total Sensed Demand',
            },
            {
              sheet: 'Sheet 2 — On Hand Inventory',
              cols: 'Store ID · Store Name · SKU ID · SKU Name · Snapshot Date · On-Hand (units) · In-Transit (units) · Safety Stock · ROP · Replenishment Qty · Net Requirement · Status',
            },
          ].map((s) => (
            <div key={s.sheet} className="flex gap-2.5">
              <FileSpreadsheet size={14} className="text-green flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[12px] font-semibold text-ink mb-0.5">{s.sheet}</div>
                <div className="text-[11px] text-ink4 leading-relaxed">{s.cols}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
