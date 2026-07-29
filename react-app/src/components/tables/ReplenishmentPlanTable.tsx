import { CheckCircle2 } from 'lucide-react'
import type { ReplenishmentLane } from '../../types'

const MODE_META: Record<string, { label: string; cls: string }> = {
  FTL:        { label: 'FTL',           cls: 'bg-blue-light text-blue-dark' },
  FTL_CONSOL: { label: 'FTL (consol.)', cls: 'bg-purple-light text-purple' },
  MILK_RUN:   { label: 'Milk-run',      cls: 'bg-amber-light text-amber' },
}

interface Props {
  lanes: ReplenishmentLane[]
  approvedIds: Set<string>
  onToggle: (storeId: string) => void
}

export default function ReplenishmentPlanTable({ lanes, approvedIds, onToggle }: Props) {
  const totalUnits = lanes.reduce((a, l) => a + l.totalUnits, 0)
  const totalFreight = lanes.reduce((a, l) => a + l.freightCost, 0)
  const avgFill = lanes.reduce((a, l) => a + l.truckFillPct, 0) / lanes.length
  const wAvgSaving = lanes.reduce((a, l) => a + Math.abs(l.vsBaselinePct) * l.freightCost, 0) / totalFreight

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="grid-table">
          <thead>
            <tr>
              <th className="table-th w-8"></th>
              <th className="table-th">Lane (DC → Store)</th>
              <th className="table-th th-num">SKUs</th>
              <th className="table-th th-num">Units</th>
              <th className="table-th">Truck fill</th>
              <th className="table-th">Mode</th>
              <th className="table-th th-num">Freight</th>
              <th className="table-th th-num">vs baseline</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane) => {
              const approved = approvedIds.has(lane.storeId)
              const mode = MODE_META[lane.mode]
              const fillColor = lane.truckFillPct >= 85 ? '#1A8754' : lane.truckFillPct >= 70 ? '#D97706' : '#C93B3B'
              return (
                <tr
                  key={lane.storeId}
                  className={`transition-colors cursor-pointer ${approved ? 'bg-green-light/40' : 'hover:bg-blue-light/30'}`}
                  onClick={() => onToggle(lane.storeId)}
                >
                  <td className="table-td">
                    {approved ? (
                      <CheckCircle2 size={15} className="text-green" />
                    ) : (
                      <span className="block w-[15px] h-[15px] rounded border-[1.5px] border-border2" />
                    )}
                  </td>
                  <td className="table-td">
                    <div className="flex flex-col justify-center leading-tight py-1">
                      <span className="font-semibold text-[12px]">DC → #{lane.storeId}</span>
                      <span className="text-[10.5px] text-ink4">{lane.storeName}</span>
                    </div>
                  </td>
                  <td className="table-td td-num">{lane.skuCount}</td>
                  <td className="table-td td-num font-medium">{lane.totalUnits.toLocaleString()}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2 min-w-[110px]">
                      <div className="meter flex-1">
                        <div style={{ width: `${lane.truckFillPct}%`, background: fillColor }} />
                      </div>
                      <span className="font-bold text-[11px] num w-8 text-right" style={{ color: fillColor }}>
                        {lane.truckFillPct}%
                      </span>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className={`chip ${mode.cls} font-semibold`}>{mode.label}</span>
                  </td>
                  <td className="table-td td-num font-semibold">£{lane.freightCost.toLocaleString()}</td>
                  <td className="table-td td-num font-bold text-green">↓ {Math.abs(lane.vsBaselinePct).toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface2">
              <td className="table-td !border-b-0"></td>
              <td className="table-td !border-b-0 font-bold text-ink">Network total</td>
              <td className="table-td !border-b-0 td-num text-ink4">—</td>
              <td className="table-td !border-b-0 td-num font-bold">{totalUnits.toLocaleString()}</td>
              <td className="table-td !border-b-0 text-[11px] text-ink3 font-semibold num">{avgFill.toFixed(0)}% avg</td>
              <td className="table-td !border-b-0 text-ink4">—</td>
              <td className="table-td !border-b-0 td-num font-bold text-ink">£{totalFreight.toLocaleString()}</td>
              <td className="table-td !border-b-0 td-num font-bold text-green">↓ {wAvgSaving.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 h-8 border-t border-border bg-surface2 text-[11px] text-ink4 num">
        <span>{approvedIds.size} of {lanes.length} lanes approved</span>
        <span>Click a row to approve · DRP releases on approval</span>
      </div>
    </div>
  )
}
