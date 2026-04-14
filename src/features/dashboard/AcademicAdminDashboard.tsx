import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../../lib/api'
import { DashboardLoadingSkeleton } from '../../components/feedback/DashboardLoadingSkeleton'
import { ThemedCartesianGrid } from '../../components/charts/RechartsThemed'
import { chartTooltipStyle, useChartTheme } from '../../lib/chartTheme'

const card =
  'w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm lg:p-6'

const SUBJ_ICONS: Record<string, string> = {
  PHYSICS: '⚡',
  CHEMISTRY: '🧪',
  BIOLOGY: '🧬',
}

type Dash = {
  role: 'ADMIN'
  metrics: {
    attemptsLast30Days: number
    avgTimeSec: number
    dropOffParticipationPct: number
  }
  charts: {
    scoreDistribution: { label: string; count: number }[]
    subjectBreakdown: {
      subject: string
      accuracyPct: number
      total: number
    }[]
    weakTopics: {
      subject: string
      chapter: string
      accuracyPct: number
      total: number
    }[]
  }
}

export function AcademicAdminDashboard() {
  const c = useChartTheme()
  const tip = chartTooltipStyle(c)
  const { data, isLoading } = useQuery({
    queryKey: ['neet', 'staff-dashboard', 'ADMIN'],
    queryFn: async () => {
      const { data: res } = await api.get<Dash>('neet/staff/dashboard')
      return res
    },
  })

  if (isLoading || !data) {
    return <DashboardLoadingSkeleton variant="admin" />
  }

  const scoreDistribution = data.charts?.scoreDistribution ?? []
  const subjectBreakdown = data.charts?.subjectBreakdown ?? []
  const weakTopics = data.charts?.weakTopics ?? []

  const colors = [c.chartBlue, c.chartGreen, c.chartPurple]

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] lg:text-2xl">
          Academic overview
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          NEET performance — subjects, accuracy, and weak chapters.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        <div className={card}>
          <p className="text-xs font-medium uppercase text-[var(--muted)]">
            Attempts (30d)
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {data.metrics.attemptsLast30Days}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-medium uppercase text-[var(--muted)]">
            Avg. time / attempt
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {Math.floor(data.metrics.avgTimeSec / 60)}m {data.metrics.avgTimeSec % 60}s
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-medium uppercase text-[var(--muted)]">
            Recent activity share
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {data.metrics.dropOffParticipationPct}%
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">vs older attempts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <div className={card}>
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Score distribution (30d)
          </h2>
          <div className="mt-4 h-56 min-h-0 w-full min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution}>
                <ThemedCartesianGrid c={c} />
                <XAxis dataKey="label" tick={{ fill: c.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: c.muted, fontSize: 10 }} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="count" fill={c.chartAmber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={card}>
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Subject accuracy
          </h2>
          <div className="mt-4 h-56 min-h-0 w-full min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectBreakdown} layout="vertical">
                <ThemedCartesianGrid c={c} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: c.muted, fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="subject"
                  width={88}
                  tick={{ fill: c.muted, fontSize: 11 }}
                  tickFormatter={(v: string) =>
                    `${SUBJ_ICONS[v] ?? ''} ${v}`.trim()
                  }
                />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="accuracyPct" radius={[0, 4, 4, 0]}>
                  {subjectBreakdown.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={card}>
        <h2 className="text-sm font-semibold text-[var(--text)]">
          Weak topics (chapter-wise)
        </h2>
        <ul className="mt-4 space-y-2">
          {weakTopics.map((w, i) => (
            <li
              key={`${w.subject}-${w.chapter}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm"
            >
              <span>
                <span className="mr-2">{SUBJ_ICONS[w.subject] ?? '•'}</span>
                <span className="font-medium text-[var(--text)]">{w.chapter}</span>
                <span className="ml-2 text-[var(--muted)]">({w.subject})</span>
              </span>
              <span className="tabular-nums text-amber-700 dark:text-amber-300">
                {w.accuracyPct}% · n={w.total}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
