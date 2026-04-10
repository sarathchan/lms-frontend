import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Brain, ChevronLeft } from 'lucide-react'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'

type CoursePayload = {
  id: string
  title: string
  modules: {
    id: string
    title: string
    order: number
    lessons: {
      id: string
      title: string
      type: string
      order: number
      quiz?: { id: string } | null
    }[]
  }[]
}

export function CourseChapterPage() {
  const { courseId = '', chapterId = '' } = useParams<{
    courseId: string
    chapterId: string
  }>()

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data } = await api.get<CoursePayload>(`courses/${courseId}`)
      return data
    },
    enabled: Boolean(courseId),
  })

  if (!courseId || !chapterId) {
    return <Navigate to="/courses" replace />
  }

  if (isLoading || !course) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  const mod = course.modules.find((m) => m.id === chapterId)
  if (!mod) {
    return <Navigate to={`/courses/${courseId}`} replace />
  }

  const sortedLessons = [...mod.lessons].sort((a, b) => a.order - b.order)

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <Button variant="ghost" size="sm" className="mb-4 rounded-xl px-0" asChild>
          <Link to={`/courses/${courseId}`} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to course
          </Link>
        </Button>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {course.title}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--text)]">{mod.title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Work through lessons and assessments in this section. Weak-area shortcuts from your
          dashboard lead here.
        </p>
        <div className="mt-4">
          <Button variant="secondary" className="rounded-xl" asChild>
            <Link to={`/courses/${courseId}/chapter/${chapterId}/practice`}>
              Practice (question bank)
            </Link>
          </Button>
        </div>
      </div>

      <ul className="space-y-3">
        {sortedLessons.map((lesson) => (
          <li key={lesson.id}>
            <Link
              to={`/learn/${courseId}/${chapterId}/${lesson.id}`}
              className={cn(
                'flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition',
                'hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]',
              )}
            >
              <div>
                <p className="font-medium text-[var(--text)]">{lesson.title}</p>
                <p className="text-xs text-[var(--muted)]">{lesson.type}</p>
              </div>
              {lesson.type === 'QUIZ' && lesson.quiz && (
                <span className="flex items-center gap-1 text-sm text-[var(--primary)]">
                  <Brain className="h-4 w-4" />
                  Quiz
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
