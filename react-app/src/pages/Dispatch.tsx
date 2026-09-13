import { Truck, Gauge, Container, ShieldCheck } from 'lucide-react'
import KpiTile from '../components/kpi/KpiTile'
import AIRationalePanel from '../components/ai/AIRationalePanel'
import RedeployAgentPanel from '../components/ai/RedeployAgentPanel'
import AITag from '../components/ai/AITag'

/* Network-level lane consolidation (CLAUDE.md section 5, Screen 3). Nothing
   in the demand or inventory files gives freight cost, truck capacity, or a
   DC-to-store lane assignment, so the plan table/KPIs above have never had
   real numbers to plot. The redeploy-matching panel below doesn't need any
   of that missing data -- it's built entirely from on-hand/ROP/net
   requirement, which is real today, so it fills what was an empty pending
   slot with something genuinely useful. The rationale panel stays as real
   content too: it explains the optimiser's methodology, not a live number. */
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
        <RedeployAgentPanel />
        <AIRationalePanel />
      </div>
    </div>
  )
}
