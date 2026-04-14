import { useQuery } from '@tanstack/react-query'
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
import { DashboardLoadingSkeleton } from '../../components/feedback/DashboardLoadingSkeleton'
import { ThemedCartesianGrid } from '../../components/charts/RechartsThemed'
import { chartTooltipStyle, useChartTheme } from '../../lib/chartTheme'

const card =
  'w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm lg:p-6'

type Dash = {
  role: 'SUPER_ADMIN'
  metrics: {
    totalUsers: number
    totalNeetQuestions: number
    totalNeetTests: number
    totalNeetAttempts: number
  }
  charts: {
    userGrowth: { date: string; newUsers: number }[]
    testAttemptsTrend: { date: string; attempts: number }[]
    questionUsageStats: {
      questionId: string
      useCount: number
      preview: string
      subject?: string
    }[]
  }
}

export function SuperAdminDashboard() {
  const c = useChartTheme()
  const tip = chartTooltipStyle(c)
  const { data, isLoading } = useQuery({
    queryKey: ['neet', 'staff-dashboard', 'SUPER_ADMIN'],
    queryFn: async () => {
      const { data: res } = await api.get<Dash>('neet/staff/dashboard')
      return res
    },
  })

  if (isLoading || !data) {
    return <DashboardLoadingSkeleton variant="admin" />
  }

  const userGrowth = data.charts?.userGrowth ?? []
  const testAttemptsTrend = data.charts?.testAttemptsTrend ?? []
  const questionUsageStats = data.charts?.questionUsageStats ?? []

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] lg:text-2xl">
          System overview
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Platform-wide metrics and NEET activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
        <div className={card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Total users
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">
            {data.metrics.totalUsers}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            NEET questions
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">
            {data.metrics.totalNeetQuestions}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            NEET tests
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">
            {data.metrics.totalNeetTests}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Test attempts
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text)]">
            {data.metrics.totalNeetAttempts}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <div className={card}>
          <h2 className="text-sm font-semibold text-[var(--text)]">User growth (30d)</h2>
          <div className="mt-4 h-56 min-h-0 w-full min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowth}>
                <ThemedCartesianGrid c={c} />
                <XAxis dataKey="date" tick={{ fill: c.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: c.muted, fontSize: 10 }} />
                <Tooltip contentStyle={tip} />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke={c.chartBlue}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={card}>
          <h2 className="text-sm font-semibold text-[var(--text)]">
            NEET attempts trend (30d)
          </h2>
          <div className="mt-4 h-56 min-h-0 w-full min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={testAttemptsTrend}>
                <ThemedCartesianGrid c={c} />
                <XAxis dataKey="date" tick={{ fill: c.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: c.muted, fontSize: 10 }} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="attempts" fill={c.chartGreen} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={card}>
        <h2 className="text-sm font-semibold text-[var(--text)]">
          Question reuse (top linked)
        </h2>
        <ul className="mt-4 space-y-2 text-sm">
          {questionUsageStats.map((q) => (
            <li
              key={q.questionId}
              className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-2"
            >
              <span className="text-[var(--text)]">{q.preview}</span>
              <span className="shrink-0 tabular-nums text-[var(--muted)]">
                ×{q.useCount}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
