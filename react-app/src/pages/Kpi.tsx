import { ShieldCheck, PackageCheck, Gauge, Container, Truck } from 'lucide-react'
import KpiTile from '../components/kpi/KpiTile'
import PendingNote from '../components/ui/PendingNote'
import { useAppStore } from '../store/useAppStore'

/* These five network KPIs need on-hand inventory AND freight-cost data
   together to compute (service level and fill rate need a target vs actual
   comparison this build doesn't have a source for yet; transport cost needs
   a freight column neither file has). They've never had real numbers to
   show, so this page states that plainly rather than ever estimating one --
   same principle as every other pending panel in this app. */
export default function Kpi() {
  const currentStore = useAppStore((s) => s.currentStore)
  const stores = useAppStore((s) => s.stores)
  const store = currentStore ? stores[currentStore] : null

  if (!store) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <PendingNote>No store selected yet. Load data and pick a store from the top bar.</PendingNote>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        <KpiTile label="Service level" value="—" icon={<ShieldCheck size={15} />} />
        <KpiTile label="Fill rate" value="—" icon={<PackageCheck size={15} />} />
        <KpiTile label="Capacity utilisation" value="—" icon={<Gauge size={15} />} />
        <KpiTile label="In-transit units" value="—" icon={<Container size={15} />} />
        <KpiTile label="Transportation cost (MTD)" value="—" highlight icon={<Truck size={15} />} />
      </div>
      <PendingNote>
        Service level, fill rate, capacity utilisation, in-transit units and transportation cost all need{' '}
        <b className="text-ink3">on-hand inventory and freight data</b> together — freight cost isn't part of either
        source file yet. On-hand and ROP for <b className="text-ink3">{store.name}</b> are already live on the
        Network overview and Stores pages.
      </PendingNote>
    </div>
  )
}
