import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { cn } from '../../lib/utils'
import { neetCourseAccent, neetCourseIcon } from './neetCourseTheme'

type CatalogRow = {
  id: string
  title: string
  stats: {
    accuracyPct: number
    questionsPracticed: number
    testsCompleted: number
    progressPct: number
  }
  streak: number
}

export function StudentNeetCoursesSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['neet', 'learner', 'catalog'],
    queryFn: async () => {
      const { data } = await api.get<{ courses: CatalogRow[] }>('neet/learner/courses')
      return data
    },
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">NEET courses</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Physics, Chemistry, and Biology — each with chapters, practice, timed tests, and
          analysis. Stay inside a course for a focused prep loop.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.courses.map((course, i) => {
          const accent = neetCourseAccent(course.id)
          const Icon = neetCourseIcon(course.id)
          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/courses/${course.id}`}
                className={cn(
                  'flex h-full flex-col overflow-hidden rounded-2xl border bg-[var(--card)] shadow-sm transition',
                  'hover:-translate-y-1 hover:shadow-lg',
                  accent.border,
                )}
              >
                <div
                  className={cn(
                    'flex items-center gap-4 border-b border-[var(--border)] px-6 py-5',
                    accent.bgSoft,
                  )}
                >
                  <div
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl ring-2',
                      accent.ring,
                      'bg-[var(--card)]',
                    )}
                  >
                    <Icon className={cn('h-8 w-8', accent.text)} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-[var(--text)]">{course.title}</h2>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--muted)]">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      {course.streak} day streak
                    </p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-center justify-center">
                    <div
                      className={cn(
                        'flex h-20 w-20 items-center justify-center rounded-full text-base font-bold tabular-nums ring-4',
                        accent.ring,
                        accent.bgSoft,
                        accent.text,
                      )}
                    >
                      {course.stats.progressPct}%
                    </div>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <dt className="text-[var(--muted)]">Accuracy</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-[var(--text)]">
                        {course.stats.accuracyPct}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Practiced</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-[var(--text)]">
                        {course.stats.questionsPracticed}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Tests</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-[var(--text)]">
                        {course.stats.testsCompleted}
                      </dd>
                    </div>
                  </dl>
                  <span
                    className={cn(
                      'mt-auto block rounded-xl py-2.5 text-center text-sm font-medium',
                      accent.bgSoft,
                      accent.text,
                    )}
                  >
                    Open course →
                  </span>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
