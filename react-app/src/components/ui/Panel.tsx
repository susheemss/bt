import { useEffect, useState, type ReactNode } from 'react'
import { MoreHorizontal, Maximize2, X } from 'lucide-react'

interface PanelProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  legend?: ReactNode
  children: ReactNode
  className?: string
}

export default function Panel({ title, subtitle, badge, legend, children, className = '' }: PanelProps) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  function titleBlock() {
    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="panel-title truncate">{title}</h3>
          {badge}
        </div>
        {subtitle && <div className="panel-sub mt-0.5">{subtitle}</div>}
      </div>
    )
  }

  return (
    <>
      <section className={`panel flex flex-col ${className}`}>
        <header className="panel-hd">
          {titleBlock()}
          {legend && <div className="flex items-center gap-3">{legend}</div>}
          <div className="flex items-center gap-0.5 text-ink5">
            <button className="p-1 rounded hover:bg-surface2 hover:text-ink3" title="Expand" onClick={() => setExpanded(true)}>
              <Maximize2 size={12} />
            </button>
            <button className="p-1 rounded hover:bg-surface2 hover:text-ink3" title="More options">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </header>
        {/* Skip rendering the chart here while expanded -- the modal below
            renders it instead, so there's never two live chart instances
            (and two ambiguous "Close" buttons) mounted at once. */}
        <div className="panel-bd flex-1">{!expanded && children}</div>
      </section>

      {expanded && (
        <>
          <div className="fixed inset-0 bg-ink/25 backdrop-blur-[2px] z-[120]" onClick={() => setExpanded(false)} />
          <div className="fixed inset-6 md:inset-12 z-[121] bg-surface rounded-lg shadow-2xl flex flex-col overflow-hidden">
            <header className="panel-hd">
              {titleBlock()}
              {legend && <div className="flex items-center gap-3">{legend}</div>}
              <div className="flex items-center gap-0.5 text-ink5">
                <button className="p-1 rounded hover:bg-surface2 hover:text-ink3" title="Close" onClick={() => setExpanded(false)}>
                  <X size={14} />
                </button>
              </div>
            </header>
            <div className="panel-bd flex-1">{children}</div>
          </div>
        </>
      )}
    </>
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
