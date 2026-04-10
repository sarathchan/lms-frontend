import { Atom, Dna, FlaskConical, type LucideIcon } from 'lucide-react'

export const NEET_COURSE_SLUGS = ['physics', 'chemistry', 'biology'] as const
export type NeetCourseSlug = (typeof NEET_COURSE_SLUGS)[number]

export function isNeetCourseSlug(id: string | undefined): id is NeetCourseSlug {
  if (!id) return false
  const s = id.toLowerCase()
  return NEET_COURSE_SLUGS.includes(s as NeetCourseSlug)
}

export function neetCourseLabel(slug: string): string {
  const s = slug.toLowerCase()
  if (s === 'physics') return 'Physics'
  if (s === 'chemistry') return 'Chemistry'
  if (s === 'biology') return 'Biology'
  return slug
}

export function neetCourseIcon(slug: string): LucideIcon {
  const s = slug.toLowerCase()
  if (s === 'physics') return Atom
  if (s === 'chemistry') return FlaskConical
  return Dna
}

/** Tailwind-style accent classes for cards and rings */
export function neetCourseAccent(slug: string): {
  ring: string
  text: string
  bgSoft: string
  border: string
  chart: string
} {
  const s = slug.toLowerCase()
  if (s === 'physics') {
    return {
      ring: 'ring-blue-500/30',
      text: 'text-blue-600 dark:text-blue-400',
      bgSoft: 'bg-blue-500/10',
      border: 'border-blue-200/80 dark:border-blue-900/60',
      chart: '#3b82f6',
    }
  }
  if (s === 'chemistry') {
    return {
      ring: 'ring-emerald-500/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      bgSoft: 'bg-emerald-500/10',
      border: 'border-emerald-200/80 dark:border-emerald-900/60',
      chart: '#10b981',
    }
  }
  return {
    ring: 'ring-violet-500/30',
    text: 'text-violet-600 dark:text-violet-400',
    bgSoft: 'bg-violet-500/10',
    border: 'border-violet-200/80 dark:border-violet-900/60',
    chart: '#8b5cf6',
  }
}
