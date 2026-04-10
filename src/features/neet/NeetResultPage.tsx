import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'
import { ThemedCartesianGrid } from '../../components/charts/RechartsThemed'
import { chartTooltipStyle, useChartTheme } from '../../lib/chartTheme'
import { cn } from '../../lib/utils'
import { BookMarked, Lightbulb, Sparkles, Timer } from 'lucide-react'
import { toast } from 'sonner'

type BreakdownRow = {
  questionId: string
  subject: string
  chapter: string
  prompt: string
  options: string[]
  selectedIndex: number | null
  correctIndex: number | null
  numerical?: boolean
  correctAnswerValue?: number
  userAnswerValue?: number | null
  correct: boolean
  explanation: string
  timeSec: number | null
  highlightSlow: boolean
  mistake: boolean
}

type Result = {
  attemptId: string
  testId: string
  testTitle: string
  score: number | null
  accuracy: number | null
  timeTakenSec: number | null
  rank: number | null
  percentile: number | null
  subjectTimeSec: Record<string, number>
  breakdown: BreakdownRow[]
  rankPrediction: {
    predictedAir: number
    predictedRank: number
    cohortPercentile: number
    cohortSize: number
    aheadOfPct: number
    comparisonLine: string
  } | null
  review: {
    correctCount: number
    wrongCount: number
    slowQuestionIds: string[]
    incorrectQuestionIds: string[]
  }
}

type Weakness = {
  suggestions: { chapter: string; subject: string; message: string; wrongCount: number }[]
}

