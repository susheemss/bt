import { useState } from 'react'
import { MessageSquare, X } from 'lucide-react'

/* Showcase only, ported from the same concept in the HTML build: a
   floating preview of a future conversational capability. Fixed Q&A pairs,
   entirely self-contained -- no connection to the live store data, so it
   can never be mistaken for the app answering with real numbers. The panel
   says so explicitly. */
const QA: { q: string; a: string }[] = [
  {
    q: 'Why would a SKU get flagged Replenish?',
    a: 'Once wired to your live data, I’d flag Replenish whenever net requirement is above zero — sensed demand over lead time plus safety stock exceeds on-hand plus in-transit — and point you straight to the store, SKU and month where that crossed the ROP line.',
  },
  {
    q: 'How would you pick which lanes to consolidate?',
    a: 'I’d group net requirements across stores sharing a DC route and compare FTL, FTL-consolidated and Milk-run options, recommending whichever combination pushes truck fill toward the 85% target without exceeding any store’s open-to-ship headroom.',
  },
  {
    q: 'How would you explain a demand uplift?',
    a: 'I’d break the gap between sensed and baseline demand down by signal — promo, festival, weather, trend or event — so you can see which one is actually driving that month’s number instead of just the net percentage.',
  },
  {
    q: 'What would a redeploy recommendation look like?',
    a: 'Redeploy means one store is sitting on well above its sensed demand while another is short. I’d suggest moving the excess between the two stores directly instead of raising a fresh DC order for the short one.',
  },
  {
    q: 'Will this answer questions about my actual data?',
    a: 'That’s the plan for this panel — once connected, I’d query the same demand and inventory files driving the charts above and answer with your real numbers, not these pre-written examples.',
  },
]

type Msg = { role: 'bot' | 'user'; text: string }

export default function ChatPreview() {
  const [open, setOpen] = useState(false)
  const [opened, setOpened] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [asked, setAsked] = useState<number[]>([])
  const [typing, setTyping] = useState(false)

  function handleOpen() {
    setOpen(true)
    if (!opened) {
      setOpened(true)
      setMessages([{ role: 'bot', text: 'Hi — this is a preview of an AI assistant we plan to build for this cockpit. Tap a question below to see the kind of answer it would give.' }])
    }
  }

  function ask(i: number) {
    if (typing || asked.includes(i)) return
    const pair = QA[i]
    setAsked((a) => [...a, i])
    setMessages((m) => [...m, { role: 'user', text: pair.q }])
    setTyping(true)
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'bot', text: pair.a }])
      setTyping(false)
    }, 550 + Math.random() * 350)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed right-5 bottom-5 z-[150] w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg transition-transform hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg, #6C5CE7, #2E6BE6)', boxShadow: '0 6px 18px rgba(124,58,237,.35), 0 2px 6px rgba(15,23,40,.15)' }}
        title="AI Assistant (preview)"
      >
        <MessageSquare size={21} className="text-white" strokeWidth={2} />
        <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-green border-2 border-white" />
      </button>

      {open && (
        <div
          className="fixed right-5 bottom-[84px] z-[150] w-[340px] max-w-[calc(100vw-40px)] h-[460px] max-h-[calc(100vh-120px)] bg-surface border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="h-[3px] flex-shrink-0" style={{ background: 'linear-gradient(90deg, #6C5CE7, #2E6BE6, #6C5CE7)' }} />
          <div className="px-3.5 py-3 border-b border-border flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-purple-light flex items-center justify-center flex-shrink-0 text-purple">
              <MessageSquare size={13} />
            </div>
            <div>
              <div className="text-[12.5px] font-bold text-ink">AI Supply Chain Assistant</div>
              <div className="text-[10px] text-ink4 mt-0.5">Preview · pre-built questions</div>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto w-[22px] h-[22px] rounded flex items-center justify-center text-ink4 hover:bg-surface2 hover:text-ink2 flex-shrink-0">
              <X size={13} />
            </button>
          </div>

          <div className="mx-3 mt-2.5 px-2.5 py-1.5 border border-dashed border-purple rounded-md bg-purple-light text-[10px] leading-snug flex-shrink-0" style={{ color: '#5B3FC4' }}>
            Showcasing a future capability. Answers below are pre-written examples, not live results from your data.
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[86%] px-2.5 py-2 rounded-xl text-[12px] leading-relaxed ${
                  m.role === 'bot'
                    ? 'self-start bg-surface2 text-ink2 rounded-bl-[3px]'
                    : 'self-end bg-blue text-white rounded-br-[3px]'
                }`}
              >
                {m.text}
              </div>
            ))}
            {typing && (
              <div className="self-start flex items-center gap-1 px-3 py-2.5 bg-surface2 rounded-xl rounded-bl-[3px]">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-[5px] h-[5px] rounded-full bg-ink4 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 px-3 pt-2 pb-1 border-t border-border flex flex-col gap-1.5">
            <div className="text-[9px] font-bold tracking-wide uppercase text-ink4 mb-0.5">Try asking</div>
            {QA.map((pair, i) => (
              <button
                key={i}
                disabled={asked.includes(i) || typing}
                onClick={() => ask(i)}
                className="text-left font-sans px-2.5 py-1.5 border border-border rounded-md bg-surface text-[11px] text-ink2 transition-colors hover:border-purple hover:text-purple hover:bg-purple-light disabled:opacity-40 disabled:cursor-default"
              >
                {pair.q}
              </button>
            ))}
          </div>
          <div className="flex-shrink-0 px-3 pt-2 pb-3">
            <div className="flex-1 px-2.5 py-2 border border-border rounded-md bg-surface2 text-ink4 text-[11.5px] cursor-not-allowed select-none">
              Free-text chat — coming soon
            </div>
          </div>
        </div>
      )}
    </>
  )
}
