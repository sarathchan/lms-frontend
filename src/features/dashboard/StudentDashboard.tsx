import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../../lib/api'
import { DashboardLoadingSkeleton } from '../../components/feedback/DashboardLoadingSkeleton'
import { LazyChartsFallback } from '../../components/feedback/LazyChartsFallback'
import { dashboardContainer, dashboardItem } from '../../lib/motionPresets'
import { Button } from '../../components/ui/button'
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Flame,
  GraduationCap,
  MessageSquare,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { CourseCover } from '../../components/visual/CourseCover'
import { LearningHeroArt } from '../../components/visual/LearningHeroArt'
import { EmptyCoursesArt } from '../../components/visual/EmptyCoursesArt'
import { cn } from '../../lib/utils'
import { formatCourseProgressLabel } from '../../lib/formatCourseProgressLabel'
import { ExamTrendCharts } from './student/ExamTrendCharts'
import { toast } from 'sonner'

const StudentDashboardCharts = lazy(
  () => import('./student/StudentDashboardCharts'),
)

type EnrolledRow = {
  courseId: string
  title: string
  description: string | null
  progressPct: number
  organizationName: string | null
}

type ResumePayload = {
  courseId?: string
  lessonId?: string
  moduleId?: string
  courseTitle?: string
  lessonTitle?: string
  progressPct?: number
} | null

type InsightsPayload = {
  weakAreas: {
    message: string
    subject: string
    chapter: string
    topic: string
    accuracyPct: number
    status: string
    courseId: string
    moduleId: string
    practicePath: string
  }[]
  stats: {
    overallAccuracyPct: number
    questionsAttempted: number
    correctCount: number
  }
  courseRanks: {
    courseId: string
    courseTitle: string
    rank: number
    cohortSize: number
    percentile: number
    aheadOfPct: number
    comparisonLine: string
    avgScorePct: number
  }[]
  contentProgress?: {
    courseId: string
    courseTitle: string
    completedLessons: number
    totalLessons: number
    progressPct: number
    completedLearningLessons?: number
    totalLearningLessons?: number
    completedAssessments?: number
    totalAssessments?: number
  }[]
}

type CoachingProgramOverview = {
  programId: string
  name: string
  examType: { id: string; name: string; slug: string }
  description: string | null
  courses: {
    linkId: string
    courseId: string
    title: string
    subjectId: string | null
    subject: { id: string; name: string; iconEmoji: string | null } | null
  }[]
  tests: {
    id: string
    title: string
    durationMins: number
    type: string
    questionCount: number
  }[]
  weakAreas: {
    message: string
    subject: string
    subjectId?: string
    chapter: string | null
    accuracyPct: number
    status: string
    practicePath: string
  }[]
  rank: number | null
  percentile: number | null
  lastTestTitle: string | null
  stats: {
    testsCompleted: number
    avgScorePct: number
    overallAccuracyPct: number
    timeSpentSec: number
  }
}

type ProgramsMeOverview = { programs: CoachingProgramOverview[] }

type CommAssignmentMine = {
  assignmentId: string
  test: { id: string; title: string; description: string | null }
  latestAttempt: { id: string; status: string; submittedAt: string | null } | null
}

type StudentExamDashboard = {
  examType: { id: string; name: string; slug: string }
  score720: number | null
  scorePct: number | null
  predictedRank: number | null
  predictedAir: number | null
  percentile: number | null
  aheadOfPct: number | null
  cohortSize: number | null
  subjects: {
    subjectId: string
    name: string
    iconEmoji: string | null
    accuracyPct: number
    questionsAttempted: number
  }[]
  weakAreas: {
    message: string
    subjectName: string
    chapter: string
    accuracyPct: number
    status: string
    source: string
    practicePath?: string
  }[]
  accuracyTrend: { date: string; accuracyPct: number }[]
  scoreTrend: { date: string; scorePct: number }[]
}

type UserDashboardResponse = {
  enrolled: EnrolledRow[]
  resume: ResumePayload
  learningStreak?: number
  upcomingAssessments: {
    id: string
    title: string
    body: string
    metadata: unknown
  }[]
  attendance: { attendancePct: number }
  insights?: InsightsPayload
  analytics?: {
    overallCompletionPct: number
    activityTimeline: { date: string; minutes: number }[]
    assessmentScoreTrend: {
      date: string
      score: number
      assessmentTitle: string
    }[]
    timeByCourse: { title: string; minutes: number }[]
    computedAt?: string
  }
}

