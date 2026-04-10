import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'

type Q = {
  id: string
  type: string
  prompt: string
  options?: string[]
  order: number
  points?: number
}

export function QuizModal({
  open,
  onOpenChange,
  quizId,
  lessonTitle,
  questions,
  timeLimitSec,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  quizId: string
  lessonTitle: string
  questions: Q[]
  timeLimitSec: number | null
  onDone: () => void
}) {
  const sorted = useMemo(
    () => [...questions].sort((a, b) => a.order - b.order),
    [questions],
  )
  const [answers, setAnswers] = useState<unknown[]>(() =>
    sorted.map(() => ''),
  )
  const [startedAt] = useState(() => Date.now())
  const [remain, setRemain] = useState<number | null>(
    timeLimitSec != null ? timeLimitSec : null,
  )

  useEffect(() => {
    if (remain === null || !open) return
    const t = setInterval(() => {
      setRemain((r) => (r === null ? r : Math.max(0, r - 1)))
    }, 1000)
    return () => clearInterval(t)
  }, [remain, open])

  useEffect(() => {
    if (open) {
      setAnswers(sorted.map(() => ''))
    }
  }, [open, sorted])

  const submit = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`assessments/quizzes/${quizId}/submit`, {
        answers,
        clientStartedAt: new Date(startedAt).toISOString(),
      })
      return data
    },
    onSuccess: (data: {
      scorePct?: number
      pass?: boolean
      needsManualReview?: boolean
    }) => {
      if (data.pass) toast.success(`Passed — score ${data.scorePct ?? 0}%`)
      else if (data.needsManualReview)
        toast.message('Submitted — awaits instructor grading')
      else toast.error(`Not passed — ${data.scorePct ?? 0}%`)
      onDone()
      onOpenChange(false)
    },
  })

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r.toString().padStart(2, '0')}`
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(100vw-1.5rem,40rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-white">
                {lessonTitle}
              </Dialog.Title>
              {remain !== null && (
                <p
                  className={cn(
                    'mt-1 text-sm font-medium',
                    remain < 60 ? 'text-red-600' : 'text-slate-500',
                  )}
                >
                  Time left: {fmt(remain)}
                </p>
              )}
            </div>
            <Dialog.Close className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="space-y-6">
            {sorted.map((q, i) => (
              <div
                key={q.id}
                className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {i + 1}. {q.prompt}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    ({q.type})
                  </span>
                </p>
                {q.type === 'MCQ' && q.options && (
                  <div className="mt-3 space-y-2">
                    {q.options.map((opt, j) => (
                      <label
                        key={j}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[i] === j}
                          onChange={() => {
                            const next = [...answers]
                            next[i] = j
                            setAnswers(next)
                          }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
                {(q.type === 'FILL_BLANK' || q.type === 'FILE_UPLOAD') && (
                  <input
                    className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder={
                      q.type === 'FILE_UPLOAD'
                        ? 'Paste URL to uploaded file'
                        : 'Your answer'
                    }
                    value={String(answers[i] ?? '')}
                    onChange={(e) => {
                      const next = [...answers]
                      next[i] = e.target.value
                      setAnswers(next)
                    }}
                  />
                )}
                {(q.type === 'DESCRIPTIVE' ||
                  q.type === 'AI_GENERATED' ||
                  q.type === 'VOICE') && (
                  <textarea
                    className="mt-3 min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder="Your answer"
                    value={String(answers[i] ?? '')}
                    onChange={(e) => {
                      const next = [...answers]
                      next[i] = e.target.value
                      setAnswers(next)
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              disabled={submit.isPending || (remain !== null && remain <= 0)}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? 'Submitting…' : 'Submit assessment'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
