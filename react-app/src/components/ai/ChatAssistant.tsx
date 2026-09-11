import { useState, useRef, useEffect, Fragment } from 'react'
import { Bot, X, Send, Sparkles } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { buildChatPayload } from '../../lib/chatPayload'

/* Real AI assistant: POSTs to /api/chat (chat_backend.py), which gives an
   LLM a fixed set of tools that look up real values from the data this
   app has already parsed -- the model never invents a number itself, it
   calls a tool and reports the real result back. Ported from the same
   backend the HTML build uses; the field names in types/index.ts (oh, ss,
   rop, nr, rq, st, hasInv, hasSensing, sensingForecast, ...) are kept
   identical to what chat_backend.py's tools read, so the payload needs no
   translation layer. */

type Msg = { role: 'user' | 'bot' | 'error'; text: string }

/** Renders **bold** and "- " bullets as real React elements -- no HTML
 *  string is ever built from model output, so there's nothing to escape
 *  and no injection surface, unlike an innerHTML-based approach. */
function renderMarkdownLite(text: string) {
  const lines = text.split('\n')
  return lines.map((line, li) => {
    const isBullet = /^[-*]\s+/.test(line)
    const content = isBullet ? line.replace(/^[-*]\s+/, '') : line
    const parts = content.split(/(\*\*.+?\*\*)/g).map((part, pi) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={pi} className="font-bold">{part.slice(2, -2)}</strong>
      ) : (
        <Fragment key={pi}>{part}</Fragment>
      )
    )
    return (
      <div key={li} className={isBullet ? 'flex gap-1.5' : undefined}>
        {isBullet && <span className="flex-shrink-0">•</span>}
        <span>{parts}</span>
      </div>
    )
  })
}

export default function ChatAssistant() {
  const [open, setOpen] = useState(false)
  const [opened, setOpened] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  const stores = useAppStore((s) => s.stores)
  const invData = useAppStore((s) => s.invData)
  const sensingData = useAppStore((s) => s.sensingData)
  const customerFilter = useAppStore((s) => s.currentCustomerFilter)
  const currentStore = useAppStore((s) => s.currentStore)
  const storeName = currentStore ? stores[currentStore]?.name : null

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
  }, [messages, busy])

  function handleOpen() {
    setOpen(true)
    if (!opened) {
      setOpened(true)
      setMessages([{ role: 'bot', text: 'Hi — ask me about the data currently loaded here: on-hand, ROP, net requirement, demand forecast or sensed demand for any store, SKU or customer.' }])
    }
  }

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setBusy(true)

    try {
      const payload = buildChatPayload(stores, invData, sensingData, customerFilter)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history: historyRef.current, data: payload }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.answer) {
        setMessages((m) => [...m, { role: 'bot', text: body.answer }])
        historyRef.current = [...historyRef.current, { role: 'user', content: q }, { role: 'assistant', content: body.answer }]
      } else {
        setMessages((m) => [...m, { role: 'error', text: `Could not get an answer — ${body.error ?? 'unknown error'}. If this is the first time, check that openrouter_api_key.txt is set up on the server.` }])
      }
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: `Could not reach the server — ${err instanceof Error ? err.message : String(err)}` }])
    } finally {
      setBusy(false)
    }
  }

  const suggestions = storeName
    ? [
        `Which SKUs at ${storeName} need replenishing?`,
        `What is the on-hand and ROP for ${storeName}?`,
        `How is demand sensing tracking vs baseline at ${storeName}?`,
      ]
    : ['What stores are loaded?']

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed right-5 bottom-5 z-[150] w-[66px] h-[66px] rounded-full flex items-center justify-center shadow-lg transition-transform hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg, #6C5CE7, #2E6BE6)', boxShadow: '0 8px 24px rgba(124,58,237,.4), 0 2px 8px rgba(15,23,40,.18)' }}
        title="AI Assistant"
      >
        <Bot size={30} className="text-white" strokeWidth={1.8} />
        <span className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
          <Sparkles size={12} className="text-purple" fill="currentColor" />
        </span>
        <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green border-2 border-white" />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-ink/20 backdrop-blur-[1px] z-[140]"
          onClick={() => setOpen(false)}
        />
      )}

      {open && (
        <div className="fixed right-5 bottom-[96px] z-[150] w-[430px] max-w-[calc(100vw-40px)] h-[620px] max-h-[calc(100vh-120px)] bg-surface border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
          <div className="h-[3px] flex-shrink-0" style={{ background: 'linear-gradient(90deg, #6C5CE7, #2E6BE6, #6C5CE7)' }} />
          <div className="px-3.5 py-3 border-b border-border flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-purple-light flex items-center justify-center flex-shrink-0 text-purple">
              <Bot size={15} />
            </div>
            <div>
              <div className="text-[12.5px] font-bold text-ink">AI Supply Chain Assistant</div>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto w-[22px] h-[22px] rounded flex items-center justify-center text-ink4 hover:bg-surface2 hover:text-ink2 flex-shrink-0">
              <X size={13} />
            </button>
          </div>

          <div ref={bodyRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[86%] px-2.5 py-2 rounded-xl text-[12px] leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'self-end bg-blue text-white rounded-br-[3px]'
                    : m.role === 'error'
                      ? 'self-start bg-red-light text-[#9B2C2C] rounded-bl-[3px]'
                      : 'self-start bg-surface2 text-ink2 rounded-bl-[3px]'
                }`}
              >
                {m.role === 'user' ? m.text : renderMarkdownLite(m.text)}
              </div>
            ))}
            {busy && (
              <div className="self-start flex flex-col gap-1 px-3 py-2.5 bg-surface2 rounded-xl rounded-bl-[3px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-ink3">Thinking</span>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-[5px] h-[5px] rounded-full bg-ink4 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {!messages.some((m) => m.role === 'user') && (
            <div className="flex-shrink-0 px-3 pt-2 pb-1 border-t border-border flex flex-col gap-1.5">
              <div className="text-[9px] font-bold tracking-wide uppercase text-ink4 mb-0.5">Suggested questions</div>
              {suggestions.map((q) => (
                <button
                  key={q}
                  disabled={busy}
                  onClick={() => send(q)}
                  className="text-left font-sans px-2.5 py-1.5 border border-border rounded-md bg-surface text-[11px] text-ink2 transition-colors hover:border-purple hover:text-purple hover:bg-purple-light disabled:opacity-40 disabled:cursor-default"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="flex-shrink-0 px-3 pt-2 pb-3 flex gap-1.5">
            <input
              type="text"
              value={input}
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(input) }}
              placeholder="Ask about your data…"
              className="flex-1 px-2.5 py-2 border border-border rounded-md bg-surface text-ink text-[11.5px] outline-none focus:border-purple disabled:bg-surface2 disabled:text-ink4"
            />
            <button
              onClick={() => send(input)}
              disabled={busy}
              className="flex-shrink-0 w-8 h-8 rounded-md bg-purple text-white flex items-center justify-center disabled:opacity-40"
              title="Send"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
