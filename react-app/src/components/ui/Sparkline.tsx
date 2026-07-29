interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  fill?: boolean
}

export default function Sparkline({ data, width = 72, height = 24, color = '#2E6BE6', fill = true }: SparklineProps) {
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1 || 1)
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - ((v - min) / range) * (height - 4)).toFixed(1)}`)

  return (
    <svg width={width} height={height} className="block" aria-hidden>
      {fill && (
        <polygon
          points={`0,${height} ${pts.join(' ')} ${width},${height}`}
          fill={color}
          opacity={0.08}
        />
      )}
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle
        cx={width}
        cy={height - 2 - ((data[data.length - 1] - min) / range) * (height - 4)}
        r={2}
        fill={color}
      />
    </svg>
  )
}
