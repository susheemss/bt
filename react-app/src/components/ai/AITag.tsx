import { Sparkles } from 'lucide-react'

interface AITagProps {
  label?: string
}

export default function AITag({ label = 'AI technology' }: AITagProps) {
  return (
    <span className="ai-tag">
      <Sparkles size={9} strokeWidth={2.5} />
      {label}
    </span>
  )
}
