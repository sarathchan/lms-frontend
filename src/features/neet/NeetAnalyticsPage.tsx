import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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
import { Skeleton } from '../../components/ui/Skeleton'
import { ThemedCartesianGrid } from '../../components/charts/RechartsThemed'
import { chartTooltipStyle, useChartTheme } from '../../lib/chartTheme'

type Analytics = {
  scoreTrend: { date: string; score: number; testTitle: string }[]
  accuracySeries: { date: string; accuracy: number }[]
  subjectPerformance: { subject: string; pct: number; total: number }[]
  attemptCount: number
}

export function NeetAnalyticsPage() {
  const c = useChartTheme()
  const tip = chartTooltipStyle(c)
  const { data, isLoading } = useQuery({
    queryKey: ['neet', 'analytics'],
    queryFn: async () => {
      const { data } = await api.get<Analytics>('neet/analytics/me')
      return data
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

  const scores = data.scoreTrend.map((d, i) => ({
    n: i + 1,
    score: d.score,
    date: d.date.slice(5),
  }))
  const acc = data.accuracySeries.map((d, i) => ({
    n: i + 1,
    accuracy: d.accuracy,
    date: d.date.slice(5),
  }))
  const subj = data.subjectPerformance.map((s) => ({
    name: s.subject,
    pct: Math.round(s.pct * 10) / 10,
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
        <h1 className="mt-4 text-2xl font-bold text-[var(--text)]">Analytics</h1>
        <p className="mt-1 text-[var(--muted)]">
          {data.attemptCount} completed test{data.attemptCount === 1 ? '' : 's'}
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text)]">Score trend</h2>
        <div className="mt-4 h-56 w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scores}>
              <ThemedCartesianGrid c={c} />
              <XAxis
                dataKey="n"
                stroke={c.border}
                tick={{ fill: c.muted, fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                stroke={c.border}
                tick={{ fill: c.muted, fontSize: 11 }}
              />
              <Tooltip contentStyle={tip} />
              <Line
                type="monotone"
                dataKey="score"
                stroke={c.primary}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text)]">Accuracy</h2>
        <div className="mt-4 h-56 w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={acc}>
              <ThemedCartesianGrid c={c} />
              <XAxis
                dataKey="n"
                stroke={c.border}
                tick={{ fill: c.muted, fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                stroke={c.border}
                tick={{ fill: c.muted, fontSize: 11 }}
              />
              <Tooltip contentStyle={tip} />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke={c.border}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Subject-wise performance
        </h2>
        <div className="mt-4 h-56 w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subj}>
              <ThemedCartesianGrid c={c} />
              <XAxis
                dataKey="name"
                stroke={c.border}
                tick={{ fill: c.muted, fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                stroke={c.border}
                tick={{ fill: c.muted, fontSize: 11 }}
              />
              <Tooltip contentStyle={tip} />
              <Bar dataKey="pct" fill={c.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
