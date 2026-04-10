import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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
  rawMarksEarned?: number | null
  maxRawMarks?: number | null
  subjectTimeSec: Record<string, number>
  breakdown: BreakdownRow[]
  weakTopics?: {
    subject: string
    chapter: string
    wrongCount: number
    totalAsked: number
    accuracyPct: number
  }[]
  subjectBreakdown?: {
    subject: string
    correct: number
    total: number
    accuracyPct: number
  }[]
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
    wrongAnsweredCount?: number
    skippedCount?: number
    slowQuestionIds: string[]
    incorrectQuestionIds: string[]
  }
}

/**
 * Route param is named `testId` in the URL for product copy; value is the NEET attempt id.
 */
export function NeetTestAnalysisPage() {
  const { testId: attemptId } = useParams<{ testId: string }>()
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

  const bookmark = useMutation({
    mutationFn: async (questionId: string) => {
      await api.post(`neet/questions/${questionId}/bookmark`, { reviseLater: true })
    },
    onSuccess: () => {
      toast.success('Saved to Revise later')
      void qc.invalidateQueries({ queryKey: ['neet', 'revision'] })
    },
  })

  if (!attemptId) return <Navigate to="/courses" replace />
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

  const timePerQ = data.breakdown.map((b, i) => ({
    q: i + 1,
    sec: b.timeSec != null ? Math.round(b.timeSec) : 0,
  }))

  const subjectAcc =
    data.subjectBreakdown?.map((s) => ({
      name: s.subject,
      acc: s.accuracyPct,
    })) ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <Link
          to="/courses"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          ← Courses
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text)]">Test analysis</h1>
        <p className="mt-1 text-[var(--muted)]">{data.testTitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Score', value: `${Math.round(data.score ?? 0)}%` },
          { label: 'Accuracy', value: `${Math.round(data.accuracy ?? 0)}%` },
          {
            label: 'Time',
            value:
              data.timeTakenSec != null
                ? `${Math.floor(data.timeTakenSec / 60)}m ${data.timeTakenSec % 60}s`
                : '—',
          },
          { label: 'Rank', value: data.rank != null ? `#${data.rank}` : '—' },
        ].map((x) => (
          <div
            key={x.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {x.label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">{x.value}</p>
          </div>
        ))}
      </div>

      {data.rawMarksEarned != null && data.maxRawMarks != null ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            NEET raw marks (+4 / −1 / 0)
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
            {Number.isInteger(data.rawMarksEarned)
              ? data.rawMarksEarned
              : (data.rawMarksEarned as number).toFixed(1)}{' '}
            <span className="text-lg font-semibold text-[var(--muted)]">
              /{' '}
              {Number.isInteger(data.maxRawMarks)
                ? data.maxRawMarks
                : (data.maxRawMarks as number).toFixed(0)}
            </span>
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Correct</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {data.review.correctCount}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Wrong (answered)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
            {data.review.wrongAnsweredCount ?? data.review.wrongCount}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Skipped</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
            {data.review.skippedCount ?? '—'}
          </p>
        </div>
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
        </section>
      )}

      {subjectAcc.length > 0 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Accuracy by subject</h2>
          <div className="mt-4 h-56 w-full [&_.recharts-surface]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectAcc}>
                <ThemedCartesianGrid c={c} />
                <XAxis dataKey="name" stroke={c.border} tick={{ fill: c.muted, fontSize: 11 }} />
                <YAxis
                  stroke={c.border}
                  tick={{ fill: c.muted, fontSize: 11 }}
                  domain={[0, 100]}
                  label={{ value: '%', fill: c.muted, fontSize: 11, angle: -90 }}
                />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="acc" fill={c.primary} radius={[4, 4, 0, 0]} name="Accuracy %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {timePerQ.some((r) => r.sec > 0) && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Time vs question</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Seconds spent per item (order shown)</p>
          <div className="mt-4 h-56 w-full [&_.recharts-surface]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timePerQ}>
                <ThemedCartesianGrid c={c} />
                <XAxis dataKey="q" stroke={c.border} tick={{ fill: c.muted, fontSize: 11 }} />
                <YAxis stroke={c.border} tick={{ fill: c.muted, fontSize: 11 }} />
                <Tooltip contentStyle={tip} />
                <Line type="monotone" dataKey="sec" stroke={c.primary} dot={false} name="Seconds" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

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

      {data.weakTopics && data.weakTopics.length > 0 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))] p-6">
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Lightbulb className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold">Weak topics (this attempt)</h2>
          </div>
          <ul className="mt-4 space-y-2">
            {data.weakTopics.map((w, i) => (
              <li key={i} className="text-sm text-[var(--text)]">
                <span className="font-medium">{w.chapter}</span>
                <span className="text-[var(--muted)]">
                  {' '}
                  · {w.wrongCount} wrong / {w.totalAsked} · {w.accuracyPct}% accuracy
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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
        </ul>
        <div className="mt-4">
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to="/courses">Back to courses</Link>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">Questions</h2>
        <ul className="space-y-6">
          {data.breakdown.map((row, i) => (
            <li
              key={row.questionId}
              className={cn(
                'rounded-2xl border p-4',
                row.mistake
                  ? 'border-amber-500/40 bg-[color-mix(in_srgb,var(--accent-warn-bg)_40%,var(--card))]'
                  : 'border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium text-[var(--muted)]">
                  Q{i + 1} · {row.subject} · {row.chapter}
                </p>
                {row.timeSec != null && (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                    <Timer className="h-3.5 w-3.5" />
                    {Math.round(row.timeSec)}s
                  </span>
                )}
              </div>
              <p className="mt-2 text-[var(--text)]">{row.prompt}</p>
              {!row.correct && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-lg"
                  disabled={bookmark.isPending}
                  onClick={() => bookmark.mutate(row.questionId)}
                >
                  <BookMarked className="mr-1 h-4 w-4" />
                  Revise later
                </Button>
              )}
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{row.explanation}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