export function NeetResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const qc = useQueryClient()
  const c = useChartTheme()
  const tip = chartTooltipStyle(c)

  const { data, isLoading } = useQuery({
    queryKey: ['neet', 'result', attemptId],
    queryFn: async () => {
      const { data } = await api.get<Result>(`neet/attempts/${attemptId}/result`)
      return data
    },
    enabled: !!attemptId,
  })

  const { data: weakness } = useQuery({
    queryKey: ['neet', 'weakness'],
    queryFn: async () => {
      const { data } = await api.get<Weakness & { profiles?: { message: string; practiceQuery: string }[] }>(
        'neet/weakness',
      )
      return data
    },
  })

  const bookmark = useMutation({
    mutationFn: async (questionId: string) => {
      await api.post(`neet/questions/${questionId}/bookmark`, { reviseLater: true })
    },
    onSuccess: () => {
      toast.success('Saved to Revise later')
      void qc.invalidateQueries({ queryKey: ['neet', 'revision'] })
    },
  })

  const explain = useMutation({
    mutationFn: async (payload: { questionId: string; askedAboutIndex: number }) => {
      const { data } = await api.post<{ explanation: string }>(
        'neet/tutor/explain-option',
        payload,
      )
      return data.explanation
    },
  })

  const similar = useMutation({
    mutationFn: async (questionId: string) => {
      const { data } = await api.post<{ questions: { prompt: string; options: string[]; correctIndex: number }[] }>(
        'neet/tutor/similar',
        { questionId, count: 3 },
      )
      return data.questions
    },
  })

  if (!attemptId) return <Navigate to="/neet" replace />
  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const subjTime = Object.entries(data.subjectTimeSec || {}).map(([name, sec]) => ({
    name,
    minutes: Math.round(sec / 60),
  }))

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <Link
          to="/neet"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          ← NEET hub
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text)]">{data.testTitle}</h1>
        <p className="mt-1 text-[var(--muted)]">Smart review & insights</p>
      </div>

      {data.rankPrediction && (
        <section className="rounded-2xl border border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))] p-6">
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Sparkles className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold">Rank simulation (cohort)</h2>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Based on {data.rankPrediction.cohortSize} students&apos; best scores on this test.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase text-[var(--muted)]">Predicted AIR</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--text)]">
                ~{data.rankPrediction.predictedAir.toLocaleString()}
              </p>
              <p className="text-xs text-[var(--muted)]">Illustrative (pool size configurable)</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-[var(--muted)]">Cohort rank est.</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--text)]">
                #{data.rankPrediction.predictedRank}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-[var(--muted)]">Ahead of peers</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--primary)]">
                {Math.round(data.rankPrediction.aheadOfPct)}%
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-[var(--text)]">
            {data.rankPrediction.comparisonLine}
          </p>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Score', value: `${Math.round(data.score ?? 0)}%` },
          { label: 'Attempt rank', value: data.rank != null ? `#${data.rank}` : '—' },
          {
            label: 'Percentile (attempts)',
            value: data.percentile != null ? `${Math.round(data.percentile)}%` : '—',
          },
          { label: 'Accuracy', value: `${Math.round(data.accuracy ?? 0)}%` },
        ].map((x) => (
          <div
            key={x.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {x.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-[var(--text)]">{x.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-base font-semibold text-[var(--text)]">Review summary</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <li>
            <span className="text-[var(--muted)]">Correct</span>{' '}
            <span className="font-semibold text-[var(--text)]">{data.review.correctCount}</span>
          </li>
          <li>
            <span className="text-[var(--muted)]">Wrong</span>{' '}
            <span className="font-semibold text-red-600 dark:text-red-400">
              {data.review.wrongCount}
            </span>
          </li>
          <li>
            <span className="text-[var(--muted)]">Slow spots</span>{' '}
            <span className="font-semibold text-[var(--text)]">
              {data.review.slowQuestionIds.length}
            </span>
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to={`/neet/revision`}>Revise bookmarks</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            asChild
            disabled={data.review.incorrectQuestionIds.length === 0}
          >
            <Link to={`/neet/daily`}>Practice daily set</Link>
          </Button>
        </div>
      </section>

      {subjTime.length > 0 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Time per subject</h2>
          <div className="mt-4 h-56 w-full [&_.recharts-surface]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjTime}>
                <ThemedCartesianGrid c={c} />
                <XAxis dataKey="name" stroke={c.border} tick={{ fill: c.muted, fontSize: 11 }} />
                <YAxis
                  stroke={c.border}
                  tick={{ fill: c.muted, fontSize: 11 }}
                  label={{ value: 'min', fill: c.muted, fontSize: 11, angle: -90 }}
                />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="minutes" fill={c.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {weakness && weakness.suggestions.length > 0 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))] p-6">
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Lightbulb className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold">Focus next</h2>
          </div>
          <ul className="mt-4 space-y-2">
            {weakness.suggestions.slice(0, 5).map((s, i) => (
              <li key={i} className="text-sm text-[var(--text)]">
                {s.message}
                <span className="text-[var(--muted)]"> ({s.wrongCount} misses)</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">Question insights</h2>
        <ul className="space-y-6">
          {data.breakdown.map((row, i) => (
            <li
              key={row.questionId}
              className={cn(
                'rounded-2xl border p-4',
                row.mistake
                  ? 'border-amber-500/40 bg-[color-mix(in_srgb,var(--accent-warn-bg)_40%,var(--card))]'
                  : row.highlightSlow
                    ? 'border-blue-500/35'
                    : 'border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium text-[var(--muted)]">
                  Q{i + 1} · {row.subject}
                  {row.highlightSlow && (
                    <span className="ml-2 rounded-md bg-blue-500/15 px-1.5 text-xs text-blue-700 dark:text-blue-300">
                      Slow
                    </span>
                  )}
                  {row.mistake && (
                    <span className="ml-2 rounded-md bg-amber-500/20 px-1.5 text-xs text-amber-800 dark:text-amber-200">
                      Mistake
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {row.timeSec != null && (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                      <Timer className="h-3.5 w-3.5" />
                      {Math.round(row.timeSec)}s
                    </span>
                  )}
                  {!row.correct && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      disabled={bookmark.isPending}
                      onClick={() => bookmark.mutate(row.questionId)}
                    >
                      <BookMarked className="mr-1 h-4 w-4" />
                      Revise later
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-[var(--text)]">{row.prompt}</p>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Your answer:{' '}
                {row.numerical
                  ? row.userAnswerValue != null && row.userAnswerValue !== undefined
                    ? String(row.userAnswerValue)
                    : 'Skipped'
                  : row.selectedIndex != null
                    ? row.options[row.selectedIndex]
                    : 'Skipped'}
              </p>
              <p className="mt-1 text-sm text-[var(--primary)]">
                Correct:{' '}
                {row.numerical
                  ? row.correctAnswerValue != null
                    ? String(row.correctAnswerValue)
                    : '—'
                  : row.correctIndex != null
                    ? row.options[row.correctIndex]
                    : '—'}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{row.explanation}</p>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                {!row.numerical &&
                  row.selectedIndex != null &&
                  row.correctIndex != null &&
                  row.selectedIndex !== row.correctIndex && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-lg"
                    disabled={explain.isPending}
                    onClick={async () => {
                      const text = await explain.mutateAsync({
                        questionId: row.questionId,
                        askedAboutIndex: row.selectedIndex!,
                      })
                      toast.info('Why your option missed', { description: text })
                    }}
                  >
                    Why was my choice wrong?
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={similar.isPending}
                  onClick={async () => {
                    const qs = await similar.mutateAsync(row.questionId)
                    if (!qs.length) {
                      toast.error('Could not generate similar questions')
                      return
                    }
                    toast.info('Similar practice (preview)', {
                      description: qs.map((q, j) => `${j + 1}. ${q.prompt}`).join('\n'),
                    })
                  }}
                >
                  Practice similar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
