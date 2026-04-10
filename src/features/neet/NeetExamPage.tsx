import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'
import { cn } from '../../lib/utils'

type Q = {
  id: string
  order: number
  subject: string
  chapter: string
  topic?: string
  bankType?: string
  difficulty: number | string
  numerical?: boolean
  prompt: string
  options: string[]
  marks?: number
  negativeMarks?: number
}

type AttemptPayload = {
  attemptId: string
  test: { id: string; title: string; durationMins: number; type: string }
  questions: Q[]
  answers: Record<string, number | null>
  startedAt: string
}

export function NeetExamPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const location = useLocation()
  const exitTo =
    (location.state as { exitTo?: string } | undefined)?.exitTo ?? '/courses'
  const qc = useQueryClient()
  const [index, setIndex] = useState(0)
  const [marked, setMarked] = useState<Record<string, boolean>>({})
  const [remain, setRemain] = useState<number | null>(null)
  const autoRef = useRef(false)
  const questionTimes = useRef<Record<string, number>>({})
  const lastSwitchAt = useRef(Date.now())
  const prevIndexRef = useRef(0)

  const subjectTimers = useRef<Record<string, number>>({
    PHYSICS: 0,
    CHEMISTRY: 0,
    BIOLOGY: 0,
  })
  const lastTick = useRef<number>(Date.now())
  const qIndexRef = useRef(0)

  const { data, isLoading, error } = useQuery({
    queryKey: ['neet', 'attempt', attemptId],
    queryFn: async () => {
      const { data } = await api.get<AttemptPayload>(`neet/attempts/${attemptId}`)
      return data
    },
    enabled: !!attemptId,
    retry: false,
  })

  const sorted = useMemo(
    () => (data?.questions ? [...data.questions].sort((a, b) => a.order - b.order) : []),
    [data?.questions],
  )

  const answers = useMemo(() => data?.answers ?? {}, [data?.answers])

  useEffect(() => {
    qIndexRef.current = index
  }, [index])

  useEffect(() => {
    const now = Date.now()
    const prevQ = sorted[prevIndexRef.current]
    if (prevQ && index !== prevIndexRef.current) {
      const delta = Math.max(0, (now - lastSwitchAt.current) / 1000)
      questionTimes.current[prevQ.id] =
        (questionTimes.current[prevQ.id] || 0) + delta
    }
    prevIndexRef.current = index
    lastSwitchAt.current = now
  }, [index, sorted])

  useEffect(() => {
    if (!data?.test?.durationMins || !data.startedAt) {
      setRemain(null)
      return
    }
    const limitSec = data.test.durationMins * 60
    const started = new Date(data.startedAt).getTime()
    const tick = () => {
      const elapsed = Math.floor((Date.now() - started) / 1000)
      setRemain(Math.max(0, limitSec - elapsed))
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [data?.test?.durationMins, data?.startedAt])

  useEffect(() => {
    const id = window.setInterval(() => {
      const cur = sorted[qIndexRef.current]
      if (!cur) return
      const now = Date.now()
      const delta = Math.max(0, (now - lastTick.current) / 1000)
      lastTick.current = now
      const subj = cur.subject
      if (subjectTimers.current[subj] !== undefined) {
        subjectTimers.current[subj] += delta
      }
    }, 1000)
    return () => clearInterval(id)
  }, [sorted])

  const patch = useMutation({
    mutationFn: async (next: Record<string, number | null>) => {
      await api.patch(`neet/attempts/${attemptId}`, { answers: next })
    },
    onError: () => toast.error('Could not save answer'),
  })

  const submit = useMutation({
    mutationFn: async (timedOut: boolean) => {
      const curQ = sorted[index]
      if (curQ) {
        const delta = Math.max(
          0,
          (Date.now() - lastSwitchAt.current) / 1000,
        )
        questionTimes.current[curQ.id] =
          (questionTimes.current[curQ.id] || 0) + delta
        lastSwitchAt.current = Date.now()
      }
      const subj: Record<string, number> = {}
      for (const k of Object.keys(subjectTimers.current)) {
        const v = subjectTimers.current[k]
        if (v > 0) subj[k] = Math.round(v)
      }
      const qt: Record<string, number> = {}
      for (const [qid, sec] of Object.entries(questionTimes.current)) {
        if (sec > 0) qt[qid] = Math.round(sec * 10) / 10
      }
      const { data: res } = await api.post(`neet/attempts/${attemptId}/submit`, {
        timedOut,
        subjectTimeSec: subj,
        questionTimeSec: qt,
      })
      return res
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['neet'] })
      window.location.replace(`/analysis/${attemptId}`)
    },
  })

  const setAnswer = useCallback(
    (qid: string, value: number | null) => {
      const next = { ...answers, [qid]: value }
      patch.mutate(next)
      void qc.setQueryData<AttemptPayload>(['neet', 'attempt', attemptId], (old) =>
        old ? { ...old, answers: next } : old,
      )
    },
    [answers, attemptId, patch, qc],
  )

  useEffect(() => {
    if (remain !== 0 || remain === null || autoRef.current || submit.isPending) return
    autoRef.current = true
    submit.mutate(true)
  }, [remain, submit])

  if (!attemptId) return <Navigate to="/courses" replace />
  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="mt-4 h-96" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-8 text-center text-[var(--muted)]">
        Could not load attempt.{' '}
        <Link className="text-[var(--primary)] underline" to={exitTo}>
          Back
        </Link>
      </div>
    )
  }

  const q = sorted[index]
  const mm = remain === null ? '—' : String(Math.floor(remain / 60)).padStart(2, '0')
  const ss = remain === null ? '—' : String(remain % 60).padStart(2, '0')

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {data.test.title}
            </p>
            <p className="text-sm text-[var(--muted)]">
              Q {index + 1} / {sorted.length}
            </p>
          </div>
          <div
            className={cn(
              'rounded-xl border px-4 py-2 font-mono text-lg tabular-nums',
              remain !== null && remain < 300
                ? 'border-red-500/50 text-red-600 dark:text-red-400'
                : 'border-[var(--border)]',
            )}
          >
            {mm}:{ss}
          </div>
          <Button
            variant="outline"
            className="rounded-xl"
            asChild
          >
            <Link to={exitTo}>Exit</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_220px]">
        <main className="min-w-0 space-y-6">
          {q && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2 py-0.5 font-medium text-[var(--primary)]">
                  {q.subject}
                </span>
                <span className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[var(--muted)]">
                  {q.chapter}
                </span>
              </div>
              <p className="text-lg leading-relaxed text-[var(--text)]">{q.prompt}</p>
              {q.numerical || q.bankType === 'NUMERICAL' ? (
                <div className="space-y-2">
                  <label className="block text-sm text-[var(--muted)]">
                    Enter numerical answer
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full max-w-xs rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--text)]"
                    value={
                      answers[q.id] === null || answers[q.id] === undefined
                        ? ''
                        : String(answers[q.id])
                    }
                    onChange={(e) => {
                      const raw = e.target.value.trim()
                      if (raw === '') {
                        setAnswer(q.id, null)
                        return
                      }
                      const n = parseFloat(raw)
                      if (!Number.isNaN(n)) setAnswer(q.id, n)
                    }}
                  />
                </div>
              ) : (
                <ul className="space-y-2">
                  {q.options.map((opt, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => setAnswer(q.id, i)}
                        className={cn(
                          'w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                          answers[q.id] === i
                            ? 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]'
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
              )}
              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={index === 0}
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                >
                  Previous
                </Button>
                <Button
                  className="rounded-xl"
                  disabled={index >= sorted.length - 1}
                  onClick={() => setIndex((i) => Math.min(sorted.length - 1, i + 1))}
                >
                  Next
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() =>
                    setMarked((m) => ({
                      ...m,
                      [q.id]: !m[q.id],
                    }))
                  }
                >
                  {marked[q.id] ? 'Unmark review' : 'Mark for review'}
                </Button>
                <Button
                  className="ml-auto rounded-xl"
                  onClick={() => submit.mutate(false)}
                  disabled={submit.isPending}
                >
                  Submit test
                </Button>
              </div>
            </>
          )}
        </main>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Questions
          </p>
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-5">
            {sorted.map((qq, i) => {
              const done =
                answers[qq.id] !== undefined &&
                answers[qq.id] !== null &&
                !(typeof answers[qq.id] === 'number' && Number.isNaN(answers[qq.id] as number))
              return (
                <button
                  key={qq.id}
                  type="button"
                  title={qq.subject}
                  onClick={() => setIndex(i)}
                  className={cn(
                    'aspect-square rounded-lg text-xs font-medium transition-colors',
                    i === index
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : done
                        ? 'bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[var(--text)]'
                        : 'border border-[var(--border)] bg-[var(--card)] text-[var(--muted)]',
                    marked[qq.id] && i !== index && 'ring-2 ring-amber-400/80',
                  )}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Answers autosave. Timer ends the test automatically.
          </p>
        </aside>
      </div>
    </div>
  )
}
