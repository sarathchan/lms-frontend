import type { CSSProperties } from 'react'
import { useSyncExternalStore } from 'react'

function subscribe(onStoreChange: () => void) {
  const el = document.documentElement
  const obs = new MutationObserver(onStoreChange)
  obs.observe(el, { attributes: true, attributeFilter: ['class'] })
  return () => obs.disconnect()
}

function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return v || fallback
}

export type ChartThemeColors = {
  text: string
  muted: string
  border: string
  card: string
  primary: string
  bg: string
  chartBlue: string
  chartGreen: string
  chartAmber: string
  chartRed: string
  chartPurple: string
  chartOrange: string
  chartMid: string
}

const FALLBACK_LIGHT: ChartThemeColors = {
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  card: '#ffffff',
  primary: '#4f46e5',
  bg: '#f8fafc',
  chartBlue: '#2563eb',
  chartGreen: '#16a34a',
  chartAmber: '#ca8a04',
  chartRed: '#dc2626',
  chartPurple: '#7c3aed',
  chartOrange: '#f97316',
  chartMid: '#64748b',
}

/**
 * useSyncExternalStore requires getSnapshot to return a stable reference when
 * underlying data is unchanged. A fresh object each call causes infinite
 * re-renders (Recharts subscribes and amplifies the loop).
 */
let cachedChartTheme: ChartThemeColors = FALLBACK_LIGHT
let cachedChartThemeKey = ''

function readChartThemeSnapshot(): ChartThemeColors {
  if (typeof document === 'undefined') return FALLBACK_LIGHT
  const next: ChartThemeColors = {
    text: readCssVar('--text', FALLBACK_LIGHT.text),
    muted: readCssVar('--muted', FALLBACK_LIGHT.muted),
    border: readCssVar('--border', FALLBACK_LIGHT.border),
    card: readCssVar('--card', FALLBACK_LIGHT.card),
    primary: readCssVar('--primary', FALLBACK_LIGHT.primary),
    bg: readCssVar('--bg', FALLBACK_LIGHT.bg),
    chartBlue: readCssVar('--chart-blue', FALLBACK_LIGHT.chartBlue),
    chartGreen: readCssVar('--chart-green', FALLBACK_LIGHT.chartGreen),
    chartAmber: readCssVar('--chart-amber', FALLBACK_LIGHT.chartAmber),
    chartRed: readCssVar('--chart-red', FALLBACK_LIGHT.chartRed),
    chartPurple: readCssVar('--chart-purple', FALLBACK_LIGHT.chartPurple),
    chartOrange: readCssVar('--chart-orange', FALLBACK_LIGHT.chartOrange),
    chartMid: readCssVar('--chart-mid', FALLBACK_LIGHT.chartMid),
  }
  const key = [
    next.text,
    next.muted,
    next.border,
    next.card,
    next.primary,
    next.bg,
    next.chartBlue,
    next.chartGreen,
    next.chartAmber,
    next.chartRed,
    next.chartPurple,
    next.chartOrange,
    next.chartMid,
  ].join('\0')
  if (key !== cachedChartThemeKey) {
    cachedChartThemeKey = key
    cachedChartTheme = next
  }
  return cachedChartTheme
}

/** Recharts/Nivo: re-read CSS variables whenever .dark toggles. */
export function useChartTheme(): ChartThemeColors {
  return useSyncExternalStore(subscribe, readChartThemeSnapshot, () => FALLBACK_LIGHT)
}

export function chartTooltipStyle(c: ChartThemeColors): CSSProperties {
  return {
    backgroundColor: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    color: c.text,
    boxShadow: `0 4px 12px color-mix(in srgb, ${c.text} 12%, transparent)`,
  }
}

/** Heatmap cells: 0 → border; else mix primary into page bg by intensity. */
export function heatmapCellColor(
  count: number,
  max: number,
  c: ChartThemeColors,
): string {
  if (count <= 0) return c.border
  const t = Math.min(1, count / Math.max(1, max))
  const pct = Math.round(10 + t * 90)
  return `color-mix(in srgb, ${c.primary} ${pct}%, ${c.bg})`
}

