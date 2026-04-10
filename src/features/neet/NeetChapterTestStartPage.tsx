import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { isNeetCourseSlug, neetCourseLabel } from './neetCourseTheme'

export function NeetChapterTestStartPage() {
  const { courseId = '', chapterId = '' } = useParams<{
    courseId: string
    chapterId: string
  }>()
  const navigate = useNavigate()

  if (!isNeetCourseSlug(courseId)) {
    return <Navigate to="/courses" replace />
  }
  const slug = courseId.toLowerCase()
  const title = neetCourseLabel(slug)
  const chapterSeg = encodeURIComponent(chapterId)

  const start = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ attemptId: string }>(
        `neet/learner/courses/${slug}/chapters/${chapterSeg}/start-test`,
      )
      return data
    },
    onSuccess: (data) => {
      navigate(`/neet/exam/${data.attemptId}`, {
        replace: true,
        state: {
          exitTo: `/courses/${slug}`,
          courseLabel: title,
        },
      })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : 'Could not start test'
      toast.error(msg || 'Could not start test')
    },
  })

  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    start.mutate()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg)] px-6 text-center">
      <div className="w-full max-w-sm space-y-4">
        <p className="text-sm font-medium text-[var(--primary)]">Chapter test</p>
        <h1 className="text-xl font-semibold text-[var(--text)]">{title}</h1>
        <p className="text-sm text-[var(--muted)]">
          Preparing timed test with question palette and autosave…
        </p>
        <Skeleton className="h-12 w-full rounded-xl" />
        {start.isError && (
          <Button variant="outline" className="w-full rounded-xl" asChild>
            <Link to={`/courses/${slug}`}>Back to course</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
