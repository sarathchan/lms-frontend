import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api, formatAxiosError } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardTitle } from '../../components/ui/card'
import { ArrowLeft, ClipboardList, Clock } from 'lucide-react'
import { AssessmentIntroArt } from '../../components/visual/AssessmentArt'

type QuizMeta = {
  quizId: string
  lessonTitle: string
  courseId: string
  timeLimitSec: number | null
  maxAttempts: number
  passScorePct: number
  attemptsUsed: number
  questions: { id: string; type: string; prompt: string; order: number }[]
}

export function AssessmentIntroPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['assessment', 'quiz', quizId],
    queryFn: async () => {
      const { data } = await api.get<QuizMeta>(`assessments/quizzes/${quizId}`, {
        silent: true,
      })
      return data
    },
    enabled: !!quizId,
    retry: false,
  })

  if (!quizId) return <Navigate to="/courses" replace />

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (error || !data) {
    const detail = error ? formatAxiosError(error) : ''
    return (
      <div className="mx-auto max-w-lg p-6">
        <Card className="rounded-2xl border-red-200 dark:border-red-900">
          <CardContent className="py-8 text-center leading-7">
            <p className="text-slate-800 dark:text-slate-200">
              {detail ||
                'Unable to open this assessment. Complete earlier lessons or check enrollment.'}
            </p>
            <Button asChild className="mt-4 rounded-xl" variant="outline">
              <Link to="/courses">Back to courses</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const remaining = Math.max(0, data.maxAttempts - data.attemptsUsed)
  if (remaining <= 0) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Card className="rounded-2xl">
          <CardContent className="py-8 text-center leading-7">
            <p className="font-medium text-slate-900 dark:text-white">
              No attempts remaining
            </p>
            <Button asChild className="mt-4 rounded-xl" variant="outline">
              <Link to={`/courses/${data.courseId}`}>Return to course</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}m ${r}s`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
    >
      <Link
        to={`/courses/${data.courseId}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to course
      </Link>

      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 border-b border-slate-100 bg-gradient-to-br from-indigo-50/90 to-white p-6 dark:border-slate-800 dark:from-indigo-950/40 dark:to-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <AssessmentIntroArt className="h-24 w-28 shrink-0 sm:h-28 sm:w-32" />
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.lessonTitle}
              </CardTitle>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {data.questions.length} questions · Pass at {data.passScorePct}%
              </p>
            </div>
          </div>
          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 sm:flex">
            <ClipboardList className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <CardContent className="space-y-6 p-6">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Before you start
            </h2>
            <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <li>
                Answer all questions. You can move between questions before
                submitting.
              </li>
              <li>
                {data.timeLimitSec
                  ? `Time limit: ${fmt(data.timeLimitSec)} once you start.`
                  : 'No time limit for this assessment.'}
              </li>
              <li>
                Attempts left: <strong>{remaining}</strong> of {data.maxAttempts}
              </li>
            </ul>
          </div>

          {data.timeLimitSec != null && (
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Timer starts when you begin the attempt
            </p>
          )}

          <Button
            className="h-12 w-full rounded-xl bg-indigo-600 text-base font-semibold shadow-sm hover:bg-indigo-500"
            size="lg"
            onClick={() => navigate(`/assessment/${quizId}/take`)}
          >
            Start assessment
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
