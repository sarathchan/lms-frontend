import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookMarked } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'

type Revision = {
  bookmarks: {
    id: string
    reviseLater: boolean
    question: {
      id: string
      prompt: string
      subject: string
      chapter: string
      options: unknown
      correctIndex: number
      explanation: string
    }
  }[]
  incorrectQuestions: {
    id: string
    prompt: string
    subject: string
    chapter: string
    options: unknown
    correctIndex: number
    explanation: string
  }[]
}

export function NeetRevisionPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['neet', 'revision'],
    queryFn: async () => {
      const { data } = await api.get<Revision>('neet/revision')
      return data
    },
  })

  const removeBm = useMutation({
    mutationFn: async (questionId: string) => {
      await api.delete(`neet/questions/${questionId}/bookmark`)
    },
    onSuccess: () => {
      toast.success('Removed')
      void qc.invalidateQueries({ queryKey: ['neet', 'revision'] })
    },
  })

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <Link
          to="/neet"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          ← NEET hub
        </Link>
        <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold text-[var(--text)]">
          <BookMarked className="h-7 w-7 text-[var(--primary)]" />
          Revise later
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Bookmarked items and questions you missed recently.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text)]">Bookmarks</h2>
        {data.bookmarks.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            No bookmarks yet. Bookmark from a result screen to build your list.
          </p>
        )}
        <ul className="space-y-4">
          {data.bookmarks.map((b) => {
            const opts = b.question.options as string[]
            return (
              <li
                key={b.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-xs text-[var(--muted)]">
                    {b.question.subject} · {b.question.chapter}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => removeBm.mutate(b.question.id)}
                  >
                    Remove
                  </Button>
                </div>
                <p className="mt-2 text-[var(--text)]">{b.question.prompt}</p>
                <ol className="mt-2 list-inside list-decimal text-sm text-[var(--muted)]">
                  {opts.map((o, i) => (
                    <li
                      key={i}
                      className={
                        i === b.question.correctIndex
                          ? 'font-medium text-[var(--primary)]'
                          : ''
                      }
                    >
                      {o}
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {b.question.explanation}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Reattempt incorrect
        </h2>
        <p className="text-sm text-[var(--muted)]">
          From your last mocks (aggregated). Review explanations, then retry in a
          fresh test.
        </p>
        {data.incorrectQuestions.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            No incorrect questions in recent attempts—great work.
          </p>
        )}
        <ul className="space-y-4">
          {data.incorrectQuestions.map((q) => {
            const opts = q.options as string[]
            return (
              <li
                key={q.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <span className="text-xs text-[var(--muted)]">
                  {q.subject} · {q.chapter}
                </span>
                <p className="mt-2 text-[var(--text)]">{q.prompt}</p>
                <ol className="mt-2 list-inside list-decimal text-sm text-[var(--muted)]">
                  {opts.map((o, i) => (
                    <li
                      key={i}
                      className={
                        i === q.correctIndex
                          ? 'font-medium text-[var(--primary)]'
                          : ''
                      }
                    >
                      {o}
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-sm text-[var(--muted)]">{q.explanation}</p>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
