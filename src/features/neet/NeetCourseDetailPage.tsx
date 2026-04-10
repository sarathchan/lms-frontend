import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, ChevronRight, Flame, PlayCircle, RotateCcw } from 'lucide-react'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'
import {
  isNeetCourseSlug,
  neetCourseAccent,
  neetCourseIcon,
  neetCourseLabel,
} from './neetCourseTheme'

type Overview = {
  subject: string
  slug: string
  accuracyPct: number
  questionsPracticed: number
  testsCompleted: number
  progressPct: number
  streak: number
  weakChapter: { name: string; accuracy: number } | null
  continuePractice: { chapterId: string; chapterName: string } | null
  resumeTest: {
    attemptId: string
    chapterId?: string
    chapterName?: string
    testTitle: string
  } | null
}

type ChapterRow = {
  id: string
  name: string
  questionCount: number
  progressPct: number
  accuracyPct: number
  attemptedCount: number
}

const card =
  'rounded-2xl border bg-[var(--card)] p-5 shadow-sm transition-colors duration-200'

export function NeetCourseDetailPage() {
  const { courseId = '' } = useParams<{ courseId: string }>()
  if (!isNeetCourseSlug(courseId)) {
    return <Navigate to="/courses" replace />
  }
  const slug = courseId.toLowerCase()
  const accent = neetCourseAccent(slug)
  const Icon = neetCourseIcon(slug)
  const title = neetCourseLabel(slug)

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['neet', 'learner', 'overview', slug],
    queryFn: async () => {
      const { data } = await api.get<Overview>(`neet/learner/courses/${slug}/overview`)
      return data
    },
  })

  const { data: chaptersData, isLoading: chLoading } = useQuery({
    queryKey: ['neet', 'learner', 'chapters', slug],
    queryFn: async () => {
      const { data } = await api.get<{ chapters: ChapterRow[] }>(
        `neet/learner/courses/${slug}/chapters`,
      )
      return data
    },
  })

  if (ovLoading || !overview) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  const chapters = chaptersData?.chapters ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-8 pb-12"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-2',
              accent.ring,
              accent.bgSoft,
            )}
          >
            <Icon className={cn('h-8 w-8', accent.text)} aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              NEET course
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Chapters, practice, and timed tests in one flow.
            </p>
          </div>
        </div>
        <Link
          to="/courses"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          All subjects
        </Link>
      </div>

      <section
        className={cn(
          card,
          'border-[var(--border)]',
          accent.border,
        )}
      >
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex min-w-[8rem] flex-col items-center justify-center">
            <div
              className={cn(
                'relative flex h-24 w-24 items-center justify-center rounded-full text-lg font-bold tabular-nums ring-4',
                accent.ring,
                accent.bgSoft,
                accent.text,
              )}
            >
              {overview.progressPct}%
            </div>
            <p className="mt-2 text-xs font-medium text-[var(--muted)]">Progress</p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Accuracy" value={`${overview.accuracyPct}%`} />
            <Stat label="Practiced" value={String(overview.questionsPracticed)} />
            <Stat label="Tests done" value={String(overview.testsCompleted)} />
            <div className="flex flex-col justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
              <p className="flex items-center gap-1 text-xs font-medium text-[var(--muted)]">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                Streak
              </p>
              <p className="text-xl font-semibold tabular-nums text-[var(--text)]">
                {overview.streak}d
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:flex-wrap">
          {overview.continuePractice && (
            <Button className="rounded-xl" asChild>
              <Link
                to={`/courses/${slug}/chapter/${overview.continuePractice.chapterId}/practice`}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Continue practice
                <span className="ml-1 opacity-80">· {overview.continuePractice.chapterName}</span>
              </Link>
            </Button>
          )}
          {overview.resumeTest && (
            <Button variant="secondary" className="rounded-xl" asChild>
              <Link
                to={`/neet/exam/${overview.resumeTest.attemptId}`}
                state={{
                  exitTo: `/courses/${slug}`,
                  courseLabel: title,
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Resume test
                {overview.resumeTest.chapterName ? (
                  <span className="ml-1 opacity-80">· {overview.resumeTest.chapterName}</span>
                ) : null}
              </Link>
            </Button>
          )}
          {overview.weakChapter && (
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-500/5 px-4 py-3 text-sm dark:border-amber-900/50">
              <BookOpen className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="text-[var(--text)]">
                <span className="font-medium">Weak chapter:</span>{' '}
                {overview.weakChapter.name}
                <span className="text-[var(--muted)]">
                  {' '}
                  ({overview.weakChapter.accuracy}% accuracy)
                </span>
              </span>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">Chapters</h2>
        {chLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : chapters.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
            No chapter content is published for this subject yet. Your instructor will add
            questions and notes here.
          </p>
        ) : (
          <ul className="grid gap-4">
            {chapters.map((ch) => (
              <li key={ch.id}>
                <div
                  className={cn(
                    card,
                    'border-[var(--border)] hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]',
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[var(--text)]">{ch.name}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {ch.questionCount} questions in bank · {ch.attemptedCount} attempted in
                        practice/tests
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <span className="text-[var(--muted)]">
                          Progress{' '}
                          <span className="font-medium text-[var(--text)]">{ch.progressPct}%</span>
                        </span>
                        <span className="text-[var(--muted)]">
                          Accuracy{' '}
                          <span className="font-medium text-[var(--text)]">
                            {ch.accuracyPct}%
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="rounded-xl" asChild>
                        <Link
                          to={`/courses/${slug}/chapter/${encodeURIComponent(ch.name)}/practice`}
                        >
                          Practice
                        </Link>
                      </Button>
                      <Button size="sm" variant="secondary" className="rounded-xl" asChild>
                        <Link
                          to={`/courses/${slug}/chapter/${encodeURIComponent(ch.name)}/test`}
                        >
                          Test
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-xl" asChild>
                        <Link
                          to={`/courses/${slug}/chapter/${encodeURIComponent(ch.name)}/practice?review=1`}
                        >
                          Review
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-[var(--muted)]">
        Course → Chapters → Practice → Test → Analysis
        <ChevronRight className="mx-1 inline h-3 w-3" aria-hidden />
        stay inside this subject for focused prep.
      </p>
    </motion.div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-[var(--text)]">{value}</p>
    </div>
  )
}
