import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { paginatedData } from '../../lib/paginated'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  Bookmark,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileText,
  Mic,
  Play,
  UserPlus,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { AssignCourseModal } from './AssignCourseModal'
import {
  CourseStructureEditor,
  type EditorModRow,
} from './CourseStructureEditor'
import { AiAssessmentPanel } from './AiAssessmentPanel'
import { CourseCover } from '../../components/visual/CourseCover'
import { cn } from '../../lib/utils'
import { formatCourseProgressLabel } from '../../lib/formatCourseProgressLabel'

function lessonTypeIcon(type: string) {
  const cls = 'h-5 w-5 shrink-0'
  switch (type) {
    case 'VIDEO':
      return <Play className={cn(cls, 'text-indigo-600 dark:text-indigo-400')} />
    case 'DOCUMENT':
      return <FileText className={cn(cls, 'text-sky-600 dark:text-sky-400')} />
    case 'QUIZ':
      return <Brain className={cn(cls, 'text-violet-600 dark:text-violet-400')} />
    case 'VOICE':
      return <Mic className={cn(cls, 'text-rose-600 dark:text-rose-400')} />
    default:
      return <BookOpen className={cn(cls, 'text-slate-500 dark:text-slate-400')} />
  }
}

function lessonTypeLabel(type: string) {
  switch (type) {
    case 'VIDEO':
      return 'Video'
    case 'DOCUMENT':
      return 'Document'
    case 'QUIZ':
      return 'Assessment'
    case 'VOICE':
      return 'Audio'
    default:
      return type
  }
}

