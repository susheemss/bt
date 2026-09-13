import { useState } from 'react'
import { Repeat2, RefreshCw } from 'lucide-react'
import AITag from './AITag'
import { useAppStore } from '../../store/useAppStore'
import { buildChatPayload } from '../../lib/chatPayload'
import { renderMarkdownLite } from '../../lib/markdownLite'

// Same "not available in this preview" boundary the chat assistant uses --
// this agent also needs the /api/redeploy-agent backend, which only runs on
// the server.py-served build, not the static Vercel snapshot.
const AGENT_DISABLED = import.meta.env.VITE_CHAT_DISABLED === 'true'

type State = { status: 'idle' } | { status: 'busy' } | { status: 'done'; answer: string } | { status: 'error'; message: string }

/** Runs the redeploy-matching agent (chat_backend.py's REDEPLOY_SYSTEM_PROMPT
 *  + its 3 tools) once per click -- it's a standalone network-wide analysis,
 *  not a conversation, so there's no input box here, just a trigger and a
 *  result. The agent decides which SKUs to match; the transfer quantity it
 *  reports always came from a tool call over real on-hand/ROP/net-requirement
 *  data, never from the model's own arithmetic (see chat_backend.py). */
export default function RedeployAgentPanel() {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [slow, setSlow] = useState(false)
  const stores = useAppStore((s) => s.stores)
  const invData = useAppStore((s) => s.invData)
  const sensingData = useAppStore((s) => s.sensingData)

  async function run() {
    setState({ status: 'busy' })
    setSlow(false)
    const slowTimer = setTimeout(() => setSlow(true), 6000)
    try {
      // Network-wide by design -- redeploy matching looks across every
      // store's real data, not whichever customer filter another page
      // happens to have selected.
      const payload = buildChatPayload(stores, invData, sensingData, 'all')
      const res = await fetch('/api/redeploy-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.answer) {
        setState({ status: 'done', answer: body.answer })
      } else {
        setState({ status: 'error', message: body.error ?? 'Unknown error' })
      }
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : String(err) })
    } finally {
      clearTimeout(slowTimer)
      setSlow(false)
    }
  }

  return (
    <section className="rounded-lg border border-dashed border-purple/45 bg-purple-light/20 h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 border-b border-purple/15">
        <AITag label="AI technology" />
        <span className="text-[11px] text-ink4">Redeploy matching</span>
      </div>

      <div className="p-4 flex-1 flex flex-col min-h-0">
        <p className="text-[11.5px] text-ink3 leading-relaxed mb-3">
          Scans every loaded store's real on-hand, ROP and net requirement to find SKUs overstocked at one store while
          short at another, and suggests a transfer instead of a new order.
        </p>

        {AGENT_DISABLED ? (
          <div className="text-[11.5px] text-ink4 leading-relaxed">
            Not available in this preview — this agent needs a live backend that only runs on the full deployment.
          </div>
        ) : (
          <>
            {state.status === 'idle' && (
              <button
                onClick={run}
                className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple text-white text-[11.5px] font-semibold hover:opacity-90"
              >
                <Repeat2 size={13} />
                Find redeploy opportunities
              </button>
            )}

            {state.status === 'busy' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-[11.5px] text-ink3">
                  <RefreshCw size={12} className="animate-spin" />
                  Analyzing network inventory…
                </div>
                {slow && <div className="text-[10.5px] text-ink4">Free-tier models can take up to a minute — still working…</div>}
              </div>
            )}

            {state.status === 'error' && (
              <div className="flex flex-col gap-2">
                <div className="text-[11.5px] text-red leading-relaxed">Could not run the analysis — {state.message}</div>
                <button onClick={run} className="self-start text-[11px] font-semibold text-purple hover:opacity-70">
                  Try again
                </button>
              </div>
            )}

            {state.status === 'done' && (
              <div className="flex flex-col gap-2 min-h-0 overflow-y-auto">
                <div className="text-[12px] text-ink2 leading-relaxed">{renderMarkdownLite(state.answer)}</div>
                <button onClick={run} className="self-start inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple hover:opacity-70">
                  <RefreshCw size={11} />
                  Re-run
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
