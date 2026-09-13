import { useEffect, useRef, useState } from 'react'
import AgentCard from '../components/ai/AgentCard'
import RedeployAgentContent, { type AgentRunState } from '../components/ai/RedeployAgentContent'
import { useAppStore } from '../store/useAppStore'
import { buildChatPayload } from '../lib/chatPayload'

// Same "not available in this preview" boundary the chat assistant uses --
// these agents need a live backend that only runs on the server.py-served
// build, not the static Vercel snapshot.
const AGENTS_DISABLED = import.meta.env.VITE_CHAT_DISABLED === 'true'

const ENABLED_STORAGE_KEY = 'di_enabled_agents'

/** Which agent cards are toggled on -- a per-viewer UI convenience (which
 *  agents you like to keep visible), not business data, so localStorage is
 *  fine here; falls back to all-off if it's unavailable or empty. */
function loadEnabled(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(ENABLED_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export default function Agents() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(loadEnabled)
  const [redeployState, setRedeployState] = useState<AgentRunState>({ status: 'idle' })
  const [redeploySlow, setRedeploySlow] = useState(false)
  const hasAutoRun = useRef(false)

  const stores = useAppStore((s) => s.stores)
  const invData = useAppStore((s) => s.invData)
  const sensingData = useAppStore((s) => s.sensingData)

  function toggle(id: string, next: boolean) {
    setEnabled((prev) => {
      const nextState = { ...prev, [id]: next }
      try {
        localStorage.setItem(ENABLED_STORAGE_KEY, JSON.stringify(nextState))
      } catch {
        // per-viewer convenience only -- fine if it can't persist
      }
      return nextState
    })
  }

  async function runRedeploy() {
    setRedeployState({ status: 'busy' })
    setRedeploySlow(false)
    const slowTimer = setTimeout(() => setRedeploySlow(true), 6000)
    try {
      // Network-wide by design -- looks across every store's real data, not
      // whichever customer filter another page happens to have selected.
      const payload = buildChatPayload(stores, invData, sensingData, 'all')
      const res = await fetch('/api/redeploy-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.answer) {
        setRedeployState({ status: 'done', answer: body.answer })
      } else {
        setRedeployState({ status: 'error', message: body.error ?? 'Unknown error' })
      }
    } catch (err) {
      setRedeployState({ status: 'error', message: err instanceof Error ? err.message : String(err) })
    } finally {
      clearTimeout(slowTimer)
      setRedeploySlow(false)
    }
  }

  // Auto-run the first time this agent gets enabled (not on every re-toggle
  // -- a result already in state just gets shown again, no repeat LLM call).
  useEffect(() => {
    if (enabled['redeploy-matching'] && redeployState.status === 'idle' && !hasAutoRun.current && !AGENTS_DISABLED) {
      hasAutoRun.current = true
      runRedeploy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled['redeploy-matching']])

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-[15px] font-bold text-ink tracking-tight">AI Agents</h2>
        <p className="text-[11.5px] text-ink4 mt-1 leading-relaxed">
          Enable an agent to run it against your currently loaded data and see its answer here. Each one calls a small
          fixed set of tools over real data — it never invents a number it didn't get from a tool call.
        </p>
      </div>

      <AgentCard
        name="Redeploy Matching Agent"
        description="Finds SKUs overstocked at one store while short at another, and suggests a transfer instead of a new replenishment order."
        enabled={!!enabled['redeploy-matching']}
        onToggle={(next) => toggle('redeploy-matching', next)}
      >
        <RedeployAgentContent
          state={redeployState}
          slow={redeploySlow}
          onRun={runRedeploy}
          disabledMessage={AGENTS_DISABLED ? "Not available in this preview — this agent needs a live backend that only runs on the full deployment." : undefined}
        />
      </AgentCard>
    </div>
  )
}
