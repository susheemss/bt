import type { ReactNode } from 'react'
import { Clock } from 'lucide-react'

/** Consistent "honest empty state" used everywhere a panel legitimately has
 *  nothing to show yet, rather than ever inventing a plausible-looking number. */
export default function PendingNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border2 bg-surface2/60 px-3.5 py-3 flex items-start gap-2.5 text-[11.5px] text-ink4 leading-relaxed">
      <Clock size={14} className="flex-shrink-0 mt-0.5 text-ink5" />
      <div>{children}</div>
    </div>
  )
}
