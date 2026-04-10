import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'
import { Label } from '../../components/ui/label'
import { Plus, Upload } from 'lucide-react'
import type { CourseBankListItem } from './questionTypes'
import { paginatedData } from '../../lib/paginated'

const panel =
  'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm'

function previewText(s: string, max = 72) {
  const t = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

type CourseRow = { id: string; title: string }

export function QuestionBankPage() {
  const qc = useQueryClient()

  const [courseId, setCourseId] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [subject, setSubject] = useState('')
  const [chapter, setChapter] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [qType, setQType] = useState('')
  const [approved, setApproved] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: coursesRes } = useQuery({
    queryKey: ['courses', 'bank-picker'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CourseRow[] }>('courses', {
        params: { limit: 100, page: 1 },
      })
      return paginatedData(data)
    },
  })

  const { data: courseDetail } = useQuery({
    queryKey: ['course', courseId, 'bank'],
    queryFn: async () => {
      const { data } = await api.get<{
        modules: { id: string; title: string }[]
      }>(`courses/${courseId}`)
      return data
    },
    enabled: Boolean(courseId),
  })

  useEffect(() => {
    setModuleId('')
  }, [courseId])

  const params = useMemo(() => {
    const p: Record<string, string> = { page: String(page), pageSize: '15' }
    if (courseId) p.courseId = courseId
    if (moduleId) p.moduleId = moduleId
    if (subject.trim()) p.subject = subject.trim()
    if (chapter.trim()) p.chapter = chapter.trim()
    if (topic.trim()) p.topic = topic.trim()
    if (difficulty) p.difficulty = difficulty
    if (qType) p.type = qType
    if (approved === 'yes') p.isApproved = 'true'
    if (approved === 'no') p.isApproved = 'false'
    if (search.trim()) p.search = search.trim()
    return p
  }, [
    page,
    courseId,
    moduleId,
    subject,
    chapter,
    topic,
    difficulty,
    qType,
    approved,
    search,
  ])

  const { data, isLoading } = useQuery({
    queryKey: ['question-bank', 'entries', params],
    queryFn: async () => {
      const { data: res } = await api.get<{
        page: number
        pageSize: number
        total: number
        items: CourseBankListItem[]
      }>('question-bank/entries', { params })
      return res
    },
  })

  const approve = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`question-bank/entries/${id}/approve`)
    },
    onSuccess: () => {
      toast.success('Approved')
      void qc.invalidateQueries({ queryKey: ['question-bank'] })
    },
    onError: () => toast.error('Approve failed'),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`question-bank/entries/${id}`)
    },
    onSuccess: () => {
      toast.success('Deleted')
      void qc.invalidateQueries({ queryKey: ['question-bank'] })
    },
    onError: () => toast.error('Delete failed'),
  })

  const modules = courseDetail?.modules ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Question bank
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Course-linked items for practice and assessments (MCQ, fill-in, descriptive).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to="/questions/bulk">
              <Upload className="mr-2 h-4 w-4" />
              Bulk CSV
            </Link>
          </Button>
          <Button className="rounded-xl" asChild>
            <Link
              to={
                courseId && moduleId
                  ? `/questions/new?courseId=${courseId}&moduleId=${moduleId}`
                  : '/questions/new'
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add question
            </Link>
          </Button>
        </div>
      </div>

      <div className={panel}>
        <p className="mb-4 text-sm font-medium text-[var(--text)]">Filters</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div>
            <Label className="text-xs text-[var(--muted)]">Course</Label>
            <select
              className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              value={courseId}
              onChange={(e) => {
                setPage(1)
                setCourseId(e.target.value)
              }}
            >
              <option value="">All (org)</option>
              {(coursesRes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-[var(--muted)]">Chapter (module)</Label>
            <select
              className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              value={moduleId}
              disabled={!courseId}
              onChange={(e) => {
                setPage(1)
                setModuleId(e.target.value)
              }}
            >
              <option value="">All modules</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-[var(--muted)]">Subject</Label>
            <input
              className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              value={subject}
              onChange={(e) => {
                setPage(1)
                setSubject(e.target.value)
              }}
              placeholder="Taxonomy"
            />
          </div>
          <div>
            <Label className="text-xs text-[var(--muted)]">Chapter label</Label>
            <input
              className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              value={chapter}
              onChange={(e) => {
                setPage(1)
                setChapter(e.target.value)
              }}
              placeholder="Contains…"
            />
          </div>
          <div>
            <Label className="text-xs text-[var(--muted)]">Topic</Label>
            <input
              className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              value={topic}
              onChange={(e) => {
                setPage(1)
                setTopic(e.target.value)
              }}
              placeholder="Contains…"
            />
          </div>
          <div>
            <Label className="text-xs text-[var(--muted)]">Difficulty</Label>
            <select
              className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              value={difficulty}
              onChange={(e) => {
                setPage(1)
                setDifficulty(e.target.value)
              }}
            >
              <option value="">All</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-[var(--muted)]">Type</Label>
            <select
              className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              value={qType}
              onChange={(e) => {
                setPage(1)
                setQType(e.target.value)
              }}
            >
              <option value="">All</option>
              <option value="MCQ">MCQ</option>
              <option value="FILL_BLANK">Fill blank</option>
              <option value="DESCRIPTIVE">Descriptive</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-[var(--muted)]">Approved</Label>
            <select
              className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              value={approved}
              onChange={(e) => {
                setPage(1)
                setApproved(e.target.value)
              }}
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <Label className="text-xs text-[var(--muted)]">Search</Label>
            <input
              className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              placeholder="Question text…"
            />
          </div>
        </div>
      </div>

      <div className={panel + ' overflow-x-auto p-0'}>
        {isLoading ? (
          <div className="p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-4 h-64 w-full" />
          </div>
        ) : (
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_6%,var(--card))]">
              <tr>
                <th className="px-4 py-3 font-medium">Question</th>
                <th className="px-4 py-3 font-medium">Course / chapter</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Difficulty</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border)]/80 hover:bg-[color-mix(in_srgb,var(--muted)_5%,transparent)]"
                >
                  <td className="max-w-[280px] px-4 py-3 text-[var(--text)]">
                    {previewText(row.questionText)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    <span className="block font-medium text-[var(--text)]">
                      {row.course.title}
                    </span>
                    {row.module.title}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{row.subject}</td>
                  <td className="px-4 py-3">{row.type}</td>
                  <td className="px-4 py-3">{row.difficulty}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        row.isApproved
                          ? 'rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300'
                          : 'rounded-md border border-[var(--border)] px-2 py-0.5 text-xs'
                      }
                    >
                      {row.isApproved ? 'Approved' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="rounded-lg" asChild>
                      <Link to={`/questions/${row.id}/edit`}>Edit</Link>
                    </Button>
                    {!row.isApproved && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="ml-1 rounded-lg"
                        disabled={approve.isPending}
                        onClick={() => approve.mutate(row.id)}
                      >
                        Approve
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 rounded-lg text-red-600"
                      onClick={() => {
                        if (confirm('Delete this bank entry?')) remove.mutate(row.id)
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data &&
          (() => {
            const totalPages =
              Math.ceil(data.total / data.pageSize) || 1
            if (totalPages <= 1) return null
            return (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-sm">
            <span className="text-[var(--muted)]">
              Page {data.page} of {totalPages} ({data.total} total)
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
            )
          })()}
      </div>
    </div>
  )
}
