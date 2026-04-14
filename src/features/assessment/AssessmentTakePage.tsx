import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'

type Q = {
  id: string
  type: string
  prompt: string
  order: number
  points?: number
  options?: string[]
}

type QuizMeta = {
  quizId: string
  lessonTitle: string
  courseId: string
  timeLimitSec: number | null
  questions: Q[]
}

/** API / Prisma JSON may return options as array or numeric-key object. */
function mcqOptionsFromApi(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.map((x) => String(x ?? ''))
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const keys = Object.keys(o)
    if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => String(o[k] ?? ''))
    }
  }
  return []
}

export function AssessmentTakePage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [startedAt] = useState(() => Date.now())
  const [remain, setRemain] = useState<number | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<unknown[]>([])
  const autoSubmittedRef = useRef(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['assessment', 'quiz', quizId],
    queryFn: async () => {
      const { data } = await api.get<QuizMeta>(
        `assessments/quizzes/${quizId}`,
        { silent: true },
      )
      return data
    },
    enabled: !!quizId,
    retry: false,
  })

  const sorted = useMemo(
    () => (data?.questions ? [...data.questions].sort((a, b) => a.order - b.order) : []),
    [data?.questions],
  )

  const draftKey = quizId ? `mylms-quiz-draft:${quizId}` : ''

  useEffect(() => {
    if (!sorted.length || !draftKey) return
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown[]
        if (Array.isArray(parsed) && parsed.length === sorted.length) {
          setAnswers(parsed)
          return
        }
      }
    } catch {
      /* ignore */
    }
    setAnswers(sorted.map(() => ''))
  }, [sorted, draftKey])

  useEffect(() => {
    if (!draftKey || !sorted.length) return
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(answers))
      } catch {
        /* ignore */
      }
    }, 800)
    return () => clearTimeout(t)
  }, [answers, draftKey, sorted.length])

  useEffect(() => {
    if (!data?.timeLimitSec) {
      setRemain(null)
      return
    }
    setRemain(data.timeLimitSec)
  }, [data?.timeLimitSec])

  useEffect(() => {
    if (remain === null || remain < 0) return
    const t = setInterval(() => {
      setRemain((r) => (r === null ? r : Math.max(0, r - 1)))
    }, 1000)
    return () => clearInterval(t)
  }, [remain])

  const submit = useMutation({
    mutationFn: async () => {
      const { data: res } = await api.post<{
        attemptId: string
        pass: boolean
        needsManualReview: boolean
      }>(`assessments/quizzes/${quizId}/submit`, {
        answers,
        clientStartedAt: new Date(startedAt).toISOString(),
      })
      return res
    },
    onError: () => {
      toast.error('Could not submit. Check your connection and try again.')
    },
    onSuccess: (res) => {
      try {
        if (draftKey) localStorage.removeItem(draftKey)
      } catch {
        /* ignore */
      }
      void qc.invalidateQueries({ queryKey: ['progress'] })
      void qc.invalidateQueries({ queryKey: ['course'] })
      toast.success(
        res.needsManualReview
          ? 'Submitted for review'
          : res.pass
            ? 'You passed!'
            : 'Results ready',
      )
      navigate(`/assessment/${quizId}/result/${res.attemptId}`, { replace: true })
    },
  })

  useEffect(() => {
    if (
      remain !== 0 ||
      !data?.timeLimitSec ||
      !sorted.length ||
      autoSubmittedRef.current ||
      submit.isPending
    )
      return
    autoSubmittedRef.current = true
    submit.mutate()
  }, [remain, data?.timeLimitSec, sorted.length, submit])

  if (!quizId) return <Navigate to="/courses" replace />
  if (isLoading || !data)
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    )
  if (error) return <Navigate to={`/assessment/${quizId}`} replace />

  const q = sorted[index]
  const mcqOpts =
    q && q.type === 'MCQ' ? mcqOptionsFromApi(q.options) : []

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r.toString().padStart(2, '0')}`
  }

  const answered = (i: number) => {
    const v = answers[i]
    if (v === '' || v === null || v === undefined) return false
    if (typeof v === 'string' && !v.trim()) return false
    return true
  }

  const answeredCount = sorted.reduce((n, _, i) => n + (answered(i) ? 1 : 0), 0)
  const unansweredCount = sorted.length - answeredCount

  const requestSubmit = () => {
    if (unansweredCount > 0) {
      const ok = window.confirm(
        `You have ${unansweredCount} unanswered question${unansweredCount === 1 ? '' : 's'}. Submit anyway?`,
      )
      if (!ok) return
    }
    submit.mutate()
  }

  const progressPct = sorted.length
    ? Math.round(((index + 1) / sorted.length) * 100)
    : 0

  const navDisabled = submit.isPending || (remain !== null && remain <= 0)

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 py-6 pb-36 lg:pb-8">
      <div className="mb-5 w-full space-y-2">
        <div className="mb-2 flex justify-between text-sm font-medium text-[var(--muted)] lg:text-xs">
          <span>
            Question {index + 1} of {sorted.length}
          </span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
          <motion.div
            className="h-full rounded-full bg-[var(--primary)]"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          />
        </div>
        <p className="mt-2 text-sm text-[var(--muted)] lg:text-xs">
          <span className="font-medium text-[var(--text)]">{answeredCount}</span>{' '}
          answered ·{' '}
          <span className="font-medium text-[var(--text)]">{unansweredCount}</span>{' '}
          unanswered
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
      <aside className="w-full shrink-0 lg:w-52">
        <Link
          to={`/assessment/${quizId}`}
          className="mb-4 inline-flex min-h-11 min-w-11 items-center rounded-xl text-base font-medium text-[var(--primary)] transition active:scale-[0.98] hover:bg-[color-mix(in_srgb,var(--muted)_10%,var(--card))] hover:underline"
        >
          ← Intro
        </Link>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Questions
        </p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-5">
          {sorted.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'flex min-h-11 min-w-11 items-center justify-center rounded-xl text-base font-semibold transition-all duration-200 active:scale-95 lg:text-sm',
                i === index
                  ? 'bg-[var(--primary)] text-white shadow-md ring-2 ring-[color-mix(in_srgb,var(--primary)_35%,transparent)]'
                  : answered(i)
                    ? 'bg-[var(--success-bg)] text-[var(--success)]'
                    : 'bg-[color-mix(in_srgb,var(--border)_65%,var(--card))] text-[var(--text)] hover:bg-[var(--border)]',
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 shadow-sm transition-colors duration-200 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[var(--text)] lg:text-2xl">
              {data.lessonTitle}
            </h1>
            <p className="mt-1 text-base leading-relaxed text-[var(--muted)] lg:text-sm">
              Take your time—selected answers are highlighted clearly.
            </p>
          </div>
          {remain !== null && (
            <div
              className={cn(
                'inline-flex min-h-11 min-w-fit items-center justify-center rounded-xl px-4 py-2 text-lg font-mono font-semibold tabular-nums transition-colors',
                remain < 60
                  ? 'bg-[var(--danger-bg)] text-[var(--danger)]'
                  : 'bg-[color-mix(in_srgb,var(--border)_50%,var(--card))] text-[var(--text)]',
              )}
            >
              {fmt(remain)}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-md transition-colors duration-200 sm:p-6">
          {q && (
            <>
              <p className="text-lg font-medium leading-relaxed text-[var(--text)] lg:text-base">
                {q.prompt}
              </p>
              <p className="mt-3 inline-flex min-h-8 items-center rounded-full bg-[color-mix(in_srgb,var(--border)_40%,var(--card))] px-3 py-1 text-sm font-medium text-[var(--muted)]">
                {q.type}
              </p>

              <div className="mt-6 space-y-4">
                {q.type === 'MCQ' && mcqOpts.length > 0 && (
                  <div className="space-y-3" role="radiogroup" aria-label="Answer choices">
                    {mcqOpts.map((opt, j) => (
                      <label
                        key={j}
                        className={cn(
                          'flex min-h-[3.25rem] cursor-pointer items-start gap-4 rounded-2xl border-2 px-4 py-4 text-base leading-relaxed transition-all duration-200 active:scale-[0.99]',
                          answers[index] === j
                            ? 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))] shadow-md ring-2 ring-[color-mix(in_srgb,var(--primary)_28%,transparent)]'
                            : 'border-[var(--border)] hover:border-[color-mix(in_srgb,var(--muted)_40%,var(--border))]',
                        )}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
                          checked={answers[index] === j}
                          onChange={() => {
                            const n = [...answers]
                            n[index] = j
                            setAnswers(n)
                          }}
                        />
                        <span className="flex-1 text-[var(--text)]">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'MCQ' && mcqOpts.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      No answer choices were loaded for this question. Type your
                      answer below; your instructor can review it.
                    </p>
                    <input
                      className="lms-input"
                      placeholder="Your answer"
                      value={String(answers[index] ?? '')}
                      onChange={(e) => {
                        const n = [...answers]
                        n[index] = e.target.value
                        setAnswers(n)
                      }}
                    />
                  </div>
                )}

                {(q.type === 'FILL_BLANK' ||
                  q.type === 'FILE_UPLOAD') && (
                  <input
                    className="lms-input"
                    placeholder={
                      q.type === 'FILE_UPLOAD'
                        ? 'Paste file URL'
                        : 'Your answer'
                    }
                    value={String(answers[index] ?? '')}
                    onChange={(e) => {
                      const n = [...answers]
                      n[index] = e.target.value
                      setAnswers(n)
                    }}
                  />
                )}

                {(q.type === 'DESCRIPTIVE' ||
                  q.type === 'AI_GENERATED' ||
                  q.type === 'VOICE') && (
                  <textarea
                    className="lms-input min-h-[160px] leading-7"
                    value={String(answers[index] ?? '')}
                    onChange={(e) => {
                      const n = [...answers]
                      n[index] = e.target.value
                      setAnswers(n)
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <div className="mt-6 hidden flex-wrap items-center justify-between gap-3 lg:flex">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={index <= 0 || submit.isPending}
            onClick={() => setIndex((i) => i - 1)}
          >
            Previous
          </Button>
          <div className="flex gap-2">
            {index < sorted.length - 1 ? (
              <Button
                className="rounded-xl"
                disabled={submit.isPending}
                onClick={() => setIndex((i) => i + 1)}
              >
                Next
              </Button>
            ) : (
              <Button
                className="rounded-xl"
                loading={submit.isPending}
                disabled={navDisabled}
                onClick={() => requestSubmit()}
              >
                Submit assessment
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Thumb zone: primary navigation (mobile / tablet) */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--card)]/95 p-4 backdrop-blur-md pb-[max(1rem,env(safe-area-inset-bottom,0px))] lg:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="w-full rounded-xl"
              disabled={index <= 0 || submit.isPending}
              onClick={() => setIndex((i) => i - 1)}
            >
              Previous
            </Button>
            {index < sorted.length - 1 ? (
              <Button
                className="w-full rounded-xl"
                disabled={submit.isPending}
                onClick={() => setIndex((i) => i + 1)}
              >
                Next
              </Button>
            ) : (
              <Button
                className="w-full rounded-xl"
                loading={submit.isPending}
                disabled={navDisabled}
                onClick={() => requestSubmit()}
              >
                Submit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
