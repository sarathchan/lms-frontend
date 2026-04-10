import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'
import { cn } from '../../lib/utils'

type Daily = {
  streak: number
  longestStreak: number
  dailyTarget: number
  questionsDone: number
  targetCompleted: boolean
  studySeconds: number
  questions: {
    id: string
    prompt: string
    options: unknown
    subject: string
    chapter: string
  }[]
}

export function NeetDailyPage() {
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const focusSubject = params.get('subject') ?? undefined
  const [answers, setAnswers] = useState<Record<string, number | null>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['neet', 'daily', focusSubject],
    queryFn: async () => {
      const q = focusSubject ? `?subject=${encodeURIComponent(focusSubject)}` : ''
      const { data } = await api.get<Daily>(`neet/daily${q}`)
      return data
    },
  })

  const submit = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ correct: number; total: number; accuracy: number }>(
        'neet/daily/submit',
        { answers },
      )
      return data
    },
    onSuccess: (res) => {
      toast.success(
        `Score: ${res.correct}/${res.total} (${Math.round(res.accuracy)}% accuracy)`,
      )
      void qc.invalidateQueries({ queryKey: ['neet'] })
      setAnswers({})
    },
  })

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const mins = Math.floor(data.studySeconds / 60)

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <Link
          to="/neet"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          ← NEET hub
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text)]">Daily practice</h1>
        <p className="mt-1 text-[var(--muted)]">
          {data.questionsDone} / {data.dailyTarget} questions today ·{' '}
          {mins} min study streak tracked
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Flame className="h-5 w-5 text-[var(--primary)]" />
            <span className="text-sm font-semibold">Streak</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--primary)]">
            {data.streak}
            <span className="ml-1 text-sm font-medium text-[var(--muted)]">days</span>
          </p>
          <p className="text-xs text-[var(--muted)]">
            Best: {data.longestStreak} days
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:col-span-2">
          <p className="text-sm font-semibold text-[var(--text)]">Today&apos;s set</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {data.targetCompleted
              ? 'Target met — optional extra practice below.'
              : 'Answer and submit to update your streak and daily target.'}
          </p>
        </div>
      </div>

      <ul className="space-y-6">
        {data.questions.map((q, i) => {
          const opts = q.options as string[]
          return (
            <li
              key={q.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <p className="text-xs text-[var(--muted)]">
                Q{i + 1} · {q.subject} · {q.chapter}
              </p>
              <p className="mt-2 text-[var(--text)]">{q.prompt}</p>
              <div className="mt-3 space-y-2">
                {opts.map((opt, j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() =>
                      setAnswers((a) => ({ ...a, [q.id]: j }))
                    }
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-left text-sm',
                      answers[q.id] === j
                        ? 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]'
                        : 'border-[var(--border)]',
                    )}
                  >
                    {String.fromCharCode(65 + j)}. {opt}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      <Button
        className="rounded-xl"
        disabled={submit.isPending || Object.keys(answers).length < data.questions.length}
        onClick={() => submit.mutate()}
      >
        Submit daily set
      </Button>
    </div>
  )
}
