import { CartesianGrid } from 'recharts'
import type { ChartThemeColors } from '../../lib/chartTheme'

const GRID_FALLBACK = '#e2e8f0'

export function ThemedCartesianGrid({ c }: { c?: ChartThemeColors }) {
  const stroke = c?.border ?? GRID_FALLBACK
  return (
    <CartesianGrid
      stroke={stroke}
      strokeOpacity={0.45}
      strokeDasharray="3 3"
    />
  )
}
