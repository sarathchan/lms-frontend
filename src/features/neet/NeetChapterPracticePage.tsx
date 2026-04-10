import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'
import { cn } from '../../lib/utils'
import { isNeetCourseSlug, neetCourseAccent, neetCourseLabel } from './neetCourseTheme'

type PackQ = {
  id: string
  prompt: string
  options: string[]
  bankType: string
  bankDifficulty: string
  isPyq: boolean
  pyqYear: number | null
  numerical: boolean
}

type Pack = {
  subject: string
  chapter: string
  questions: PackQ[]
}

export function NeetChapterPracticePage() {
  const { courseId = '', chapterId = '' } = useParams<{
    courseId: string
    chapterId: string
  }>()
  const [search] = useSearchParams()
  const reviewOnly = search.get('review') === '1'
  const [difficulty, setDifficulty] = useState('')
  const [pyqOnly, setPyqOnly] = useState(false)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [revealData, setRevealData] = useState<{
    correctIndex: number | null
    explanation: string
    bankType: string
  } | null>(null)
  const [timesSec, setTimesSec] = useState<Record<string, number>>({})
  const [questionStarted, setQuestionStarted] = useState(() => Date.now())
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, number | null>>({})
  const qc = useQueryClient()

  if (!isNeetCourseSlug(courseId)) {
    return <Navigate to="/courses" replace />
  }
  const slug = courseId.toLowerCase()
  const accent = neetCourseAccent(slug)
  const courseTitle = neetCourseLabel(slug)

  const chapterSeg = encodeURIComponent(chapterId)

  const packKey = useMemo(
    () => ['neet', 'practice-pack', slug, chapterId, difficulty, pyqOnly, reviewOnly] as const,
    [slug, chapterId, difficulty, pyqOnly, reviewOnly],
  )

  const { data: pack, isLoading, refetch, isFetching } = useQuery({
    queryKey: packKey,
    queryFn: async () => {
      const { data } = await api.get<Pack>(
        `neet/learner/courses/${slug}/chapters/${chapterSeg}/practice-pack`,
        {
          params: {
            limit: 15,
            ...(difficulty ? { difficulty } : {}),
            ...(pyqOnly ? { pyqOnly: '1' } : {}),
            ...(reviewOnly ? { reviewOnly: '1' } : {}),
          },
        },
      )
      return data
    },
  })

  const questions = pack?.questions ?? []

  useEffect(() => {
    setIndex(0)
    setSelected(null)
    setRevealed(false)
    setRevealData(null)
    setSessionAnswers({})
    setTimesSec({})
    setQuestionStarted(Date.now())
  }, [pack?.chapter, pack?.questions?.length, slug, chapterId])

  const revealMut = useMutation({
    mutationFn: async (questionId: string) => {
      const { data } = await api.post<{
        correctIndex: number | null
        explanation: string
        bankType: string
      }>('neet/learner/practice/reveal', { questionId })
      return data
    },
    onError: () => toast.error('Could not load explanation'),
  })

  const submitMut = useMutation({
    mutationFn: async (payload: {
      answers: Record<string, number | null>
      timesSec: Record<string, number>
    }) => {
      const { data } = await api.post<{ correct: number; total: number; accuracy: number }>(
        'neet/learner/practice/submit',
        payload,
      )
      return data
    },
    onSuccess: (res) => {
      toast.success(`Session saved · ${res.correct}/${res.total} correct`)
      void qc.invalidateQueries({ queryKey: ['neet', 'learner'] })
    },
    onError: () => toast.error('Could not save session'),
  })

  const q = questions[index]

  const bumpTime = () => {
    if (!q) return
    const now = Date.now()
    const delta = Math.max(0, (now - questionStarted) / 1000)
    setTimesSec((prev) => ({ ...prev, [q.id]: (prev[q.id] || 0) + delta }))
    setQuestionStarted(now)
  }

  const pickAndRecord = async (optIdx: number) => {
    if (!q || revealed) return
    bumpTime()
    setSelected(optIdx)
    setSessionAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
    const res = await revealMut.mutateAsync(q.id)
    setRevealData(res)
    setRevealed(true)
  }

  const goNextOrFinish = () => {
    if (!q) return
    bumpTime()
    if (index >= questions.length - 1) {
      if (Object.keys(sessionAnswers).length === 0) {
        toast.error('Answer at least one question before finishing.')
        return
      }
      submitMut.mutate({ answers: sessionAnswers, timesSec })
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
    setRevealed(false)
    setRevealData(null)
    setQuestionStarted(Date.now())
  }

  if (isLoading || !pack) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-96 rounded-2xl" />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-6 p-6 text-center">
        <p className="text-[var(--muted)]">
          {reviewOnly
            ? 'No review items yet for this chapter. Practice or take a test first.'
            : 'No questions match these filters for this chapter.'}
        </p>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link to={`/courses/${slug}`}>Back to {courseTitle}</Link>
        </Button>
      </div>
    )
  }

  const correct =
    q && revealData && !q.numerical && revealData.correctIndex != null
      ? selected === revealData.correctIndex
      : null

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_94%,transparent)] px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className={cn('text-xs font-semibold uppercase tracking-wide', accent.text)}>
              Practice · {courseTitle}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {pack.chapter} · Q {index + 1}/{questions.length}
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to={`/courses/${slug}`}>Exit</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <span className="w-full text-xs font-medium text-[var(--muted)]">Filters</span>
          <select
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value)
              void refetch()
            }}
          >
            <option value="">All difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pyqOnly}
              onChange={(e) => {
                setPyqOnly(e.target.checked)
                void refetch()
              }}
            />
            PYQ only
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-xl"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            New set
          </Button>
        </div>

        {q && (
          <article className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex flex-wrap gap-2 text-xs">
              {q.isPyq && (
                <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-medium text-amber-800 dark:text-amber-200">
                  PYQ{q.pyqYear ? ` ${q.pyqYear}` : ''}
                </span>
              )}
              <span className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[var(--muted)]">
                {q.bankDifficulty}
              </span>
            </div>
            <p className="text-lg leading-relaxed">{q.prompt}</p>

            {!q.numerical ? (
              <ul className="space-y-2">
                {q.options.map((opt, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      disabled={revealed}
                      onClick={() => void pickAndRecord(i)}
                      className={cn(
                        'w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                        revealed && revealData?.correctIndex === i
                          ? 'border-emerald-500/60 bg-emerald-500/10'
                          : revealed && selected === i
                            ? 'border-red-500/50 bg-red-500/10'
                            : 'border-[var(--border)] hover:bg-[color-mix(in_srgb,var(--muted)_8%,transparent)]',
                      )}
                    >
                      <span className="font-medium text-[var(--muted)]">
                        {String.fromCharCode(65 + i)}.
                      </span>{' '}
                      {opt}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Use Test mode for numerical problems — full working space and timer.
              </p>
            )}

            {revealed && revealData && (
              <div
                className={cn(
                  'rounded-xl border p-4 text-sm',
                  correct === true
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : correct === false
                      ? 'border-red-500/40 bg-red-500/5'
                      : 'border-[var(--border)]',
                )}
              >
                <p className="font-semibold text-[var(--text)]">Explanation</p>
                <p className="mt-2 whitespace-pre-wrap text-[var(--muted)]">
                  {revealData.explanation}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                className="rounded-xl"
                disabled={!revealed || submitMut.isPending}
                onClick={() => goNextOrFinish()}
              >
                {index >= questions.length - 1 ? 'Finish session' : 'Next question'}
              </Button>
            </div>
          </article>
        )}
      </div>
    </div>
  )
}
