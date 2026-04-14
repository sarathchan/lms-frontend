import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { DashboardLoadingSkeleton } from '../../components/feedback/DashboardLoadingSkeleton'
import { ThemedCartesianGrid } from '../../components/charts/RechartsThemed'
import { chartTooltipStyle, useChartTheme } from '../../lib/chartTheme'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'

const card =
  'w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm lg:p-6'

type Dash = {
  role: 'INSTRUCTOR'
  metrics: {
    questionsCreated: number
    pendingApprovals: number
    completedAttemptsOnMyTests: number
    avgScoreOnTestsWithMyQuestionsPct: number
  }
  charts: {
    difficultyDistribution: { difficulty: string; count: number }[]
  }
}

export function InstructorDashboard() {
  const c = useChartTheme()
  const tip = chartTooltipStyle(c)
  const role = useAuthStore((s) => s.user?.role)
  const userId = useAuthStore((s) => s.user?.id)

  const { data, isLoading } = useQuery({
    queryKey: ['neet', 'staff-dashboard', 'INSTRUCTOR', userId],
    queryFn: async () => {
      const { data: res } = await api.get<Dash>('neet/staff/dashboard')
      return res
    },
    enabled: role === 'INSTRUCTOR' && Boolean(userId),
  })

  if (isLoading || !data) {
    return <DashboardLoadingSkeleton variant="admin" />
  }

  const difficultyDistribution = data.charts?.difficultyDistribution ?? []

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] lg:text-2xl">
            Teaching & content
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Your questions, reviews, and how students perform on tests that include
            them.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full rounded-xl sm:w-auto"
          asChild
        >
          <Link to="/questions/new">Add question</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
        <div className={card}>
          <p className="text-xs font-medium uppercase text-[var(--muted)]">
            Questions created
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {data.metrics.questionsCreated}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-medium uppercase text-[var(--muted)]">
            Pending approval
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">
            {data.metrics.pendingApprovals}
          </p>
          <Button variant="link" className="mt-1 h-auto p-0 text-xs" asChild>
            <Link to="/questions?approvalStatus=PENDING_REVIEW">Review queue</Link>
          </Button>
        </div>
        <div className={card}>
          <p className="text-xs font-medium uppercase text-[var(--muted)]">
            Completed attempts (tests with your Qs)
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {data.metrics.completedAttemptsOnMyTests}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs font-medium uppercase text-[var(--muted)]">
            Avg. score on those tests
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {data.metrics.avgScoreOnTestsWithMyQuestionsPct}%
          </p>
        </div>
      </div>

      <div className={card}>
        <h2 className="text-sm font-semibold text-[var(--text)]">
          Your difficulty mix
        </h2>
        <div className="mt-4 h-52 min-h-0 w-full min-w-0 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={difficultyDistribution}>
              <ThemedCartesianGrid c={c} />
              <XAxis dataKey="difficulty" tick={{ fill: c.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: c.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tip} />
              <Bar dataKey="count" fill={c.chartPurple} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
