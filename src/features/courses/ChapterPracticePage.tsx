import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'
import { ChevronLeft } from 'lucide-react'

type PracticeRow = {
  id: string
  questionText: string
  type: string
  options?: string[]
  subject: string
  chapter: string
  topic: string
  difficulty: string
  marks: number
}

export function ChapterPracticePage() {
  const { courseId = '', chapterId = '' } = useParams<{
    courseId: string
    chapterId: string
  }>()
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [checked, setChecked] = useState<Record<string, boolean | null>>({})

  const { data: items, isLoading } = useQuery({
    queryKey: ['practice', courseId, chapterId],
    queryFn: async () => {
      const { data } = await api.get<PracticeRow[]>(
        `question-bank/practice/${courseId}/${chapterId}`,
      )
      return data
    },
    enabled: Boolean(courseId && chapterId),
  })

  const evaluate = useMutation({
    mutationFn: async () => {
      const payload = (items ?? [])
        .filter((q) => q.type === 'MCQ' || q.type === 'FILL_BLANK')
        .map((q) => ({
          entryId: q.id,
          answer: answers[q.id] ?? '',
        }))
      const { data } = await api.post<{
        results: { entryId: string; correct: boolean; skipped?: boolean }[]
      }>(`question-bank/practice/${courseId}/evaluate`, { items: payload })
      return data
    },
    onSuccess: (data) => {
      const next: Record<string, boolean | null> = {}
      for (const r of data.results) {
        if (!r.skipped) next[r.entryId] = r.correct
      }
      setChecked(next)
      toast.success('Checked auto-gradable items')
    },
    onError: () => toast.error('Could not evaluate'),
  })

  const correctCount = useMemo(
    () => Object.values(checked).filter((v) => v === true).length,
    [checked],
  )
  const wrongCount = useMemo(
    () => Object.values(checked).filter((v) => v === false).length,
    [checked],
  )

  if (!courseId || !chapterId) {
    return <Navigate to="/courses" replace />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Button variant="ghost" size="sm" className="rounded-xl px-0" asChild>
        <Link
          to={`/courses/${courseId}/chapter/${chapterId}`}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to chapter
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Chapter practice</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Ungraded practice from the approved question bank for this section. Descriptive items are shown for review only.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
          No approved practice items for this chapter yet.
        </p>
      )}

      <ul className="space-y-6">
        {(items ?? []).map((q, i) => (
          <li
            key={q.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <p className="text-xs text-[var(--muted)]">
              {i + 1}. {q.type} · {q.difficulty}
              {q.subject ? ` · ${q.subject}` : ''}
            </p>
            <p className="mt-2 text-[var(--text)]">{q.questionText}</p>
            {q.type === 'MCQ' && q.options && (
              <div className="mt-3 space-y-2">
                {q.options.map((opt, j) => (
                  <label
                    key={j}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === j}
                      onChange={() =>
                        setAnswers((a) => ({ ...a, [q.id]: j }))
                      }
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            {q.type === 'FILL_BLANK' && (
              <input
                className="lms-input mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                placeholder="Your answer"
                value={String(answers[q.id] ?? '')}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
              />
            )}
            {q.type === 'DESCRIPTIVE' && (
              <textarea
                className="lms-input mt-3 min-h-[5rem] w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                placeholder="Draft your answer (not auto-graded here)"
                value={String(answers[q.id] ?? '')}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
              />
            )}
            {checked[q.id] !== undefined && checked[q.id] !== null && (
              <p
                className={
                  checked[q.id]
                    ? 'mt-2 text-sm text-emerald-600 dark:text-emerald-400'
                    : 'mt-2 text-sm text-amber-700 dark:text-amber-300'
                }
              >
                {checked[q.id] ? 'Correct' : 'Incorrect'}
              </p>
            )}
          </li>
        ))}
      </ul>

      {items && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => evaluate.mutate()}
            disabled={evaluate.isPending}
          >
            Check MCQ / fill answers
          </Button>
          {(correctCount > 0 || wrongCount > 0) && (
            <span className="text-sm text-[var(--muted)]">
              {correctCount} correct · {wrongCount} incorrect
            </span>
          )}
        </div>
      )}
    </div>
  )
}
