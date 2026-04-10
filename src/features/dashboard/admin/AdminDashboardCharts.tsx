import { Fragment, useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ThemedCartesianGrid } from '../../../components/charts/RechartsThemed'
import {
  chartTooltipStyle,
  heatmapCellColor,
  useChartTheme,
} from '../../../lib/chartTheme'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatRole(role: string) {
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

export type AdminAnalyticsApi = {
  userGrowth: { date: string; newUsers: number }[]
  activeVsInactive: { active: number; inactive: number }
  completionFunnel: {
    enrolled: number
    started: number
    inProgress: number
    completed: number
  }
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
  coursesFunnel: {
    courseId: string
    title: string
    enrolled: number
    started: number
    inProgress: number
    completed: number
  }[]
  usersByRole: { role: string; count: number }[]
  enrollmentTrend: { date: string; newEnrollments: number }[]
  coursePublishStatus: { published: number; draft: number }
  learningMinutesByDay: { date: string; minutes: number }[]
  questionTypeTotals: {
    mcq: number
    fill: number
    descriptive: number
    other: number
  }
  communicationStats: { submitted: number; inProgress: number }
}

function cardClass() {
  return 'rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--text)] shadow-sm transition-colors duration-200'
}

function maxHeatmapCount(rows: AdminAnalyticsApi['engagementHeatmap']) {
  let m = 0
  for (const r of rows) m = Math.max(m, r.count)
  return m || 1
}

export default function AdminDashboardCharts({ data }: { data: AdminAnalyticsApi }) {
  const c = useChartTheme()
  const tip = chartTooltipStyle(c)
  const axisTick = { fill: c.muted, fontSize: 11 }

  const pieColors = useMemo(
    () => [
      c.chartBlue,
      c.chartGreen,
      c.chartPurple,
      c.chartOrange,
      c.chartAmber,
      c.chartRed,
      c.chartMid,
      c.primary,
    ],
    [c],
  )

  const heatMax = maxHeatmapCount(data.engagementHeatmap)
  const funnelRows = [
    { stage: 'Enrolled', value: data.completionFunnel.enrolled },
    { stage: 'Started', value: data.completionFunnel.started },
    { stage: 'In progress', value: data.completionFunnel.inProgress },
    { stage: 'Completed', value: data.completionFunnel.completed },
  ]
  const stackedUsers = [
    {
      label: 'Users',
      active: data.activeVsInactive.active,
      inactive: data.activeVsInactive.inactive,
    },
  ]
  const dropChart = (data.lessonDropOff ?? []).slice(0, 12).map((r) => ({
    name:
      r.lessonTitle.length > 28
        ? `${r.lessonTitle.slice(0, 28)}…`
        : r.lessonTitle,
    drop: r.dropOffPct,
    views: r.views,
    full: `${r.courseTitle} · ${r.lessonTitle}`,
  }))
  const assessChart = (data.assessmentByCourse ?? []).map((a) => ({
    name: a.title.length > 20 ? `${a.title.slice(0, 20)}…` : a.title,
    avgScore: a.avgScore,
    hardPct: a.belowPassRatePct,
    attempts: a.attempts,
  }))
  const attendanceLine = (data.attendanceDaily ?? []).map((d) => ({
    date: d.date.slice(5),
    present: d.present,
    partial: d.partial,
    absent: d.absent,
  }))
  const userGrowth = (data.userGrowth ?? []).map((d) => ({
    date: d.date.slice(5),
    newUsers: d.newUsers,
  }))
  const engagementLine = (data.engagementByDay ?? []).map((d) => ({
    date: d.date.slice(5),
    learners: d.activeLearners,
  }))

  const rolePie = (data.usersByRole ?? [])
    .filter((r) => r.count > 0)
    .map((r) => ({
      name: formatRole(r.role),
      value: r.count,
    }))

  const publishBars = [
    { name: 'Published', count: data.coursePublishStatus.published },
    { name: 'Draft', count: data.coursePublishStatus.draft },
  ]

  const enrollmentArea = (data.enrollmentTrend ?? []).map((d) => ({
    date: d.date.slice(5),
    enrollments: d.newEnrollments,
  }))

  const learningArea = (data.learningMinutesByDay ?? []).map((d) => ({
    date: d.date.slice(5),
    minutes: d.minutes,
  }))

  const questionPie = [
    { name: 'Multiple choice', value: data.questionTypeTotals.mcq },
    { name: 'Fill in blank', value: data.questionTypeTotals.fill },
    { name: 'Descriptive', value: data.questionTypeTotals.descriptive },
    { name: 'Other', value: data.questionTypeTotals.other },
  ].filter((x) => x.value > 0)

  const topCoursesCompare = [...(data.coursesFunnel ?? [])]
    .sort((a, b) => b.enrolled - a.enrolled)
    .slice(0, 10)
    .map((co) => ({
      name:
        co.title.length > 18 ? `${co.title.slice(0, 18)}…` : co.title,
      Enrolled: co.enrolled,
      Started: co.started,
      Completed: co.completed,
    }))

  const grid2 = 'grid gap-6 xl:grid-cols-2'

  return (
    <div className="space-y-8">
      <div className={cardClass()}>
        <h2 className="mb-1 text-lg font-semibold text-[var(--text)]">
          New user registrations
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Daily sign-ups over the last 90 days (UTC)
        </p>
        <div className="h-72 w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={userGrowth} margin={{ left: 8, right: 8 }}>
              <ThemedCartesianGrid c={c} />
              <XAxis dataKey="date" stroke={c.border} tick={axisTick} />
              <YAxis allowDecimals={false} stroke={c.border} tick={axisTick} />
              <Tooltip
                animationDuration={400}
                contentStyle={tip}
                labelStyle={{ color: c.muted }}
              />
              <Line
                type="monotone"
                dataKey="newUsers"
                name="New users"
                stroke={c.chartBlue}
                strokeWidth={2}
                dot={false}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={grid2}>
        <div className={cardClass()}>
          <h2 className="mb-1 text-lg font-semibold text-[var(--text)]">
            New enrollments
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Course assignments per day (last 30 days)
          </p>
          <div className="h-64 w-full [&_.recharts-surface]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={enrollmentArea} margin={{ left: 4, right: 8 }}>
                <defs>
                  <linearGradient id="enrollFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.chartGreen} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={c.chartGreen} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <ThemedCartesianGrid c={c} />
                <XAxis dataKey="date" stroke={c.border} tick={axisTick} />
                <YAxis allowDecimals={false} stroke={c.border} tick={axisTick} />
                <Tooltip contentStyle={tip} labelStyle={{ color: c.muted }} />
                <Area
                  type="monotone"
                  dataKey="enrollments"
                  name="Enrollments"
                  stroke={c.chartGreen}
                  fill="url(#enrollFill)"
                  strokeWidth={2}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cardClass()}>
          <h2 className="mb-1 text-lg font-semibold text-[var(--text)]">
            Learning time on platform
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Sum of session minutes per day (last 30 days)
          </p>
          <div className="h-64 w-full [&_.recharts-surface]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={learningArea} margin={{ left: 4, right: 8 }}>
                <defs>
                  <linearGradient id="learnFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.chartPurple} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={c.chartPurple} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <ThemedCartesianGrid c={c} />
                <XAxis dataKey="date" stroke={c.border} tick={axisTick} />
                <YAxis allowDecimals={false} stroke={c.border} tick={axisTick} />
                <Tooltip contentStyle={tip} labelStyle={{ color: c.muted }} />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  name="Minutes"
                  stroke={c.chartPurple}
                  fill="url(#learnFill)"
                  strokeWidth={2}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={grid2}>
        <div className={cardClass()}>
          <h2 className="mb-1 text-lg font-semibold text-[var(--text)]">
            Users by role
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Headcount in your current scope (org / team filter applies)
          </p>
          {rolePie.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No user data.</p>
          ) : (
            <div className="mx-auto h-[280px] w-full max-w-sm [&_.recharts-surface]:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rolePie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                    label={({ name, percent }) =>
                      `${name} ${percent != null ? Math.round(percent * 100) : 0}%`
                    }
                    animationDuration={700}
                  >
                    {rolePie.map((_, i) => (
                      <Cell
                        key={i}
                        fill={pieColors[i % pieColors.length]!}
                        stroke={c.card}
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className={cardClass()}>
          <h2 className="mb-1 text-lg font-semibold text-[var(--text)]">
            Course catalog
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Published vs draft courses in scope
          </p>
          <div className="h-56 w-full max-w-md [&_.recharts-surface]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={publishBars} margin={{ left: 8, right: 8 }}>
                <ThemedCartesianGrid c={c} />
                <XAxis dataKey="name" stroke={c.border} tick={axisTick} />
                <YAxis allowDecimals={false} stroke={c.border} tick={axisTick} />
                <Tooltip contentStyle={tip} labelStyle={{ color: c.muted }} />
                <Bar
                  dataKey="count"
                  name="Courses"
                  radius={[8, 8, 0, 0]}
                  animationDuration={700}
                >
                  {publishBars.map((row) => (
                    <Cell
                      key={row.name}
                      fill={
                        row.name === 'Published' ? c.chartGreen : c.chartAmber
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={grid2}>
        <div className={cardClass()}>
          <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
            Active vs inactive accounts
          </h2>
          <div className="h-56 w-full max-w-lg [&_.recharts-surface]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedUsers}>
                <ThemedCartesianGrid c={c} />
                <XAxis dataKey="label" hide />
                <YAxis allowDecimals={false} stroke={c.border} tick={axisTick} />
                <Tooltip contentStyle={tip} labelStyle={{ color: c.muted }} />
                <Legend wrapperStyle={{ color: c.muted }} />
                <Bar
                  dataKey="active"
                  stackId="a"
                  fill={c.chartGreen}
                  name="Active"
                  radius={[6, 6, 0, 0]}
                  animationDuration={700}
                />
                <Bar
                  dataKey="inactive"
                  stackId="a"
                  fill={c.chartMid}
                  name="Inactive"
                  radius={[6, 6, 0, 0]}
                  animationDuration={700}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cardClass()}>
          <h2 className="mb-1 text-lg font-semibold text-[var(--text)]">
            Quiz question inventory
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Count of question items across quizzes (by course scope)
          </p>
          {questionPie.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No quiz questions in scope.</p>
          ) : (
            <div className="mx-auto h-[260px] w-full max-w-sm [&_.recharts-surface]:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={questionPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    paddingAngle={2}
                    animationDuration={700}
                  >
                    {questionPie.map((_, i) => (
                      <Cell
                        key={i}
                        fill={pieColors[(i + 2) % pieColors.length]!}
                        stroke={c.card}
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tip} />
                  <Legend wrapperStyle={{ color: c.muted, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className={grid2}>
        <div className={cardClass()}>
          <h2 className="mb-1 text-lg font-semibold text-[var(--text)]">
            Communication assessments
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Essay / listening / speaking attempts in scope
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_6%,var(--card))] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Submitted
              </p>
              <p className="mt-1 text-3xl font-semibold text-[var(--text)]">
                {data.communicationStats.submitted}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_6%,var(--card))] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                In progress
              </p>
              <p className="mt-1 text-3xl font-semibold text-[var(--text)]">
                {data.communicationStats.inProgress}
              </p>
            </div>
          </div>
        </div>

        <div className={cardClass()}>
          <h2 className="mb-1 text-lg font-semibold text-[var(--text)]">
            Top courses by enrollment
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Enrolled, started (any lesson), and completed counts
          </p>
          {topCoursesCompare.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No courses in scope.</p>
          ) : (
            <div className="h-72 w-full [&_.recharts-surface]:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topCoursesCompare}
                  margin={{ left: 4, right: 8 }}
                >
                  <ThemedCartesianGrid c={c} />
                  <XAxis
                    dataKey="name"
                    stroke={c.border}
                    tick={{ fill: c.muted, fontSize: 10 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={72}
                  />
                  <YAxis allowDecimals={false} stroke={c.border} tick={axisTick} />
                  <Tooltip contentStyle={tip} labelStyle={{ color: c.muted }} />
                  <Legend wrapperStyle={{ color: c.muted }} />
                  <Bar
                    dataKey="Enrolled"
                    fill={c.chartBlue}
                    radius={[4, 4, 0, 0]}
                    animationDuration={700}
                  />
                  <Bar
                    dataKey="Started"
                    fill={c.chartAmber}
                    radius={[4, 4, 0, 0]}
                    animationDuration={700}
                  />
                  <Bar
                    dataKey="Completed"
                    fill={c.chartGreen}
                    radius={[4, 4, 0, 0]}
                    animationDuration={700}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className={cardClass()}>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
          Course completion funnel (aggregated)
        </h2>
        <div className="space-y-3">
          {funnelRows.map((f) => {
            const max = Math.max(1, ...funnelRows.map((x) => x.value))
            const w = Math.round((f.value / max) * 100)
            return (
              <div key={f.stage}>
                <div className="mb-1 flex justify-between text-sm text-[var(--muted)]">
                  <span>{f.stage}</span>
                  <span className="font-medium text-[var(--text)]">{f.value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-all duration-700"
                    style={{ width: `${w}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={cardClass()}>
        <h2 className="mb-2 text-lg font-semibold text-[var(--text)]">
          Engagement heatmap
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Login sessions by day (UTC) and hour — last 28 days
        </p>
        <div className="overflow-x-auto pb-2">
          <div
            className="grid gap-0.5"
            style={{
              gridTemplateColumns: `56px repeat(24, minmax(0, 1fr))`,
            }}
          >
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="text-center text-[10px] text-[var(--muted)]"
              >
                {h}
              </div>
            ))}
            {DAY_LABELS.map((label, day) => (
              <Fragment key={day}>
                <div className="flex items-center text-xs text-[var(--muted)]">
                  {label}
                </div>
                {Array.from({ length: 24 }, (_, hour) => {
                  const cell = data.engagementHeatmap.find(
                    (x) => x.day === day && x.hour === hour,
                  )
                  const cnt = cell?.count ?? 0
                  return (
                    <div
                      key={`${day}-${hour}`}
                      title={`${label} ${hour}:00 — ${cnt}`}
                      className="aspect-square min-h-[14px] rounded-sm transition-colors duration-200"
                      style={{
                        backgroundColor: heatmapCellColor(cnt, heatMax, c),
                      }}
                    />
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className={cardClass()}>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
          Lesson drop-off (top)
        </h2>
        <div className="h-80 w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dropChart} layout="vertical" margin={{ left: 16 }}>
              <ThemedCartesianGrid c={c} />
              <XAxis type="number" stroke={c.border} tick={axisTick} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                stroke={c.border}
                tick={{ fill: c.muted, fontSize: 10 }}
              />
              <Tooltip
                animationDuration={400}
                contentStyle={tip}
                labelStyle={{ color: c.muted }}
                formatter={(v, name) => [v, name === 'drop' ? 'Drop-off %' : name]}
                labelFormatter={(_, p) =>
                  (p?.[0]?.payload as { full?: string })?.full ?? ''
                }
              />
              <Bar
                dataKey="drop"
                name="drop"
                fill={c.chartRed}
                radius={[0, 4, 4, 0]}
                animationDuration={700}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cardClass()}>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
          Assessment performance by course
        </h2>
        <div className="h-80 w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assessChart}>
              <ThemedCartesianGrid c={c} />
              <XAxis
                dataKey="name"
                fontSize={10}
                interval={0}
                angle={-20}
                height={70}
                stroke={c.border}
                tick={axisTick}
              />
              <YAxis yAxisId="left" stroke={c.border} tick={axisTick} />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={c.border}
                tick={axisTick}
              />
              <Tooltip
                animationDuration={400}
                contentStyle={tip}
                labelStyle={{ color: c.muted }}
              />
              <Legend wrapperStyle={{ color: c.muted }} />
              <Bar
                yAxisId="left"
                dataKey="avgScore"
                name="Avg score"
                fill={c.chartBlue}
                radius={[4, 4, 0, 0]}
                animationDuration={700}
              />
              <Bar
                yAxisId="right"
                dataKey="hardPct"
                name="Below pass %"
                fill={c.chartOrange}
                radius={[4, 4, 0, 0]}
                animationDuration={700}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Difficulty proxy: share of attempts scoring under the quiz pass threshold.
        </p>
      </div>

      <div className={cardClass()}>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
          Attendance trends (daily)
        </h2>
        <div className="h-72 w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attendanceLine} margin={{ left: 4, right: 8 }}>
              <ThemedCartesianGrid c={c} />
              <XAxis dataKey="date" stroke={c.border} tick={axisTick} />
              <YAxis allowDecimals={false} stroke={c.border} tick={axisTick} />
              <Tooltip
                animationDuration={400}
                contentStyle={tip}
                labelStyle={{ color: c.muted }}
              />
              <Legend wrapperStyle={{ color: c.muted }} />
              <Line
                type="monotone"
                dataKey="present"
                name="Present"
                stroke={c.chartGreen}
                strokeWidth={2}
                dot={false}
                animationDuration={800}
              />
              <Line
                type="monotone"
                dataKey="partial"
                name="Partial"
                stroke={c.chartAmber}
                strokeWidth={2}
                dot={false}
                animationDuration={800}
              />
              <Line
                type="monotone"
                dataKey="absent"
                name="Absent"
                stroke={c.chartRed}
                strokeWidth={2}
                dot={false}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cardClass()}>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
          Unique learners with sessions (daily)
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Distinct users with a learning session per day (last 14 days)
        </p>
        <div className="h-64 w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={engagementLine}>
              <ThemedCartesianGrid c={c} />
              <XAxis dataKey="date" stroke={c.border} tick={axisTick} />
              <YAxis allowDecimals={false} stroke={c.border} tick={axisTick} />
              <Tooltip
                animationDuration={400}
                contentStyle={tip}
                labelStyle={{ color: c.muted }}
              />
              <Line
                type="monotone"
                dataKey="learners"
                stroke={c.chartPurple}
                strokeWidth={2}
                dot={false}
                animationDuration={800}
                name="Active learners"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
