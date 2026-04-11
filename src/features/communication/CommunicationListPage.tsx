import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { useAuthStore } from '../../stores/authStore'
import { Headphones, Mic, PenLine, Settings2 } from 'lucide-react'

type PublishedTest = {
  id: string
  title: string
  description: string | null
}

type MyAssignmentRow = {
  assignmentId: string
  test: PublishedTest & { published?: boolean }
  latestAttempt: {
    id: string
    status: string
    submittedAt: string | null
  } | null
}

export function CommunicationListPage() {
  const role = useAuthStore((s) => s.user?.role)
  const isStaff = role && role !== 'STUDENT'
  const isStudent = role === 'STUDENT'

  const { data: mine, isLoading: mineLoading } = useQuery({
    queryKey: ['communication', 'assignments', 'me'],
    queryFn: async () => {
      const { data } = await api.get<MyAssignmentRow[]>('communication/assignments/me')
      return data
    },
    enabled: isStudent,
  })

  const { data: published, isLoading: pubLoading } = useQuery({
    queryKey: ['communication', 'tests', 'published'],
    queryFn: async () => {
      const { data } = await api.get<PublishedTest[]>('communication/tests/published')
      return data
    },
    enabled: !isStudent && !!isStaff,
  })

  const loading = isStudent ? mineLoading : pubLoading

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1>Communication assessments</h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
            {isStudent
              ? 'Assigned tests: essay, listening, and speaking in order. Progress saves until you submit.'
              : 'Preview published tests or open staff tools to build pools, tests, and assignments.'}
          </p>
        </div>
        {isStaff && (
          <Button variant="outline" asChild className="shrink-0 gap-2">
            <Link to="/communication/questions">
              <Settings2 className="h-4 w-4" />
              Staff: manage communication
            </Link>
          </Button>
        )}
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      )}

      {isStudent && !loading && (!mine || mine.length === 0) && (
        <div className="lms-card text-center text-slate-600 dark:text-slate-400">
          <p className="text-base">No communication tests are assigned to you yet.</p>
        </div>
      )}

      {isStudent && !loading && mine && mine.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {mine.map((row) => {
            const done = row.latestAttempt?.status === 'SUBMITTED'
            return (
              <li key={row.assignmentId}>
                <div className="lms-card flex h-full flex-col space-y-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {row.test.title}
                    </h2>
                    {row.test.description && (
                      <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {row.test.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <PenLine className="h-3.5 w-3.5" /> Essay
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Headphones className="h-3.5 w-3.5" /> Listening
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mic className="h-3.5 w-3.5" /> Speaking
                      </span>
                    </div>
                    {done && row.latestAttempt && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Submitted —{' '}
                        <Link
                          to={`/communication/result/${row.latestAttempt.id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          View result
                        </Link>
                      </p>
                    )}
                    {row.latestAttempt?.status === 'DRAFT' && (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        You have an attempt in progress.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!done && row.latestAttempt?.status !== 'DRAFT' && (
                      <Button asChild className="rounded-xl">
                        <Link to={`/communication/${row.test.id}`}>Start test</Link>
                      </Button>
                    )}
                    {!done && row.latestAttempt?.status === 'DRAFT' && (
                      <Button asChild className="rounded-xl">
                        <Link to={`/communication/${row.test.id}`}>Continue test</Link>
                      </Button>
                    )}
                    {done && (
                      <Button variant="outline" asChild className="rounded-xl">
                        <Link to={`/communication/${row.test.id}`}>New attempt</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!isStudent && isStaff && !loading && (!published || published.length === 0) && (
        <div className="lms-card text-slate-600 dark:text-slate-400">
          <p className="text-base">No published communication tests in your scope.</p>
          <p className="mt-2 text-sm">
            <Link
              to="/communication/tests"
              className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
            >
              Open test management
            </Link>
          </p>
        </div>
      )}

      {!isStudent && isStaff && !loading && published && published.length > 0 && (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Staff preview — learners only see tests assigned to them.
          </p>
          <ul className="grid gap-4 md:grid-cols-2">
            {published.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/communication/${t.id}`}
                  className="lms-card block space-y-3 transition-shadow hover:shadow-md"
                >
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {t.title}
                  </h2>
                  {t.description && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {t.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 pt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <PenLine className="h-3.5 w-3.5" /> Essay
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Headphones className="h-3.5 w-3.5" /> Listening
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mic className="h-3.5 w-3.5" /> Speaking
                    </span>
                  </div>
                  <span className="inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    Preview / take →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </motion.div>
  )
}
