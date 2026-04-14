import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ThemedCartesianGrid } from '../../../components/charts/RechartsThemed'
import { chartTooltipStyle, useChartTheme } from '../../../lib/chartTheme'

function cardClass() {
  return 'w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-[var(--text)] shadow-sm transition-colors duration-200 lg:p-5'
}

export function ExamTrendCharts({
  accuracyTrend,
  scoreTrend,
}: {
  accuracyTrend: { date: string; accuracyPct: number }[]
  scoreTrend: { date: string; scorePct: number }[]
}) {
  const c = useChartTheme()
  const tip = chartTooltipStyle(c)
  const axisCommon = {
    stroke: c.border,
    tick: { fill: c.muted, fontSize: 11 },
  }

  const acc = accuracyTrend.map((d) => ({
    date: d.date.slice(5),
    accuracyPct: d.accuracyPct,
  }))
  const scores = scoreTrend.map((d) => ({
    date: d.date.slice(5),
    scorePct: d.scorePct,
  }))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div className={cardClass()}>
        <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">
          Accuracy trend (course quizzes)
        </h3>
        <div className="h-52 min-h-0 w-full min-w-0 sm:h-56 [&_.recharts-surface]:outline-none">
          {acc.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Answer more quiz questions in your courses to see a trend.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={acc}>
                <ThemedCartesianGrid c={c} />
                <XAxis dataKey="date" {...axisCommon} />
                <YAxis domain={[0, 100]} {...axisCommon} />
                <Tooltip
                  animationDuration={400}
                  contentStyle={tip}
                  formatter={(v) => [`${v}%`, 'Accuracy']}
                />
                <Line
                  type="monotone"
                  dataKey="accuracyPct"
                  name="Accuracy"
                  stroke={c.primary}
                  strokeWidth={2}
                  dot={false}
                  animationDuration={600}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className={cardClass()}>
        <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">
          Test score trend (program tests)
        </h3>
        <div className="h-52 min-h-0 w-full min-w-0 sm:h-56 [&_.recharts-surface]:outline-none">
          {scores.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Complete tests linked to your coaching program to see scores over
              time.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scores}>
                <ThemedCartesianGrid c={c} />
                <XAxis dataKey="date" {...axisCommon} />
                <YAxis domain={[0, 100]} {...axisCommon} />
                <Tooltip
                  animationDuration={400}
                  contentStyle={tip}
                  formatter={(v) => [`${v}%`, 'Score']}
                />
                <Line
                  type="monotone"
                  dataKey="scorePct"
                  name="Score"
                  stroke={c.primary}
                  strokeWidth={2}
                  dot={{ fill: c.primary }}
                  animationDuration={600}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
