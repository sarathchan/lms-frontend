/** Human-readable progress line: separates learning lessons from QUIZ assessments. */
export function formatCourseProgressLabel(p: {
  completedLessons: number
  totalLessons: number
  completedLearningLessons?: number
  totalLearningLessons?: number
  completedAssessments?: number
  totalAssessments?: number
}): string {
  const ta = p.totalAssessments ?? 0
  const ca = p.completedAssessments ?? 0
  const tl = p.totalLearningLessons
  const cl = p.completedLearningLessons

  if (ta === 0 || tl === undefined || cl === undefined) {
    const total = p.totalLessons
    const done = p.completedLessons
    return `${done}/${total} ${total === 1 ? 'lesson' : 'lessons'}`
  }

  if (tl === 0 && ta > 0) {
    return `${ca}/${ta} ${ta === 1 ? 'assessment' : 'assessments'}`
  }

  const parts: string[] = []
  parts.push(`${cl}/${tl} ${tl === 1 ? 'lesson' : 'lessons'}`)
  parts.push(`${ca}/${ta} ${ta === 1 ? 'assessment' : 'assessments'}`)
  return parts.join(' · ')
}
