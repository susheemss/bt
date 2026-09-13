import type { ReactNode } from 'react'
import AITag from './AITag'

interface AgentCardProps {
  name: string
  description: string
  enabled: boolean
  onToggle: (next: boolean) => void
  children?: ReactNode // rendered only while enabled
}

/** Generic enable/disable shell for one agent on the AI Agents page -- name,
 *  description and a toggle live here; each agent's own trigger/busy/done UI
 *  is passed in as children so adding a new agent later is just a new
 *  registry entry + a content component, not a new card layout. */
export default function AgentCard({ name, description, enabled, onToggle, children }: AgentCardProps) {
  return (
    <div className="rounded-lg border border-dashed border-purple/45 bg-purple-light/20">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AITag />
            <h3 className="text-[12.5px] font-bold text-ink truncate">{name}</h3>
          </div>
          <p className="text-[11.5px] text-ink3 leading-relaxed mt-1">{description}</p>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          aria-label={`${enabled ? 'Disable' : 'Enable'} ${name}`}
          onClick={() => onToggle(!enabled)}
          className={`relative w-9 h-5 rounded-full flex-shrink-0 mt-0.5 transition-colors ${enabled ? 'bg-purple' : 'bg-surface3'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`}
          />
        </button>
      </div>
      {enabled && children && <div className="px-4 pb-4 border-t border-purple/15 pt-3.5">{children}</div>}
    </div>
  )
}
