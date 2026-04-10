/** Deterministic branded cover gradients from course id (no external images). */
const PALETTES: [string, string, string][] = [
  ['#4f46e5', '#6366f1', '#818cf8'],
  ['#4338ca', '#4f46e5', '#6366f1'],
  ['#0d9488', '#14b8a6', '#5eead4'],
  ['#0f766e', '#0d9488', '#2dd4bf'],
  ['#7c3aed', '#8b5cf6', '#c4b5fd'],
  ['#5b21b6', '#7c3aed', '#a78bfa'],
  ['#2563eb', '#3b82f6', '#93c5fd'],
  ['#1d4ed8', '#2563eb', '#60a5fa'],
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function courseCoverGradient(id: string): string {
  const [a, b, c] = PALETTES[hashId(id) % PALETTES.length]!
  return `linear-gradient(135deg, ${a} 0%, ${b} 48%, ${c} 100%)`
}

export function courseInitial(title: string): string {
  const t = title.trim()
  return t ? t.charAt(0).toUpperCase() : '?'
}
