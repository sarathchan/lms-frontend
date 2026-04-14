import { lazy, Suspense, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { DashboardLoadingSkeleton } from '../../components/feedback/DashboardLoadingSkeleton'
import { LazyChartsFallback } from '../../components/feedback/LazyChartsFallback'
import { dashboardContainer, dashboardItem } from '../../lib/motionPresets'
import { paginatedData } from '../../lib/paginated'
import { Label } from '../../components/ui/label'

const AdminDashboardCharts = lazy(
  () => import('./admin/AdminDashboardCharts'),
)

/** Token-only surfaces so light/dark follow `html.dark`, not OS `prefers-color-scheme`. */
const panel =
  'rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-colors duration-200'
const panelSoft =
  'rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_8%,var(--card))] shadow-sm transition-colors duration-200'
const listRow =
  'rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 transition-colors duration-200'
const inputCls =
  'lms-input rounded-lg px-3 py-2 text-sm shadow-none'

type AdminAnalyticsResponse = {
  totalUsers: number
  activeUsers: number
  courses: number
  enrollments: number
  completedCourses: number
  courseCompletionApproxPct: number
  userGrowth: { date: string; newUsers: number }[]
  activeVsInactive: { active: number; inactive: number }
  completionFunnel: {
    enrolled: number
    started: number
    inProgress: number
    completed: number
  }
  coursesFunnel: {
    courseId: string
    title: string
    enrolled: number
    started: number
    inProgress: number
    completed: number
  }[]
  engagementHeatmap: { day: number; hour: number; count: number }[]
  lessonDropOff: {
    lessonTitle: string
    courseTitle: string
    dropOffPct: number
    views: number
  }[]
  assessmentByCourse: {
    title: string
    avgScore: number
    belowPassRatePct: number
    attempts: number
  }[]
  attendanceDaily: { date: string; present: number; partial: number; absent: number }[]
  engagementByDay: { date: string; activeLearners: number }[]
  filterOptions?: {
    courses: { id: string; title: string }[]
    teams: { id: string; name: string }[]
  }
  computedAt?: string
  attendance?: {
    dailyLoginTrend: { date: string; records: number }[]
  }
  usersByRole?: { role: string; count: number }[]
  enrollmentTrend?: { date: string; newEnrollments: number }[]
  coursePublishStatus?: { published: number; draft: number }
  learningMinutesByDay?: { date: string; minutes: number }[]
  questionTypeTotals?: {
    mcq: number
    fill: number
    descriptive: number
    other: number
  }
  communicationStats?: { submitted: number; inProgress: number }
}

export function AdminDashboard() {
  const authUser = useAuthStore((s) => s.user)
  const showAdminSessionPanels =
    authUser?.role === 'ADMIN' || authUser?.role === 'SUPER_ADMIN'

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [courseId, setCourseId] = useState('')
  const [teamId, setTeamId] = useState('')

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (from) p.from = from
    if (to) p.to = to
    if (courseId) p.courseId = courseId
    if (teamId) p.teamId = teamId
    return p
  }, [from, to, courseId, teamId])

  type ActiveSessionsPayload = {
    active: {
      id: string
      lastActive: string
      user: { email: string; firstName: string; lastName: string }
    }[]
  }
  type HistorySessionsPayload = {
    data: {
      id: string
      createdAt: string
      logoutAt: string | null
      durationSec: number | null
      ip: string | null
      userAgent: string | null
      user: { email: string; firstName: string; lastName: string }
    }[]
    total: number
  }

  const { data: adminBundle, isLoading } = useQuery({
    queryKey: ['admin-dashboard-bundle', params, showAdminSessionPanels],
    queryFn: async () => {
      const analyticsReq = api.get<AdminAnalyticsResponse>('analytics/admin', {
        params,
      })
      if (!showAdminSessionPanels) {
        const { data: analytics } = await analyticsReq
        return {
          analytics,
          activeSess: null as ActiveSessionsPayload | null,
          histSess: null as HistorySessionsPayload | null,
        }
      }
      const [ar, asr, hsr] = await Promise.all([
        analyticsReq,
        api.get<ActiveSessionsPayload>('sessions/admin/active'),
        api.get<HistorySessionsPayload>('sessions/admin/history', {
          params: { page: 1, limit: 25 },
        }),
      ])
      return {
        analytics: ar.data,
        activeSess: asr.data,
        histSess: hsr.data,
      }
    },
  })

  const data = adminBundle?.analytics
  const activeSess = adminBundle?.activeSess ?? undefined
  const histSess = adminBundle?.histSess ?? undefined

  const chartPayload = data
    ? {
        userGrowth: data.userGrowth ?? [],
        activeVsInactive: data.activeVsInactive ?? {
          active: 0,
          inactive: 0,
        },
        completionFunnel: data.completionFunnel ?? {
          enrolled: 0,
          started: 0,
          inProgress: 0,
          completed: 0,
        },
        engagementHeatmap: data.engagementHeatmap ?? [],
        lessonDropOff: data.lessonDropOff ?? [],
        assessmentByCourse: data.assessmentByCourse ?? [],
        attendanceDaily: data.attendanceDaily ?? [],
        engagementByDay: data.engagementByDay ?? [],
        coursesFunnel: data.coursesFunnel ?? [],
        usersByRole: data.usersByRole ?? [],
        enrollmentTrend: data.enrollmentTrend ?? [],
        coursePublishStatus: data.coursePublishStatus ?? {
          published: 0,
          draft: 0,
        },
        learningMinutesByDay: data.learningMinutesByDay ?? [],
        questionTypeTotals: data.questionTypeTotals ?? {
          mcq: 0,
          fill: 0,
          descriptive: 0,
          other: 0,
        },
        communicationStats: data.communicationStats ?? {
          submitted: 0,
          inProgress: 0,
        },
      }
    : null

  if (isLoading) {
    return <DashboardLoadingSkeleton variant="admin" />
  }

  const histRows = paginatedData(histSess)
  const courses = data?.filterOptions?.courses ?? []
  const teams = data?.filterOptions?.teams ?? []

  return (
    <motion.div
      variants={dashboardContainer}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={dashboardItem}>
        <h1>Admin dashboard</h1>
        <p className="text-base leading-7 text-[color-mix(in_srgb,var(--text)_90%,var(--muted))]">
          Enrollment trends, learning time, course funnels, assessments,
          attendance, and role mix. Charts load on demand for a fast first
          paint.
        </p>
        {data?.computedAt && (
          <p className="mt-1 text-xs text-[var(--muted)]">
            Snapshot: {new Date(data.computedAt).toLocaleString()}
          </p>
        )}
      </motion.div>

      <motion.div variants={dashboardItem} className={`${panelSoft} p-4`}>
        <p className="mb-3 text-sm font-medium text-[var(--text)]">Filters</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="af-from">From</Label>
            <input
              id="af-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="af-to">To</Label>
            <input
              id="af-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="af-course">Course</Label>
            <select
              id="af-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className={inputCls}
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="af-team">Team</Label>
            <select
              id="af-team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className={inputCls}
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={dashboardItem}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        {[
          { label: 'Total users', value: data?.totalUsers },
          { label: 'Active users', value: data?.activeUsers },
          { label: 'Courses', value: data?.courses },
          { label: 'Published', value: data?.coursePublishStatus?.published },
          { label: 'Enrollments', value: data?.enrollments },
          { label: 'Courses completed', value: data?.completedCourses },
        ].map((c) => (
          <div
            key={c.label}
            className={`${panel} p-6 transition-shadow hover:shadow-md`}
          >
            <p className="text-sm font-medium text-[var(--muted)]">{c.label}</p>
            <p className="mt-1 text-3xl font-semibold text-[var(--text)]">
              {c.value ?? '—'}
            </p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={dashboardItem} className={`${panel} p-5`}>
        <p className="text-sm text-[var(--muted)]">
          Approx. completion intensity index
        </p>
        <p className="text-2xl font-semibold text-[var(--primary)]">
          {data?.courseCompletionApproxPct ?? 0}%
        </p>
      </motion.div>

      {chartPayload && (
        <motion.div variants={dashboardItem}>
          <Suspense fallback={<LazyChartsFallback variant="admin" />}>
            <AdminDashboardCharts data={chartPayload} />
          </Suspense>
        </motion.div>
      )}

      {showAdminSessionPanels && (
        <>
          <motion.div variants={dashboardItem} className={`${panelSoft} p-6`}>
            <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">
              Likely online (last 15 min)
            </h2>
            {!activeSess?.active?.length ? (
              <p className="text-base leading-7 text-[var(--muted)]">
                No active sessions detected.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {activeSess.active.map((s) => (
                  <li
                    key={s.id}
                    className={listRow}
                  >
                    <span className="font-medium text-[var(--text)]">
                      {s.user.firstName} {s.user.lastName}
                    </span>
                    <span className="ml-2 text-[var(--muted)]">
                      {s.user.email}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          <motion.div variants={dashboardItem} className={`${panelSoft} p-6`}>
            <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">
              Recent login sessions
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm text-[var(--text)]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="py-2 pr-4 font-medium text-[var(--muted)]">
                      User
                    </th>
                    <th className="py-2 pr-4 font-medium text-[var(--muted)]">
                      Login
                    </th>
                    <th className="py-2 pr-4 font-medium text-[var(--muted)]">
                      Logout
                    </th>
                    <th className="py-2 font-medium text-[var(--muted)]">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {histRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-[var(--muted)]">
                        No history yet.
                      </td>
                    </tr>
                  )}
                  {histRows.map(
                    (r: {
                      id: string
                      createdAt: string
                      logoutAt: string | null
                      durationSec: number | null
                      user: { email: string; firstName: string; lastName: string }
                    }) => (
                      <tr
                        key={r.id}
                        className="border-b border-[color-mix(in_srgb,var(--border)_65%,transparent)]"
                      >
                        <td className="py-2 pr-4">
                          <span className="font-medium text-[var(--text)]">
                            {r.user.firstName} {r.user.lastName}
                          </span>
                          <br />
                          <span className="text-[var(--muted)]">
                            {r.user.email}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-[color-mix(in_srgb,var(--text)_82%,var(--muted))]">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-[color-mix(in_srgb,var(--text)_82%,var(--muted))]">
                          {r.logoutAt
                            ? new Date(r.logoutAt).toLocaleString()
                            : '—'}
                        </td>
                        <td className="py-2 text-[color-mix(in_srgb,var(--text)_82%,var(--muted))]">
                          {r.durationSec != null
                            ? `${Math.round(r.durationSec / 60)} min`
                            : '—'}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}

      {data?.attendance?.dailyLoginTrend &&
        data.attendance.dailyLoginTrend.length > 0 && (
          <motion.p
            variants={dashboardItem}
            className="text-center text-xs text-[var(--muted)]"
          >
            Legacy daily login records are included in the attendance trend chart
            above.
          </motion.p>
        )}
    </motion.div>
  )
}
