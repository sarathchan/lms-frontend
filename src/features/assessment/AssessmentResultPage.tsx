import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { CheckCircle2, XCircle } from 'lucide-react'
import {
  EncourageRetryArt,
  SuccessCelebrationArt,
} from '../../components/visual/AssessmentArt'

type Result = {
  attemptId: string
  quizId: string
  courseId: string
  lessonTitle: string
  scorePct: number
  pass: boolean
  passScorePct: number
  needsManualReview: boolean
  accuracyPct?: number
  rank?: number | null
  cohortSize?: number | null
  percentile?: number | null
  aheadOfPct?: number | null
  comparisonLine?: string | null
  weakTopics?: { subject: string; chapter: string; topic: string; label: string }[]
  items: {
    questionId: string
    type: string
    prompt: string
    points: number
    userAnswer: unknown
    correct: boolean
    expected: unknown
    subject?: string
    chapter?: string
    topic?: string
  }[]
}

export function AssessmentResultPage() {
  const { quizId, attemptId } = useParams<{
    quizId: string
    attemptId: string
  }>()

  const { data, isLoading } = useQuery({
    queryKey: ['assessment', 'result', attemptId],
    queryFn: async () => {
      const { data } = await api.get<Result>(
        `assessments/attempts/${attemptId}/result`,
      )
      return data
    },
    enabled: !!attemptId,
  })

  if (!quizId || !attemptId) return <Navigate to="/courses" replace />

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  if (data.quizId !== quizId) {
    return <Navigate to={`/assessment/${data.quizId}/result/${attemptId}`} replace />
  }

  const showSuccessArt =
    !data.needsManualReview && data.pass
  const showRetryArt =
    !data.needsManualReview && !data.pass

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-8 px-4 py-8"
    >
      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-6 py-8 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            {data.lessonTitle}
          </CardTitle>
          <p className="mt-2 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {data.needsManualReview
              ? 'Your written answers are with your instructor for review.'
              : data.pass
                ? 'Strong work—you met the passing score.'
                : `Passing score is ${data.passScorePct}%. Review below and try again when ready.`}
          </p>
        </CardHeader>
        <CardContent className="space-y-8 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
            <div
              className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full border-4 border-indigo-100 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/40"
              aria-live="polite"
            >
              <span className="text-4xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                {data.scorePct}%
              </span>
            </div>
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              {showSuccessArt && (
                <SuccessCelebrationArt className="mb-3 h-24 w-32 sm:order-first" />
              )}
              {showRetryArt && (
                <EncourageRetryArt className="mb-3 h-24 w-32 sm:order-first" />
              )}
              {data.needsManualReview ? (
                <span className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                  Pending review
                </span>
              ) : data.pass ? (
                <span className="flex items-center gap-2 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" /> Passed
                </span>
              ) : (
                <span className="flex items-center gap-2 text-lg font-semibold text-red-600 dark:text-red-400">
                  <XCircle className="h-7 w-7" /> Not passed yet
                </span>
              )}
            </div>
          </div>

          {(data.accuracyPct != null ||
            data.rank != null ||
            (data.weakTopics && data.weakTopics.length > 0)) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.accuracyPct != null && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Accuracy (this attempt)
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                    {data.accuracyPct}%
                  </p>
                </div>
              )}
              {data.rank != null && data.cohortSize != null && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Rank in course
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                    #{data.rank}{' '}
                    <span className="text-base font-normal text-slate-500">
                      / {data.cohortSize}
                    </span>
                  </p>
                  {data.comparisonLine && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {data.comparisonLine}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {data.weakTopics && data.weakTopics.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Weak topics (this attempt)
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
                {data.weakTopics.map((w, i) => (
                  <li key={i}>{w.label}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Question review
            </h2>
            <ul className="mt-4 space-y-4">
              {data.items.map((it, i) => (
                <li
                  key={it.questionId}
                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {i + 1}. {it.prompt}
                    </p>
                    {!data.needsManualReview &&
                      it.type !== 'DESCRIPTIVE' &&
                      it.type !== 'AI_GENERATED' &&
                      (it.correct ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                      ))}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Your answer:
                    </span>{' '}
                    {String(it.userAnswer ?? '—')}
                  </p>
                  {it.expected != null &&
                    !data.needsManualReview &&
                    it.type === 'MCQ' && (
                      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Correct:</span>{' '}
                        {String(it.expected)}
                      </p>
                    )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500"
            >
              <Link to={`/courses/${data.courseId}`}>Back to course</Link>
            </Button>
            <Button asChild className="rounded-xl" variant="outline">
              <Link to="/courses">All courses</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
