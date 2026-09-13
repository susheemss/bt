import { Fragment } from 'react'

/** Renders **bold** and "- " bullets as real React elements -- no HTML
 *  string is ever built from model output, so there's nothing to escape
 *  and no injection surface, unlike an innerHTML-based approach. Shared by
 *  every panel that renders an LLM's markdown-lite response (the chat
 *  assistant, the redeploy agent). */
export function renderMarkdownLite(text: string) {
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
