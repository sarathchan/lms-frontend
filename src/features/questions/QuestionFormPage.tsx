import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Skeleton } from '../../components/ui/Skeleton'
import { ArrowLeft } from 'lucide-react'
import type { CourseBankDetail } from './questionTypes'
import { paginatedData } from '../../lib/paginated'

const panel =
  'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm'

type CourseRow = { id: string; title: string }

export function QuestionFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: coursesRes } = useQuery({
    queryKey: ['courses', 'form-picker'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CourseRow[] }>('courses', {
        params: { limit: 100, page: 1 },
      })
      return paginatedData(data)
    },
  })

  const [courseId, setCourseId] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [explanation, setExplanation] = useState('')
  const [subject, setSubject] = useState('')
  const [chapter, setChapter] = useState('')
  const [topic, setTopic] = useState('')
  const [qType, setQType] = useState<'MCQ' | 'FILL_BLANK' | 'DESCRIPTIVE'>('MCQ')
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM')
  const [options, setOptions] = useState('A\nB\nC\nD')
  const [correctIndex, setCorrectIndex] = useState(0)
  const [blanks, setBlanks] = useState('answer')
  const [tags, setTags] = useState('')
  const [marks, setMarks] = useState(1)
  const [negativeMarks, setNegativeMarks] = useState(0)
  const [isApproved, setIsApproved] = useState(false)

  const { data: courseDetail } = useQuery({
    queryKey: ['course', courseId, 'form'],
    queryFn: async () => {
      const { data } = await api.get<{
        modules: { id: string; title: string }[]
      }>(`courses/${courseId}`)
      return data
    },
    enabled: Boolean(courseId),
  })

  const { data: existing, isLoading } = useQuery({
    queryKey: ['question-bank', 'entry', id],
    queryFn: async () => {
      const { data } = await api.get<CourseBankDetail>(`question-bank/entries/${id}`)
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    const c = searchParams.get('courseId')
    const m = searchParams.get('moduleId')
    if (c && !isEdit) setCourseId(c)
    if (m && !isEdit) setModuleId(m)
  }, [searchParams, isEdit])

  useEffect(() => {
    if (!existing) return
    setCourseId(existing.courseId)
    setModuleId(existing.moduleId)
    setQuestionText(existing.questionText)
    setExplanation(existing.explanation ?? '')
    setSubject(existing.subject)
    setChapter(existing.chapter)
    setTopic(existing.topic)
    setQType(existing.type as typeof qType)
    setDifficulty(existing.difficulty as typeof difficulty)
    const op = (existing.options as string[] | null) ?? []
    if (op.length) setOptions(op.join('\n'))
    setCorrectIndex(existing.correctIndex ?? 0)
    const bl = (existing.blanks as string[] | null) ?? []
    if (bl.length) setBlanks(bl.join(','))
    setTags((existing.tags || []).join(', '))
    setMarks(existing.marks)
    setNegativeMarks(existing.negativeMarks)
    setIsApproved(existing.isApproved)
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      const tagList = tags
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean)
      const base = {
        courseId,
        moduleId,
        questionText,
        explanation: explanation || undefined,
        subject: subject.trim(),
        chapter: chapter.trim(),
        topic: topic.trim(),
        type: qType,
        difficulty,
        marks,
        negativeMarks,
        tags: tagList,
        isApproved,
      }
      if (qType === 'MCQ') {
        Object.assign(base, {
          options: options.split('\n').map((s) => s.trim()).filter(Boolean),
          correctIndex,
        })
      }
      if (qType === 'FILL_BLANK') {
        Object.assign(base, {
          blanks: blanks.split(',').map((s) => s.trim()).filter(Boolean),
        })
      }
      if (isEdit) {
        await api.patch(`question-bank/entries/${id}`, base)
      } else {
        await api.post('question-bank/entries', base)
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Saved' : 'Created')
      void qc.invalidateQueries({ queryKey: ['question-bank'] })
      navigate('/questions')
    },
    onError: () => toast.error('Save failed'),
  })

  const canSave = useMemo(() => {
    if (!courseId || !moduleId || !questionText.trim()) return false
    if (qType === 'MCQ') {
      const opts = options.split('\n').map((s) => s.trim()).filter(Boolean)
      if (opts.length < 2) return false
      if (correctIndex < 0 || correctIndex >= opts.length) return false
    }
    if (qType === 'FILL_BLANK') {
      const b = blanks.split(',').map((s) => s.trim()).filter(Boolean)
      if (!b.length) return false
    }
    return true
  }, [courseId, moduleId, questionText, qType, options, correctIndex, blanks])

  const modules = courseDetail?.modules ?? []

  if (isEdit && isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-96 w-full max-w-xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <Button variant="ghost" size="sm" className="rounded-xl" asChild>
        <Link to="/questions">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Question bank
        </Link>
      </Button>
      <h1 className="text-xl font-semibold text-[var(--text)]">
        {isEdit ? 'Edit bank question' : 'New bank question'}
      </h1>

      <div className={panel + ' grid gap-4'}>
        <div>
          <Label>Course</Label>
          <select
            className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
            value={courseId}
            disabled={isEdit}
            onChange={(e) => {
              setCourseId(e.target.value)
              setModuleId('')
            }}
          >
            <option value="">Select course</option>
            {(coursesRes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Chapter (module)</Label>
          <select
            className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
            value={moduleId}
            disabled={isEdit || !courseId}
            onChange={(e) => setModuleId(e.target.value)}
          >
            <option value="">Select module</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Subject</Label>
            <input
              className="lms-input mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <Label>Chapter label</Label>
            <input
              className="lms-input mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
            />
          </div>
          <div>
            <Label>Topic</Label>
            <input
              className="lms-input mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Type</Label>
          <select
            className="lms-input mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={qType}
            onChange={(e) => setQType(e.target.value as typeof qType)}
          >
            <option value="MCQ">MCQ</option>
            <option value="FILL_BLANK">Fill blank</option>
            <option value="DESCRIPTIVE">Descriptive</option>
          </select>
        </div>
        <div>
          <Label>Difficulty</Label>
          <select
            className="lms-input mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={difficulty}
            onChange={(e) =>
              setDifficulty(e.target.value as typeof difficulty)
            }
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div>
          <Label>Question</Label>
          <textarea
            className="lms-input mt-1 min-h-[6rem] w-full rounded-lg border px-3 py-2 text-sm"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </div>
        {qType === 'MCQ' && (
          <>
            <div>
              <Label>Options (one per line)</Label>
              <textarea
                className="lms-input mt-1 min-h-[5rem] w-full rounded-lg border px-3 py-2 text-sm"
                value={options}
                onChange={(e) => setOptions(e.target.value)}
              />
            </div>
            <div>
              <Label>Correct index (0-based)</Label>
              <input
                type="number"
                min={0}
                className="lms-input mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={correctIndex}
                onChange={(e) => setCorrectIndex(+e.target.value)}
              />
            </div>
          </>
        )}
        {qType === 'FILL_BLANK' && (
          <div>
            <Label>Accepted answers (comma-separated)</Label>
            <input
              className="lms-input mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={blanks}
              onChange={(e) => setBlanks(e.target.value)}
            />
          </div>
        )}
        <div>
          <Label>Explanation (optional)</Label>
          <textarea
            className="lms-input mt-1 min-h-[3rem] w-full rounded-lg border px-3 py-2 text-sm"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Marks</Label>
            <input
              type="number"
              step="0.5"
              className="lms-input mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={marks}
              onChange={(e) => setMarks(+e.target.value)}
            />
          </div>
          <div>
            <Label>Negative marks</Label>
            <input
              type="number"
              step="0.5"
              className="lms-input mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={negativeMarks}
              onChange={(e) => setNegativeMarks(+e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Tags (comma-separated)</Label>
          <input
            className="lms-input mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isApproved}
            onChange={(e) => setIsApproved(e.target.checked)}
          />
          Approved (visible for practice / quiz generation)
        </label>
        <Button disabled={!canSave || save.isPending} onClick={() => save.mutate()}>
          {isEdit ? 'Save changes' : 'Create'}
        </Button>
      </div>
    </div>
  )
}
