import {
  Bar,
  BarChart,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ThemedCartesianGrid } from '../../../components/charts/RechartsThemed'
import { chartTooltipStyle, useChartTheme } from '../../../lib/chartTheme'

export type StudentAnalyticsApi = {
  overallCompletionPct: number
  activityTimeline: { date: string; minutes: number }[]
  assessmentScoreTrend: {
    date: string
    score: number
    assessmentTitle: string
  }[]
  timeByCourse: { title: string; minutes: number }[]
}

function cardClass() {
  return 'rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--text)] shadow-sm transition-colors duration-200'
}

export default function StudentDashboardCharts({
  data,
}: {
  data: StudentAnalyticsApi
}) {
  const c = useChartTheme()
  const tip = chartTooltipStyle(c)

  const radial = [
    {
      name: 'Progress',
      value: Math.min(100, Math.max(0, data.overallCompletionPct)),
      fill: c.primary,
    },
  ]
  const activity = (data.activityTimeline ?? []).map((d) => ({
    date: d.date.slice(5),
    minutes: d.minutes,
  }))
  const scores = (data.assessmentScoreTrend ?? []).map((s, i) => ({
    n: i + 1,
    score: s.score,
    label: s.assessmentTitle.slice(0, 24),
  }))
  const timeBars = (data.timeByCourse ?? []).map((t) => ({
    name: t.title.length > 18 ? `${t.title.slice(0, 18)}…` : t.title,
    minutes: t.minutes,
    full: t.title,
  }))

  const axisCommon = {
    stroke: c.border,
    tick: { fill: c.muted, fontSize: 11 },
  }

  return (
    <div className="space-y-8">
      <div className={cardClass()}>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
          Overall completion
        </h2>
        <div className="mx-auto h-56 w-56 max-w-full sm:h-64 sm:w-64 [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              data={radial}
              innerRadius="68%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar
                background={{ fill: c.border }}
                dataKey="value"
                cornerRadius={6}
                animationDuration={900}
              />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={c.text}
                className="text-2xl font-semibold"
              >
                {data.overallCompletionPct}%
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cardClass()}>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
          Learning activity (minutes / day)
        </h2>
        <div className="h-64 w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activity}>
              <ThemedCartesianGrid c={c} />
              <XAxis dataKey="date" {...axisCommon} />
              <YAxis allowDecimals={false} {...axisCommon} />
              <Tooltip
                animationDuration={400}
                contentStyle={tip}
                labelStyle={{ color: c.muted }}
              />
              <Line
                type="monotone"
                dataKey="minutes"
                name="Minutes"
                stroke={c.primary}
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
          Assessment scores over attempts
        </h2>
        <div className="h-64 w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scores}>
              <ThemedCartesianGrid c={c} />
              <XAxis dataKey="n" name="Attempt #" {...axisCommon} />
              <YAxis domain={[0, 100]} {...axisCommon} />
              <Tooltip
                animationDuration={400}
                contentStyle={tip}
                formatter={(v) => [`${v}`, 'Score']}
                labelFormatter={(_, p) =>
                  (p?.[0]?.payload as { label?: string })?.label ?? ''
                }
              />
              <Line
                type="monotone"
                dataKey="score"
                name="Score"
                stroke={c.primary}
                strokeWidth={2}
                dot={{ fill: c.primary }}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cardClass()}>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
          Time spent by course
        </h2>
        <div className="h-72 w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeBars} margin={{ bottom: 48 }}>
              <ThemedCartesianGrid c={c} />
              <XAxis
                dataKey="name"
                fontSize={10}
                interval={0}
                angle={-18}
                height={60}
                {...axisCommon}
              />
              <YAxis allowDecimals={false} {...axisCommon} />
              <Tooltip
                animationDuration={400}
                contentStyle={tip}
                formatter={(v) => [`${v} min`, 'Time']}
                labelFormatter={(_, p) =>
                  (p?.[0]?.payload as { full?: string })?.full ?? ''
                }
              />
              <Legend wrapperStyle={{ color: c.muted }} />
              <Bar
                dataKey="minutes"
                name="Minutes"
                fill={c.primary}
                radius={[4, 4, 0, 0]}
                animationDuration={700}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