const surface =
  'rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-colors duration-200'
const surfaceLift =
  'hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:shadow-md'

function formatDurationSec(sec: number) {
  if (sec <= 0) return '0m'
  const m = Math.floor(sec / 60)
  if (m < 120) return `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

function examDashboardHeadingAndSubtext(
  examTypes: { name: string; slug: string }[],
  activeExamSlug: string | null,
): { heading: string; sub: string } {
  if (examTypes.length === 0) {
    return { heading: 'Exam dashboard', sub: '' }
  }
  const active =
    examTypes.find((e) => e.slug === activeExamSlug) ?? examTypes[0]!

  if (examTypes.length === 1) {
    if (active.slug === 'neet') {
      return {
        heading: 'NEET dashboard',
        sub: 'Quiz attempts, NEET practice tests, weak-area drills, and program activity—all focused on your NEET preparation.',
      }
    }
    if (active.slug === 'jee') {
      return {
        heading: 'JEE dashboard',
        sub: 'Quiz attempts, JEE practice tests, weak-area drills, and program activity—all focused on your JEE preparation.',
      }
    }
    return {
      heading: `${active.name} dashboard`,
      sub: `Quiz attempts, ${active.name} practice, and program tests—focused on ${active.name}.`,
    }
  }

  return {
    heading: 'Exam dashboard',
    sub: 'Data from your quiz attempts, entrance exam practice, and program tests—switch exam with the tabs above.',
  }
}

export function StudentDashboard() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const first = user?.firstName?.trim() || 'there'

  const examTypes = user?.studentProfile?.examTypes ?? []
  const activeFromProfile = user?.studentProfile?.activeExamType?.slug ?? null
  const examKey = examTypes.map((e) => e.slug).join('|')
  const [examSlugOverride, setExamSlugOverride] = useState<string | null>(null)
  const activeExamSlug =
    examSlugOverride ??
    activeFromProfile ??
    examTypes[0]?.slug ??
    null

  useEffect(() => {
    setExamSlugOverride(null)
  }, [activeFromProfile, examKey])

  const { data: examDash, isLoading: examDashLoading } = useQuery({
    queryKey: ['analytics', 'student-exam', activeExamSlug],
    queryFn: async () => {
      const { data } = await api.get<StudentExamDashboard | null>(
        'analytics/student-exam',
        {
          params: activeExamSlug
            ? { examTypeSlug: activeExamSlug }
            : undefined,
        },
      )
      return data
    },
    enabled: user?.role === 'STUDENT' && !!activeExamSlug,
  })

  const switchExamMut = useMutation({
    mutationFn: async (slug: string) => {
      const { data } = await api.patch<{
        activeExamType: { id: string; name: string; slug: string } | null
        examTypes: { id: string; name: string; slug: string }[]
      }>('users/me/student-profile', { activeExamTypeSlug: slug })
      return data
    },
    onSuccess: (data) => {
      useAuthStore.setState((s) => ({
        user: s.user
          ? {
              ...s.user,
              studentProfile: {
                activeExamType: data.activeExamType,
                examTypes: data.examTypes,
              },
            }
          : null,
      }))
      setExamSlugOverride(data.activeExamType?.slug ?? null)
      void qc.invalidateQueries({ queryKey: ['analytics', 'student-exam'] })
      toast.success('Switched exam view')
    },
    onError: () => toast.error('Could not switch exam'),
  })

  const showExamToggle = examTypes.length > 1
  const examSectionCopy = examDashboardHeadingAndSubtext(
    examTypes,
    activeExamSlug,
  )

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'user'],
    queryFn: async () => {
      const { data } = await api.get<UserDashboardResponse>('analytics/user')
      return data
    },
  })

  const { data: coaching } = useQuery({
    queryKey: ['programs', 'me', 'overview'],
    queryFn: async () => {
      const { data } = await api.get<ProgramsMeOverview>('programs/me/overview')
      return data
    },
  })

  const { data: commAssigned } = useQuery({
    queryKey: ['communication', 'assignments', 'me'],
    queryFn: async () => {
      const { data } = await api.get<CommAssignmentMine[]>(
        'communication/assignments/me',
      )
      return data
    },
    enabled: user?.role === 'STUDENT',
  })

  const startNeetTest = useMutation({
    mutationFn: async (testId: string) => {
      const { data: res } = await api.post<{ attemptId: string }>(
        `neet/tests/${testId}/attempts`,
      )
      return res
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['neet'] })
      void qc.invalidateQueries({ queryKey: ['programs', 'me', 'overview'] })
      window.location.href = `/neet/exam/${res.attemptId}`
    },
  })

  const chartData = data?.analytics
    ? {
        overallCompletionPct: data.analytics.overallCompletionPct ?? 0,
        activityTimeline: data.analytics.activityTimeline ?? [],
        assessmentScoreTrend: data.analytics.assessmentScoreTrend ?? [],
        timeByCourse: data.analytics.timeByCourse ?? [],
      }
    : null

  const resumeHref = useMemo(() => {
    const r = data?.resume
    if (!r?.courseId || !r.lessonId) return null
    if (r.moduleId)
      return `/learn/${r.courseId}/${r.moduleId}/${r.lessonId}` as const
    return `/courses/${r.courseId}` as const
  }, [data?.resume])

  const recommendations = useMemo(() => {
    const rows = data?.enrolled ?? []
    return [...rows]
      .filter((c) => c.progressPct < 100)
      .sort((a, b) => a.progressPct - b.progressPct)
      .slice(0, 3)
  }, [data?.enrolled])

  const recentMinutes = useMemo(() => {
    const tl = data?.analytics?.activityTimeline ?? []
    const last7 = tl.slice(-7)
    return last7.reduce((s, d) => s + (d.minutes ?? 0), 0)
  }, [data?.analytics?.activityTimeline])

  const overallPct = data?.analytics?.overallCompletionPct ?? 0
  const showNudge =
    (data?.enrolled?.length ?? 0) > 0 &&
    overallPct >= 20 &&
    overallPct < 92 &&
    recentMinutes < 8

  const subjectsForProgram = (prog: CoachingProgramOverview) => {
    const seen = new Set<string>()
    const out: { id: string; name: string; iconEmoji: string | null }[] = []
    for (const c of prog.courses) {
      if (c.subject && !seen.has(c.subject.id)) {
        seen.add(c.subject.id)
        out.push(c.subject)
      }
    }
    return out
  }

  if (isLoading) {
    return <DashboardLoadingSkeleton variant="student" />
  }

  const enrolled = data?.enrolled ?? []
  const upcoming = data?.upcomingAssessments ?? []
  const streak = data?.learningStreak ?? 0

  return (
    <motion.div
      variants={dashboardContainer}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-8"
    >
      <motion.section
        variants={dashboardItem}
        className={cn(
          surface,
          'relative overflow-hidden p-6 ring-1 ring-[color-mix(in_srgb,var(--text)_6%,transparent)] sm:p-8',
        )}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="text-sm font-medium text-[var(--primary)]">
              <Sparkles className="mr-1 inline-block h-4 w-4 align-text-bottom" />
              Your dashboard
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              Hi, {first}{' '}
              <span aria-hidden className="inline-block">
                👋
              </span>
            </h1>
            <p className="text-base leading-relaxed text-[var(--muted)]">
              Pick up where you left off, check what&apos;s due, and keep
              building momentum—one lesson at a time.
            </p>
          </div>
          <div className="mx-auto shrink-0 text-[var(--primary)] lg:mx-0">
            <LearningHeroArt className="h-36 w-52 sm:h-40 sm:w-60" />
          </div>
        </div>
      </motion.section>

      {user?.role === 'STUDENT' && (commAssigned?.length ?? 0) > 0 && (
        <motion.section variants={dashboardItem} className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">
                <MessageSquare className="mr-2 inline-block h-5 w-5 align-text-bottom text-[var(--primary)]" />
                Communication tests
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Essay, listening, and speaking — assigned by your instructors.
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 rounded-xl" asChild>
              <Link to="/communication">View all</Link>
            </Button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {commAssigned!.slice(0, 4).map((row) => {
              const done = row.latestAttempt?.status === 'SUBMITTED'
              const draft = row.latestAttempt?.status === 'DRAFT'
              return (
                <li
                  key={row.assignmentId}
                  className={cn(surface, 'flex flex-col justify-between gap-3 p-4')}
                >
                  <div>
                    <p className="font-semibold text-[var(--text)]">{row.test.title}</p>
                    {row.test.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                        {row.test.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!done && !draft && (
                      <Button size="sm" className="rounded-xl" asChild>
                        <Link to={`/communication/${row.test.id}`}>Start test</Link>
                      </Button>
                    )}
                    {!done && draft && (
                      <Button size="sm" className="rounded-xl" asChild>
                        <Link to={`/communication/${row.test.id}`}>Continue</Link>
                      </Button>
                    )}
                    {done && row.latestAttempt && (
                      <Button size="sm" variant="secondary" className="rounded-xl" asChild>
                        <Link to={`/communication/result/${row.latestAttempt.id}`}>
                          Result
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </motion.section>
      )}

      {user?.role === 'STUDENT' && examTypes.length > 0 && (
        <motion.section variants={dashboardItem} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">
                {examSectionCopy.heading}
              </h2>
              <p className="text-sm text-[var(--muted)]">
                {examSectionCopy.sub}
              </p>
            </div>
            {showExamToggle && (
              <div
                className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1"
                role="tablist"
                aria-label="Switch entrance exam"
              >
                {examTypes.map((e) => (
                  <button
                    key={e.slug}
                    type="button"
                    role="tab"
                    aria-selected={activeExamSlug === e.slug}
                    onClick={() => switchExamMut.mutate(e.slug)}
                    disabled={switchExamMut.isPending}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200',
                      activeExamSlug === e.slug
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--text)]',
                    )}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {examDashLoading && (
            <p className="text-sm text-[var(--muted)]">Loading exam insights…</p>
          )}
          {!examDashLoading && examDash && (
            <>
              <div
                className={cn(
                  'grid gap-4',
                  examDash.examType.slug === 'neet'
                    ? 'sm:grid-cols-2 lg:grid-cols-4'
                    : 'sm:grid-cols-2 lg:grid-cols-3',
                )}
              >
                {examDash.examType.slug === 'neet' && (
                  <div className={cn(surface, 'p-5')}>
                    <p className="text-xs font-medium uppercase text-[var(--muted)]">
                      Score
                    </p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
                      {examDash.score720 != null
                        ? examDash.score720.toLocaleString()
                        : '—'}
                      <span className="text-base font-normal text-[var(--muted)]">
                        {' '}
                        / 720
                      </span>
                    </p>
                  </div>
                )}
                {examDash.examType.slug === 'neet' &&
                  examDash.predictedAir != null && (
                    <div className={cn(surface, 'p-5')}>
                      <p className="text-xs font-medium uppercase text-[var(--muted)]">
                        Expected AIR
                      </p>
                      <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
                        {examDash.predictedAir.toLocaleString()}
                      </p>
                    </div>
                  )}
                {examDash.percentile != null && (
                  <div className={cn(surface, 'p-5')}>
                    <p className="text-xs font-medium uppercase text-[var(--muted)]">
                      Percentile
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
                      You are ahead of{' '}
                      <span className="font-semibold tabular-nums">
                        {Math.round(
                          examDash.aheadOfPct ?? examDash.percentile,
                        )}
                        %
                      </span>{' '}
                      students
                    </p>
                  </div>
                )}
                {examDash.predictedRank != null && (
                  <div className={cn(surface, 'p-5')}>
                    <p className="text-xs font-medium uppercase text-[var(--muted)]">
                      {examDash.examType.slug === 'jee'
                        ? 'Cohort rank'
                        : 'Predicted rank'}
                    </p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">
                      #{examDash.predictedRank}
                      {examDash.cohortSize != null && (
                        <span className="text-sm font-normal text-[var(--muted)]">
                          {' '}
                          / {examDash.cohortSize}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {examDash.subjects.map((s) => (
                  <motion.div
                    key={s.subjectId}
                    layout
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className={cn(surface, 'p-4')}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-hidden>
                        {s.iconEmoji?.trim() || '📘'}
                      </span>
                      <span className="font-semibold text-[var(--text)]">
                        {s.name}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--primary)]">
                      {s.accuracyPct}%
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {s.questionsAttempted} questions attempted
                    </p>
                  </motion.div>
                ))}
              </div>

              {examDash.weakAreas.length > 0 && (
                <div className={cn(surface, 'p-5')}>
                  <h3 className="font-semibold text-[var(--text)]">Weak areas</h3>
                  <ul className="mt-3 space-y-2">
                    {examDash.weakAreas.map((w, i) => (
                      <li
                        key={`${w.subjectName}-${w.chapter}-${i}`}
                        className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-[var(--text)]">
                          {w.message}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {w.subjectName.toUpperCase()} · {w.accuracyPct}%
                          accuracy ·{' '}
                          <span className="font-semibold text-amber-700 dark:text-amber-300">
                            {w.status}
                          </span>
                        </p>
                        {w.practicePath && (
                          <Link
                            to={w.practicePath}
                            className="mt-2 inline-block text-xs font-medium text-[var(--primary)]"
                          >
                            Open module →
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ExamTrendCharts
                accuracyTrend={examDash.accuracyTrend}
                scoreTrend={examDash.scoreTrend}
              />
            </>
          )}
        </motion.section>
      )}

      {(coaching?.programs?.length ?? 0) > 0 && (
        <motion.section variants={dashboardItem} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">
              <GraduationCap className="mr-2 inline-block h-5 w-5 align-text-bottom text-[var(--primary)]" />
              Coaching program
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Exam-style tests, cohort rank, and practice links from your assigned batch.
            </p>
          </div>
          <div className="space-y-6">
            {coaching!.programs.map((prog) => (
              <div key={prog.programId} className={cn(surface, 'space-y-5 p-5')}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text)]">{prog.name}</h3>
                    <p className="text-xs text-[var(--muted)]">
                      {prog.examType.name}
                      {prog.description ? ` · ${prog.description}` : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                      <p className="text-[10px] font-medium uppercase text-[var(--muted)]">Accuracy</p>
                      <p className="text-lg font-bold tabular-nums text-[var(--text)]">
                        {prog.stats.overallAccuracyPct}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                      <p className="text-[10px] font-medium uppercase text-[var(--muted)]">Tests done</p>
                      <p className="text-lg font-bold tabular-nums text-[var(--text)]">
                        {prog.stats.testsCompleted}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                      <p className="text-[10px] font-medium uppercase text-[var(--muted)]">Time in tests</p>
                      <p className="text-lg font-bold tabular-nums text-[var(--text)]">
                        {formatDurationSec(prog.stats.timeSpentSec)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                      <p className="text-[10px] font-medium uppercase text-[var(--muted)]">Avg score</p>
                      <p className="text-lg font-bold tabular-nums text-[var(--text)]">
                        {prog.stats.avgScorePct}%
                      </p>
                    </div>
                  </div>
                </div>

                {subjectsForProgram(prog).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">Your subjects</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {subjectsForProgram(prog).map((s) => (
                        <Link
                          key={s.id}
                          to={`/subjects/${s.id}`}
                          className={cn(
                            surfaceLift,
                            surface,
                            'inline-flex min-w-[8rem] items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--text)]',
                          )}
                        >
                          <span aria-hidden className="text-lg">
                            {s.iconEmoji?.trim() || '📚'}
                          </span>
                          {s.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
                  <Trophy className="h-5 w-5 text-[var(--primary)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text)]">Rank in program</p>
                    <p className="text-xs text-[var(--muted)]">
                      {prog.rank != null && prog.percentile != null
                        ? `Last submitted test: rank #${prog.rank} · ${Math.round(prog.percentile)}th percentile${prog.lastTestTitle ? ` (${prog.lastTestTitle})` : ''}`
                        : 'Complete a program test to see your cohort rank.'}
                    </p>
                  </div>
                </div>

                {prog.tests.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">Tests</p>
                    <ul className="mt-2 space-y-2">
                      {prog.tests.map((t) => (
                        <li
                          key={t.id}
                          className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium text-[var(--text)]">{t.title}</p>
                            <p className="text-xs text-[var(--muted)]">
                              {t.durationMins} min · {t.questionCount} questions · +4/−1 marking
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="shrink-0 rounded-xl"
                            disabled={t.questionCount < 1 || startNeetTest.isPending}
                            onClick={() => startNeetTest.mutate(t.id)}
                          >
                            <Play className="mr-1 h-3.5 w-3.5" />
                            Start
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {prog.weakAreas.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">Weak areas</p>
                    <ul className="mt-2 space-y-2">
                      {prog.weakAreas.map((w, i) => (
                        <li
                          key={`${prog.programId}-${w.subjectId ?? w.subject}-${i}`}
                          className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-[var(--text)]">{w.message}</p>
                            <p className="text-xs text-[var(--muted)]">
                              {w.subject} · {w.accuracyPct}% accuracy ·{' '}
                              <span className="font-semibold text-amber-700 dark:text-amber-300">
                                {w.status}
                              </span>
                            </p>
                          </div>
                          <Button size="sm" variant="secondary" className="shrink-0 rounded-xl" asChild>
                            <Link to={w.practicePath}>Practice now</Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {prog.courses.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                    {prog.courses.map((c) => (
                      <Button key={c.linkId} variant="outline" size="sm" className="rounded-xl" asChild>
                        <Link to={`/courses/${c.courseId}`}>
                          {c.title}
                          {c.subject?.name ? ` · ${c.subject.name}` : ''}
                        </Link>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {data?.insights && (
        <motion.section variants={dashboardItem} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">
                Performance & insights
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Built from your quiz attempts and lesson progress.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={cn(surface, 'p-5')}>
              <p className="flex items-center gap-2 text-xs font-medium uppercase text-[var(--muted)]">
                <Target className="h-3.5 w-3.5" />
                Accuracy
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text)]">
                {data.insights.stats.overallAccuracyPct}%
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {data.insights.stats.questionsAttempted} questions attempted
              </p>
            </div>
            <div className={cn(surface, 'p-5')}>
              <p className="flex items-center gap-2 text-xs font-medium uppercase text-[var(--muted)]">
                <TrendingUp className="h-3.5 w-3.5" />
                Progress
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text)]">
                {overallPct}%
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Course completion (avg.)</p>
            </div>
            <div className={cn(surface, 'p-5')}>
              <p className="flex items-center gap-2 text-xs font-medium uppercase text-[var(--muted)]">
                <Trophy className="h-3.5 w-3.5" />
                Courses tracked
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text)]">
                {data.insights.courseRanks.length}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">With ranking data</p>
            </div>
          </div>

          {(data.insights.contentProgress?.length ?? 0) > 0 && (
            <div className={cn(surface, 'p-5')}>
              <h3 className="font-semibold text-[var(--text)]">Content progress</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Lessons and assessments marked complete (watch / read / submitted
                quiz).
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {data.insights.contentProgress!.map((c) => (
                  <li
                    key={c.courseId}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
                  >
                    <span className="font-medium text-[var(--text)]">
                      {c.courseTitle}
                    </span>
                    <span className="tabular-nums text-[var(--muted)]">
                      {formatCourseProgressLabel(c)} · {c.progressPct}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.insights.courseRanks.length > 0 && (
            <div className={cn(surface, 'p-5')}>
              <h3 className="font-semibold text-[var(--text)]">Rank in course</h3>
              <ul className="mt-3 space-y-3">
                {data.insights.courseRanks.map((r) => (
                  <li
                    key={r.courseId}
                    className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-[var(--text)]">{r.courseTitle}</p>
                      <p className="text-sm text-[var(--muted)]">{r.comparisonLine}</p>
                    </div>
                    <div className="text-right text-sm">
                      <span className="font-semibold tabular-nums text-[var(--text)]">
                        Rank #{r.rank}
                      </span>
                      <span className="text-[var(--muted)]"> / {r.cohortSize}</span>
                      <p className="text-xs text-[var(--muted)]">
                        Avg score {r.avgScorePct}% · {Math.round(r.percentile)}th pct
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.insights.weakAreas.length > 0 && (
            <div className={cn(surface, 'p-5')}>
              <h3 className="font-semibold text-[var(--text)]">Weak areas</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Focus here first — links open the matching course section (module).
              </p>
              <ul className="mt-4 space-y-3">
                {data.insights.weakAreas.map((w, i) => (
                  <li
                    key={`${w.courseId}-${w.moduleId}-${i}`}
                    className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-[var(--text)]">{w.message}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {w.subject} · {w.accuracyPct}% accuracy ·{' '}
                        <span className="font-semibold text-amber-700 dark:text-amber-300">
                          {w.status}
                        </span>
                      </p>
                    </div>
                    <Button className="shrink-0 rounded-xl" asChild>
                      <Link to={w.practicePath}>Practice now</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.section>
      )}

      {data?.resume && resumeHref && (
        <motion.section variants={dashboardItem} className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Continue learning
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Continue where you left off
              {data.resume.lessonTitle ? ` — ${data.resume.lessonTitle}` : ''}.
            </p>
          </div>
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              surface,
              'overflow-hidden shadow-md ring-1 ring-[color-mix(in_srgb,var(--text)_5%,transparent)]',
            )}
          >
            <div className="grid gap-0 sm:grid-cols-[minmax(0,220px)_1fr]">
              {data.resume.courseId && (
                <CourseCover
                  courseId={data.resume.courseId}
                  title={data.resume.courseTitle ?? 'Course'}
                  aspectClass="aspect-[16/10] min-h-[140px] sm:min-h-full sm:rounded-none sm:rounded-l-2xl"
                  className="sm:rounded-l-2xl sm:rounded-r-none"
                />
              )}
              <div className="flex flex-col justify-center gap-4 p-5 sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                    In progress
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--text)]">
                    {data.resume.courseTitle ?? 'Your course'}
                  </p>
                  {data.resume.lessonTitle && (
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Next up: {data.resume.lessonTitle}
                    </p>
                  )}
                </div>
                {typeof data.resume.progressPct === 'number' && (
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-medium text-[var(--muted)]">
                      <span>Course progress</span>
                      <span>{data.resume.progressPct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
                      <motion.div
                        className="h-full rounded-full bg-[var(--primary)]"
                        initial={false}
                        animate={{
                          width: `${data.resume.progressPct}%`,
                        }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                      />
                    </div>
                  </div>
                )}
                <div>
                  <Button asChild size="lg" className="rounded-xl">
                    <Link to={resumeHref}>Resume lesson</Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>
      )}

      {recommendations.length > 0 && (
        <motion.section variants={dashboardItem} className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Recommended next
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Courses with room to grow—pick one and move forward.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((c) => (
              <Link
                key={c.courseId}
                to={`/courses/${c.courseId}`}
                className={cn(
                  surface,
                  surfaceLift,
                  'block p-4 transition-transform duration-200',
                )}
              >
                <p className="line-clamp-2 font-medium text-[var(--text)]">
                  {c.title}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {c.progressPct}% complete — keep going
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                    style={{ width: `${c.progressPct}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      <motion.div variants={dashboardItem} className="grid gap-6 lg:grid-cols-3">
        <section className={cn(surface, 'p-5 lg:col-span-1')}>
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Flame className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-base font-semibold">Learning streak</h2>
          </div>
          <p className="mt-4 text-4xl font-bold tracking-tight text-[var(--primary)]">
            {streak}
            <span className="ml-1 text-lg font-semibold text-[var(--muted)]">
              day{streak === 1 ? '' : 's'}
            </span>
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            UTC days with learning activity. Keep the flame going.
          </p>
        </section>

        <section className={cn(surface, 'p-5 lg:col-span-1')}>
          <div className="flex items-center gap-2 text-[var(--text)]">
            <CalendarCheck className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-base font-semibold">Attendance (30d)</h2>
          </div>
          <p className="mt-4 text-4xl font-bold tracking-tight text-[var(--primary)]">
            {data?.attendance?.attendancePct ?? 0}%
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Present days vs tracked days—steady habits compound.
          </p>
        </section>

        <section
          className={cn(
            surface,
            'flex flex-col justify-center p-5 lg:col-span-1',
            showNudge &&
              'border-[var(--accent-warn-border)] bg-[var(--accent-warn-bg)]',
          )}
        >
          {showNudge ? (
            <>
              <p className="text-sm font-semibold text-[var(--accent-warn-text)]">
                Finish strong
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
                You&apos;re {Math.round(overallPct)}% done—pick a short lesson
                today and close the gap.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[var(--text)]">
                You&apos;re on track
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Recent activity looks steady. Keep your rhythm when you can.
              </p>
            </>
          )}
        </section>
      </motion.div>

      <motion.section
        variants={dashboardItem}
        className={cn(
          surface,
          'border-[var(--accent-warn-border)] bg-[color-mix(in_srgb,var(--accent-warn-bg)_70%,var(--card))] p-5',
        )}
      >
        <div className="flex items-center gap-2 text-[var(--text)]">
          <ClipboardList className="h-5 w-5 text-[var(--accent-warn-text)]" />
          <h2 className="text-base font-semibold">Upcoming tasks</h2>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Assessments and deadlines that need your attention.
        </p>
        <ul className="mt-4 space-y-2">
          {upcoming.length === 0 && (
            <li className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-6 text-center text-sm text-[var(--muted)]">
              Nothing due right now—great time to explore a new module.
            </li>
          )}
          {upcoming.map((n) => {
            const meta = n.metadata as { courseId?: string } | null
            return (
              <li key={n.id}>
                <Link
                  to={
                    meta?.courseId ? `/courses/${meta.courseId}` : '/courses'
                  }
                  className={cn(
                    surface,
                    'flex gap-3 p-3 transition-shadow duration-200 hover:shadow-md',
                  )}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'var(--accent-warn-bg)' }}
                  >
                    <ClipboardList className="h-5 w-5 text-[var(--accent-warn-text)]" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--text)]">{n.title}</p>
                    <p className="line-clamp-2 text-sm text-[var(--muted)]">
                      {n.body}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </motion.section>

      <motion.section variants={dashboardItem} className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Enrolled courses
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Covers, progress, and quick access
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="rounded-xl">
            <Link to="/courses">Browse catalog</Link>
          </Button>
        </div>

        {enrolled.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center">
            <EmptyCoursesArt className="mb-4 h-32 w-40 text-[var(--muted)]" />
            <p className="text-lg font-medium text-[var(--text)]">
              No courses yet
            </p>
            <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">
              Start with something that excites you—the catalog is ready when
              you are.
            </p>
            <Button asChild className="mt-6 rounded-xl">
              <Link to="/courses">Start your first course</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {enrolled.map((c, i) => (
              <motion.div
                key={c.courseId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
              >
                <Link
                  to={`/courses/${c.courseId}`}
                  className={cn(
                    surface,
                    'group flex h-full flex-col overflow-hidden transition duration-200',
                    surfaceLift,
                  )}
                >
                  <CourseCover
                    courseId={c.courseId}
                    title={c.title}
                    aspectClass="aspect-[16/9]"
                    className="rounded-none rounded-t-2xl"
                  />
                  <div className="flex flex-1 flex-col p-4">
                    <p
                      className={cn(
                        'line-clamp-2 font-semibold text-[var(--text)] transition-colors',
                        'group-hover:text-[var(--primary)]',
                      )}
                    >
                      {c.title}
                    </p>
                    {c.organizationName && (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {c.organizationName}
                      </p>
                    )}
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">
                      {c.description?.trim() ||
                        'Open the course to continue your path.'}
                    </p>
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs font-medium text-[var(--muted)]">
                        <span>Progress</span>
                        <span>{c.progressPct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                          style={{ width: `${c.progressPct}%` }}
                        />
                      </div>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)]">
                      <BookOpen className="h-4 w-4" />
                      Open course
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {chartData && (
        <motion.section variants={dashboardItem} className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Your progress
          </h2>
          <Suspense fallback={<LazyChartsFallback />}>
            <StudentDashboardCharts data={chartData} />
          </Suspense>
        </motion.section>
      )}

      {data?.analytics?.computedAt && (
        <motion.p
          variants={dashboardItem}
          className="text-center text-xs text-[var(--muted)]"
        >
          Analytics snapshot:{' '}
          {new Date(data.analytics.computedAt).toLocaleString()}
        </motion.p>
      )}
    </motion.div>
  )
}
