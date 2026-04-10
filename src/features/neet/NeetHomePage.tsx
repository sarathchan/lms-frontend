import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookMarked,
  Calendar,
  Flame,
  LineChart,
  Play,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'
import { cn } from '../../lib/utils'
import { dashboardContainer, dashboardItem } from '../../lib/motionPresets'

type NeetHome = {
  tests: {
    id: string
    title: string
    durationMins: number
    type: string
    questionCount: number
  }[]
  continueAttempt: {
    attemptId: string
    testId: string
    testTitle: string
  } | null
  lastResult: {
    attemptId: string
    score: number | null
    testTitle: string
  } | null
  streak: number
  daily: { target: number; done: number; completed: boolean }
  nudges: {
    improvedThisWeek: boolean
    completeTodayTarget: boolean
    improvementPct: number | null
    streakMaintenance: string | null
    focusLine: string | null
  }
  weakness?: {
    weakAreas: {
      subject: string
      chapter: string
      accuracy: number
      tier: string
      message: string
      practiceQuery: string
    }[]
    focusSubject: string | null
  }
  rankPreview?: {
    predictedAir: number
    cohortPercentile: number
    testTitle: string
  } | null
}

const surface =
  'rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm'

export function NeetHomePage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['neet', 'home'],
    queryFn: async () => {
      const { data } = await api.get<NeetHome>('neet/home')
      return data
    },
  })

  const start = useMutation({
    mutationFn: async (testId: string) => {
      const { data } = await api.post<{ attemptId: string }>(
        `neet/tests/${testId}/attempts`,
      )
      return data
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['neet'] })
      window.location.href = `/neet/exam/${res.attemptId}`
    },
  })

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <motion.div
      variants={dashboardContainer}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-5xl space-y-10 pb-10 pt-2"
    >
      <motion.section variants={dashboardItem} className={cn(surface, 'p-6 sm:p-8')}>
        <p className="text-sm font-medium text-[var(--primary)]">
          <Sparkles className="mr-1 inline h-4 w-4 align-text-bottom" />
          NEET preparation
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
          Exam-focused practice & analytics
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Timed tests, PYQs, daily drills, weakness insights, and streaks—built
          for consistent score improvement.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {data.nudges.improvedThisWeek && (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 text-xs font-medium text-[var(--primary)]">
              You improved this week
              {data.nudges.improvementPct != null && data.nudges.improvementPct > 0
                ? ` by ${data.nudges.improvementPct}%`
                : ''}
            </span>
          )}
          {data.nudges.completeTodayTarget && (
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text)]">
              Complete today&apos;s target
            </span>
          )}
          {data.nudges.focusLine && (
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text)]">
              {data.nudges.focusLine}
            </span>
          )}
          {data.nudges.streakMaintenance && (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--accent-warn-bg)_80%,transparent)] px-3 py-1 text-xs font-medium text-[var(--accent-warn-text)]">
              {data.nudges.streakMaintenance}
            </span>
          )}
        </div>
      </motion.section>

      {data.rankPreview && (
        <motion.section variants={dashboardItem} className={cn(surface, 'p-6')}>
          <h2 className="text-lg font-semibold text-[var(--text)]">Predicted rank</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            From your latest mock: {data.rankPreview.testTitle}
          </p>
          <div className="mt-4 flex flex-wrap gap-6">
            <div>
              <p className="text-xs uppercase text-[var(--muted)]">AIR (illustrative)</p>
              <p className="text-2xl font-bold tracking-tight text-[var(--primary)]">
                ~{data.rankPreview.predictedAir.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-[var(--muted)]">Ahead of cohort</p>
              <p className="text-2xl font-bold text-[var(--text)]">
                {Math.round(data.rankPreview.cohortPercentile)}%
              </p>
            </div>
          </div>
        </motion.section>
      )}

      {data.weakness && data.weakness.weakAreas.length > 0 && (
        <motion.section variants={dashboardItem} className={cn(surface, 'p-6')}>
          <h2 className="text-lg font-semibold text-[var(--text)]">Weak areas</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Based on your chapter accuracy (weak / average / strong).
          </p>
          <ul className="mt-4 space-y-3">
            {data.weakness.weakAreas.slice(0, 4).map((w) => (
              <li
                key={`${w.subject}-${w.chapter}`}
                className="flex flex-col gap-2 rounded-xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-[var(--text)]">{w.message}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {w.subject} · {w.accuracy}% accuracy · {w.tier}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl shrink-0" asChild>
                  <Link to={`/neet/daily?${w.practiceQuery}`}>Practice now</Link>
                </Button>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      <motion.div
        variants={dashboardItem}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className={cn(surface, 'p-5')}>
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Flame className="h-5 w-5 text-[var(--primary)]" />
            <span className="text-sm font-semibold">Streak</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[var(--primary)]">
            {data.streak}
            <span className="ml-1 text-base font-medium text-[var(--muted)]">
              days
            </span>
          </p>
        </div>
        <div className={cn(surface, 'p-5')}>
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Target className="h-5 w-5 text-[var(--primary)]" />
            <span className="text-sm font-semibold">Daily target</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[var(--text)]">
            {data.daily.done}
            <span className="text-[var(--muted)]"> / {data.daily.target}</span>
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">questions today</p>
        </div>
        <div className={cn(surface, 'p-5 sm:col-span-2')}>
          <p className="text-sm font-semibold text-[var(--text)]">Shortcuts</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link to="/neet/daily">
                <Calendar className="mr-1 h-4 w-4" />
                Daily practice
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link to="/neet/analytics">
                <LineChart className="mr-1 h-4 w-4" />
                Analytics
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link to="/neet/pyq">PYQ bank</Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link to="/neet/leaderboard">
                <Trophy className="mr-1 h-4 w-4" />
                Leaderboard
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link to="/neet/revision">
                <BookMarked className="mr-1 h-4 w-4" />
                Revise later
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {data.continueAttempt && (
        <motion.section variants={dashboardItem} className={cn(surface, 'p-6')}>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Continue test
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {data.continueAttempt.testTitle}
          </p>
          <Button className="mt-4 rounded-xl" asChild>
            <Link to={`/neet/exam/${data.continueAttempt.attemptId}`}>
              <Play className="mr-2 h-4 w-4" />
              Resume
            </Link>
          </Button>
        </motion.section>
      )}

      {data.lastResult && (
        <motion.section variants={dashboardItem} className={cn(surface, 'p-6')}>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Last result
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {data.lastResult.testTitle} —{' '}
            <span className="font-medium text-[var(--text)]">
              {data.lastResult.score != null
                ? `${Math.round(data.lastResult.score)}%`
                : '—'}
            </span>
          </p>
          <Button variant="outline" className="mt-4 rounded-xl" asChild>
            <Link to={`/neet/result/${data.lastResult.attemptId}`}>
              View analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.section>
      )}

      <motion.section variants={dashboardItem} className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Test series
          </h2>
        </div>
        <ul className="space-y-3">
          {data.tests.length === 0 && (
            <li
              className={cn(
                surface,
                'px-4 py-8 text-center text-sm text-[var(--muted)]',
              )}
            >
              No published tests yet. Ask your instructor to publish a mock.
            </li>
          )}
          {data.tests.map((t) => (
            <li
              key={t.id}
              className={cn(
                surface,
                'flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between',
              )}
            >
              <div>
                <p className="font-semibold text-[var(--text)]">{t.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {t.type} · {t.durationMins} min · {t.questionCount} questions
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="rounded-xl"
                  disabled={start.isPending}
                  onClick={() => start.mutate(t.id)}
                >
                  {data.continueAttempt?.testId === t.id ? 'Resume' : 'Start'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </motion.section>
    </motion.div>
  )
}
