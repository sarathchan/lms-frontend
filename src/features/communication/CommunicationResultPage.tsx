import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { Headphones, Mic, PenLine } from 'lucide-react'

type ScoreRow = {
  questionId: string
  type: string
  score: number
  detail: Record<string, unknown>
}

export function CommunicationResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['communication', 'result', attemptId],
    queryFn: async () => {
      const { data } = await api.get(`communication/attempts/${attemptId}/result`)
      return data as {
        scores: {
          totalScorePct?: number
          questions?: ScoreRow[]
        } | null
        responses: unknown
        test: { title: string }
        status: string
      }
    },
    enabled: !!attemptId,
  })

  if (!attemptId) return <Navigate to="/communication" replace />
  if (isLoading || !data)
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )

  const pct = data.scores?.totalScorePct ?? 0
  const rows = (data.scores?.questions ?? []) as ScoreRow[]

  const essay = rows.find((r) => r.type === 'ESSAY')
  const listen = rows.find((r) => r.type === 'LISTENING')
  const speak = rows.find((r) => r.type === 'SPEAKING')

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="lms-card space-y-4">
        <h1>Results — {data.test.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Status: {data.status}
        </p>
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Overall score</p>
          <p className="text-4xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            {pct}%
          </p>
        </div>
        <p className="text-base leading-7 text-slate-700 dark:text-slate-300">
          Average of essay, listening, and speaking (each scored 0–100 for display).
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Section breakdown
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            {rows.map((r) => (
              <li key={r.questionId} className="flex justify-between gap-4">
                <span className="font-medium">{r.type}</span>
                <span className="tabular-nums text-slate-900 dark:text-slate-100">
                  {r.score}/100
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {essay && (
          <div className="lms-card space-y-3">
            <h2 className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-indigo-600" />
              Essay feedback
            </h2>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {essay.score}/100
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              {(essay.detail.feedback as string) ??
                JSON.stringify(essay.detail, null, 2)}
            </div>
            {typeof essay.detail.grammar === 'number' && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Grammar: {essay.detail.grammar} · Clarity:{' '}
                {String(essay.detail.clarity ?? '—')} · Structure:{' '}
                {String(essay.detail.structure ?? '—')}
              </p>
            )}
          </div>
        )}

        {listen && (
          <div className="lms-card space-y-3">
            <h2 className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-indigo-600" />
              Listening accuracy
            </h2>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {listen.score}/100
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              {(listen.detail.feedback as string) ??
                `Match / AI score recorded.`}
            </div>
          </div>
        )}

        {speak && (
          <div className="lms-card space-y-3">
            <h2 className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-indigo-600" />
              Speaking evaluation
            </h2>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {speak.score}/100
            </p>
            {(() => {
              const tr = speak.detail.transcript
              const show =
                tr != null && String(tr).trim().length > 0
              if (!show) return null
              return (
                <div>
                  <h3>Transcript</h3>
                  <p className="rounded-xl border border-slate-200 bg-white p-4 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    {String(tr)}
                  </p>
                </div>
              )
            })()}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              {(speak.detail.feedback as string) ??
                JSON.stringify(speak.detail, null, 2)}
            </div>
          </div>
        )}
      </div>

      <Button asChild variant="outline">
        <Link to="/communication">Back to tests</Link>
      </Button>
    </motion.div>
  )
}
