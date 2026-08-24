import { Truck, Gauge, Container, ShieldCheck } from 'lucide-react'
import KpiTile from '../components/kpi/KpiTile'
import AIRationalePanel from '../components/ai/AIRationalePanel'
import PendingNote from '../components/ui/PendingNote'
import AITag from '../components/ai/AITag'

/* Network-level lane consolidation (CLAUDE.md section 5, Screen 3). Nothing
   in the demand or inventory files gives freight cost, truck capacity, or a
   DC-to-store lane assignment, so this has never had real numbers to plot --
   it stays a clearly labelled preview of what the plan table and KPIs will
   show once that data is wired up, same as every other pending panel here.
   The rationale panel on the right is left as real content: it explains the
   optimiser's methodology (net requirement, 85% truck-fill target, lane
   modes), not a live number, so there's nothing to fabricate there. */
export default function Dispatch() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AITag label="AI-optimized" />
        <span className="text-[11px] text-ink4">Objective: minimise network transportation cost at 98% service level</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KpiTile label="Transportation cost — cycle" value="—" highlight icon={<Truck size={15} />} />
        <KpiTile label="Avg truck utilisation" value="—" icon={<Gauge size={15} />} />
        <KpiTile label="LTL / expedite loads" value="—" icon={<Container size={15} />} />
        <KpiTile label="Capacity-feasible" value="—" icon={<ShieldCheck size={15} />} />
      </div>

      <div className="grid grid-cols-[1fr_330px] gap-4 items-stretch">
        <div className="min-w-0 panel p-5">
          <PendingNote>
            The consolidated replenishment plan needs <b className="text-ink3">freight cost and truck capacity</b> data
            per DC → store lane — neither is part of the uploaded demand or inventory files yet. Once available, this
            panel will show each lane's SKU count, units, truck fill, shipping mode and freight cost, consolidated
            to maximise truck fill above the 85% target.
          </PendingNote>
        </div>
        <AIRationalePanel />
      </div>
    </div>
  )
}
