import type { ReactNode } from 'react'
import { MoreHorizontal, Maximize2 } from 'lucide-react'

interface PanelProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  legend?: ReactNode
  children: ReactNode
  className?: string
}

export default function Panel({ title, subtitle, badge, legend, children, className = '' }: PanelProps) {
  return (
    <section className={`panel flex flex-col ${className}`}>
      <header className="panel-hd">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="panel-title truncate">{title}</h3>
            {badge}
          </div>
          {subtitle && <div className="panel-sub mt-0.5">{subtitle}</div>}
        </div>
        {legend && <div className="flex items-center gap-3">{legend}</div>}
        <div className="flex items-center gap-0.5 text-ink5">
          <button className="p-1 rounded hover:bg-surface2 hover:text-ink3" title="Expand">
            <Maximize2 size={12} />
          </button>
          <button className="p-1 rounded hover:bg-surface2 hover:text-ink3" title="More options">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </header>
      <div className="panel-bd flex-1">{children}</div>
    </section>
  )
}

export function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink4">
      {dashed ? (
        <span className="w-3 border-t-2 border-dashed" style={{ borderColor: color }} />
      ) : (
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      )}
      {label}
    </span>
  )
}
