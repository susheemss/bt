import { RefreshCw, Repeat2 } from 'lucide-react'
import { renderMarkdownLite } from '../../lib/markdownLite'

export type AgentRunState =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'done'; answer: string }
  | { status: 'error'; message: string }

interface Props {
  state: AgentRunState
  slow: boolean
  onRun: () => void
  disabledMessage?: string // set only on the Vercel preview, which has no backend
}

/** Purely presentational -- the run/fetch logic and state live in the page
 *  (Agents.tsx) so a result survives the card being toggled off and back on,
 *  instead of re-firing a real LLM call every time. */
export default function RedeployAgentContent({ state, slow, onRun, disabledMessage }: Props) {
  if (disabledMessage) {
    return <div className="text-[11.5px] text-ink4 leading-relaxed">{disabledMessage}</div>
  }

  if (state.status === 'idle') {
    return (
      <button
        onClick={onRun}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple text-white text-[11.5px] font-semibold hover:opacity-90"
      >
        <Repeat2 size={13} />
        Find redeploy opportunities
      </button>
    )
  }

  if (state.status === 'busy') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[11.5px] text-ink3">
          <RefreshCw size={12} className="animate-spin" />
          Analyzing network inventory…
        </div>
        {slow && <div className="text-[10.5px] text-ink4">Free-tier models can take up to a minute — still working…</div>}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-[11.5px] text-red leading-relaxed">Could not run the analysis — {state.message}</div>
        <button onClick={onRun} className="self-start text-[11px] font-semibold text-purple hover:opacity-70">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] text-ink2 leading-relaxed">{renderMarkdownLite(state.answer)}</div>
      <button onClick={onRun} className="self-start inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple hover:opacity-70">
        <RefreshCw size={11} />
        Re-run
      </button>
    </div>
  )
}
