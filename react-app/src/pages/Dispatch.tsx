import { Truck, Gauge, Container, ShieldCheck } from 'lucide-react'
import KpiTile from '../components/kpi/KpiTile'
import AIRationalePanel from '../components/ai/AIRationalePanel'
import RecommendationsPanel from '../components/ai/RecommendationsPanel'
import AITag from '../components/ai/AITag'
import { useAppStore } from '../store/useAppStore'

/* Network-level lane consolidation (CLAUDE.md section 5, Screen 3). Nothing
   in the demand or inventory files gives freight cost, truck capacity, or a
   DC-to-store lane assignment, so the KPI tiles above have never had real
   numbers to plot -- they stay pending until that data exists. The left
   panel below used to be a pending note for the same reason, but now shows
   AI_recommendation.csv's real output instead (source_path_recommendations.txt)
   -- a genuinely different, already-real data source, not something this
   screen fabricates to fill the gap. The rationale panel on the right stays
   as real content too: it explains the optimiser's methodology, not a live
   number, so there's nothing to fabricate there either. */
export default function Dispatch() {
  const recommendations = useAppStore((s) => s.recommendations)

  return (
    <div className="h-full flex flex-col gap-4">
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

      <div className="grid grid-cols-[1fr_330px] gap-4 items-stretch flex-1 min-h-0">
        <RecommendationsPanel recommendations={recommendations} />
        <AIRationalePanel />
      </div>
    </div>
  )
}