export function CourseDetailPage() {
  const { courseId: id } = useParams<{ courseId: string }>()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isStaff =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'INSTRUCTOR'

  const [assignOpen, setAssignOpen] = useState(false)

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const { data } = await api.get(`courses/${id}`)
      return data
    },
    enabled: !!id,
  })

  const { data: progress } = useQuery({
    queryKey: ['progress', 'course', id],
    queryFn: async () => {
      const { data } = await api.get(`progress/courses/${id}`)
      return data
    },
    enabled: !!id && user?.role === 'STUDENT',
  })

  const { data: outline } = useQuery({
    queryKey: ['progress', 'outline', id],
    queryFn: async () => {
      const { data } = await api.get<{
        modules: { lessons: { id: string; completed: boolean }[] }[]
      }>(`progress/courses/${id}/outline`)
      return data
    },
    enabled: !!id && user?.role === 'STUDENT',
  })

  const completedByLesson = useMemo(() => {
    const m = new Map<string, boolean>()
    if (!outline?.modules) return m
    for (const mod of outline.modules) {
      for (const les of mod.lessons) {
        m.set(les.id, les.completed)
      }
    }
    return m
  }, [outline])

  const { data: enrollPage } = useQuery({
    queryKey: ['enrollments', id],
    queryFn: async () => {
      const { data } = await api.get(`enrollments/courses/${id}`, {
        params: { page: 1, limit: 100 },
      })
      return data
    },
    enabled: !!id && isStaff,
  })

  const bookmark = useMutation({
    mutationFn: async (lessonId: string) => {
      await api.post(`bookmarks/${lessonId}`)
    },
    onSuccess: () => {
      toast.success('Bookmarked')
      void qc.invalidateQueries({ queryKey: ['bookmarks'] })
    },
  })

  const unassign = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`enrollments/courses/${id}/users/${userId}`),
    onSuccess: () => {
      toast.success('Removed enrollment')
      void qc.invalidateQueries({ queryKey: ['enrollments', id] })
    },
  })

  const togglePublish = useMutation({
    mutationFn: (published: boolean) =>
      api.patch(`courses/${id}`, { published }),
    onSuccess: () => {
      toast.success('Course updated')
      void qc.invalidateQueries({ queryKey: ['course', id] })
      void qc.invalidateQueries({ queryKey: ['courses'] })
    },
  })

  if (isLoading || !course) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  const modules = (course.modules ?? []) as EditorModRow[]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-8"
    >
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/[0.05] dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,320px)_1fr]">
          {id && (
            <CourseCover
              courseId={id}
              title={course.title}
              aspectClass="aspect-[16/10] min-h-[200px] lg:min-h-full lg:aspect-auto lg:min-h-[240px]"
              className="rounded-none lg:rounded-l-2xl lg:rounded-r-none"
            />
          )}
          <div className="flex flex-col justify-center p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {course.title}
                </h1>
                <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  {course.description?.trim() ||
                    'Explore modules below and learn at your own pace.'}
                </p>
              </div>
              {isStaff && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={course.published ? 'secondary' : 'default'}
                    size="sm"
                    className="rounded-xl"
                    onClick={() => togglePublish.mutate(!course.published)}
                    disabled={togglePublish.isPending}
                  >
                    {course.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setAssignOpen(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Assign
                  </Button>
                </div>
              )}
            </div>
            {progress && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>Your progress</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <motion.div
                    className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500"
                    initial={false}
                    animate={{ width: `${progress.percent}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formatCourseProgressLabel(progress)}
                  {progress.courseComplete && (
                    <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
                      · Complete
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {isStaff && id && (
        <AssignCourseModal
          courseId={id}
          open={assignOpen}
          onOpenChange={setAssignOpen}
        />
      )}

      {isStaff &&
        paginatedData(enrollPage).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assigned learners</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {(paginatedData(enrollPage) as { user: { id: string; email: string; firstName: string; lastName: string } }[]).map(
                (row) => (
                  <li
                    key={row.user.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span>
                      {row.user.firstName} {row.user.lastName}{' '}
                      <span className="text-slate-500">({row.user.email})</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => unassign.mutate(row.user.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ),
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {isStaff && id && (
        <>
          <CourseStructureEditor courseId={id} modules={modules} />
          <AiAssessmentPanel courseId={id} />
        </>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Course content
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Expand a module to see lessons. Icons show lesson type.
          </p>
        </div>
        <div className="space-y-3">
          {modules
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((mod, mi) => (
              <details
                key={mod.id}
                open={mi === 0}
                className="group rounded-2xl border border-slate-200/90 bg-white shadow-sm open:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-semibold text-slate-900 transition hover:bg-slate-50/80 dark:text-white dark:hover:bg-slate-800/50 [&::-webkit-details-marker]:hidden">
                  <span>{mod.title}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <ul className="space-y-2 border-t border-slate-100 px-3 pb-4 pt-2 dark:border-slate-800">
                  {mod.lessons
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((lesson) => {
                      const done =
                        user?.role === 'STUDENT'
                          ? (completedByLesson.get(lesson.id) ?? false)
                          : false
                      return (
                        <li key={lesson.id}>
                          <Card className="rounded-xl border-slate-200/80 transition-all duration-200 hover:border-indigo-200 hover:shadow-md dark:border-slate-700 dark:hover:border-indigo-900">
                            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                                  {lessonTypeIcon(lesson.type)}
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {done ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                                    )}
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                      {lesson.title}
                                    </p>
                                  </div>
                                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    {lessonTypeLabel(lesson.type)}
                                    {lesson.durationSec
                                      ? ` · ${Math.round(lesson.durationSec / 60)} min`
                                      : ''}
                                  </p>
                                </div>
                              </div>
                              {(user?.role === 'STUDENT' || isStaff) && id && (
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    asChild
                                    size="sm"
                                    className="rounded-xl"
                                    variant={isStaff ? 'outline' : 'default'}
                                  >
                                    <Link
                                      to={`/learn/${id}/${mod.id}/${lesson.id}`}
                                    >
                                      {isStaff ? 'Preview' : 'Open lesson'}
                                    </Link>
                                  </Button>
                                  {user?.role === 'STUDENT' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="rounded-xl"
                                      onClick={() => bookmark.mutate(lesson.id)}
                                      aria-label="Bookmark"
                                    >
                                      <Bookmark className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </li>
                      )
                    })}
                </ul>
              </details>
            ))}
        </div>
      </section>
    </motion.div>
  )
}
