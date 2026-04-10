import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { paginatedData } from '../../lib/paginated'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { useAuthStore } from '../../stores/authStore'
import { Plus } from 'lucide-react'
import { CourseCover } from '../../components/visual/CourseCover'
import { EmptyCoursesArt } from '../../components/visual/EmptyCoursesArt'
import { cn } from '../../lib/utils'

type CourseListStatus = 'all' | 'published' | 'draft' | 'unpublished'

function courseVisibilityBadge(c: {
  published: boolean
  _count?: { modules?: number }
}): { label: string; className: string } {
  if (c.published) {
    return {
      label: 'Published',
      className:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    }
  }
  const modules = c._count?.modules ?? 0
  if (modules === 0) {
    return {
      label: 'Draft',
      className:
        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    }
  }
  return {
    label: 'Unpublished',
    className:
      'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  }
}

export function CoursesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isStaff =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'INSTRUCTOR'
  const isStudent = user?.role === 'STUDENT'

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [courseStatus, setCourseStatus] = useState<CourseListStatus>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [examTypeId, setExamTypeId] = useState('')
  const [subjectId, setSubjectId] = useState('')

  const { data: examTypes } = useQuery({
    queryKey: ['exam-types'],
    queryFn: async () => {
      const { data } = await api.get<
        { id: string; name: string; slug: string }[]
      >('exam-types')
      return data
    },
    enabled: isStaff && createOpen,
  })

  const { data: subjectsForExam } = useQuery({
    queryKey: ['exam-types', examTypeId, 'subjects'],
    queryFn: async () => {
      const { data } = await api.get<
        { id: string; name: string; iconEmoji: string | null }[]
      >(`exam-types/${examTypeId}/subjects`)
      return data
    },
    enabled: isStaff && createOpen && !!examTypeId,
  })

  const { data: dash } = useQuery({
    queryKey: ['analytics', 'user'],
    queryFn: async () => {
      const { data } = await api.get<{
        enrolled: { courseId: string; progressPct: number }[]
      }>('analytics/user')
      return data
    },
    enabled: isStudent,
  })

  const progressByCourse = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of dash?.enrolled ?? []) {
      m.set(e.courseId, e.progressPct)
    }
    return m
  }, [dash?.enrolled])

  const { data, isLoading } = useQuery({
    queryKey: ['courses', page, search, isStaff ? courseStatus : 'student'],
    queryFn: async () => {
      const { data } = await api.get('courses', {
        params: {
          page,
          limit: 12,
          search: search || undefined,
          ...(isStaff && courseStatus !== 'all'
            ? { courseStatus }
            : {}),
        },
      })
      return data
    },
  })

  const createMut = useMutation({
    mutationFn: () =>
      api.post('courses', {
        title: title.trim(),
        description: description.trim() || undefined,
        published: false,
        examTypeId,
        subjectId,
      }),
    onSuccess: (res) => {
      const newId = (res.data as { id: string }).id
      toast.success('Course created')
      setCreateOpen(false)
      setTitle('')
      setDescription('')
      setExamTypeId('')
      setSubjectId('')
      void qc.invalidateQueries({ queryKey: ['courses'] })
      void navigate(`/courses/${newId}`)
    },
  })

  const rows = paginatedData<{
    id: string
    title: string
    description: string | null
    published: boolean
    _count?: { enrollments: number; modules: number }
  }>(data)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1>Courses</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Discover content, track progress, and jump back in anytime.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Search courses…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full min-w-[10rem] max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          {isStaff && (
            <select
              aria-label="Filter by course status"
              value={courseStatus}
              onChange={(e) => {
                setCourseStatus(e.target.value as CourseListStatus)
                setPage(1)
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="all">All courses</option>
              <option value="published">Published</option>
              <option value="draft">Draft (no modules)</option>
              <option value="unpublished">Unpublished (has modules)</option>
            </select>
          )}
          {isStaff && (
            <Button type="button" onClick={() => setCreateOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4" />
              New course
            </Button>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create course</DialogTitle>
          </DialogHeader>
          <label className="grid gap-1 text-sm">
            Exam type
            <select
              className="lms-input"
              value={examTypeId}
              onChange={(e) => {
                setExamTypeId(e.target.value)
                setSubjectId('')
              }}
            >
              <option value="">Select…</option>
              {(examTypes ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Subject
            <select
              className="lms-input"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={!examTypeId}
            >
              <option value="">Select…</option>
              {(subjectsForExam ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Title
            <input
              className="lms-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Description (optional)
            <textarea
              className="lms-input min-h-[5rem] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !title.trim() || !examTypeId || !subjectId || createMut.isPending
              }
              onClick={() => createMut.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <EmptyCoursesArt className="mb-4 h-28 w-36 opacity-80" />
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            No courses match your search
          </p>
          <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            {isStaff && courseStatus !== 'all'
              ? 'No courses match this status filter. Try another filter or clear search.'
              : 'Try another keyword or clear the search to see the full catalog.'}
          </p>
          {search || (isStaff && courseStatus !== 'all') ? (
            <Button
              type="button"
              variant="outline"
              className="mt-6 rounded-xl"
              onClick={() => {
                setSearch('')
                if (isStaff) setCourseStatus('all')
                setPage(1)
              }}
            >
              {search && isStaff && courseStatus !== 'all'
                ? 'Clear search & filter'
                : search
                  ? 'Clear search'
                  : 'Show all courses'}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((c, i) => {
              const pct = progressByCourse.get(c.id)
              const showProgress = isStudent && pct !== undefined
              const vis = courseVisibilityBadge(c)
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                >
                  <Link
                    to={`/courses/${c.id}`}
                    className={cn(
                      'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition',
                      'hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10',
                      'dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800',
                    )}
                  >
                    <CourseCover
                      courseId={c.id}
                      title={c.title}
                      aspectClass="aspect-[16/10]"
                      className="rounded-none"
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
                        {c.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {c.description?.trim() || 'Open to view modules and lessons.'}
                      </p>
                      {showProgress && (
                        <div className="mt-4">
                          <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
                            <span>Your progress</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                            vis.className,
                          )}
                        >
                          {vis.label}
                        </span>
                        {c._count != null && (
                          <span className="text-xs text-slate-500">
                            {c._count.enrollments} learners
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <span className="flex items-center px-2 text-sm text-slate-500">
                {page} / {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
