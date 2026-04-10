import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'

type PyqRow = {
  id: string
  prompt: string
  options: unknown
  subject: string
  chapter: string
  pyqYear: number | null
  difficulty: number
}

const SUBJECTS = ['', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY'] as const

export function NeetPyqPage() {
  const [year, setYear] = useState('')
  const [chapter, setChapter] = useState('')
  const [subject, setSubject] = useState('')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['neet', 'pyq', year, chapter, subject],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (year) params.set('year', year)
      if (chapter) params.set('chapter', chapter)
      if (subject) params.set('subject', subject)
      const q = params.toString()
      const { data } = await api.get<PyqRow[]>(`neet/pyq${q ? `?${q}` : ''}`)
      return data
    },
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link
          to="/neet"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          ← NEET hub
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text)]">
          Previous year questions
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Filter by year, chapter, or subject. Use these for targeted revision.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
          Year
          <input
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            placeholder="e.g. 2022"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </label>
        <label className="flex min-w-[140px] flex-col gap-1 text-xs font-medium text-[var(--muted)]">
          Chapter contains
          <input
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            placeholder="Organic"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
          Subject
          <select
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            {SUBJECTS.map((s) => (
              <option key={s || 'all'} value={s}>
                {s || 'Any'}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            Apply
          </Button>
        </div>
      </div>

      {isLoading && (
        <Skeleton className="h-40 w-full" />
      )}

      {!isLoading && data && (
        <ul className="space-y-4">
          {data.length === 0 && (
            <li className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
              No PYQs match these filters.
            </li>
          )}
          {data.map((row) => {
            const opts = row.options as string[]
            return (
              <li
                key={row.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  {row.pyqYear && <span>NEET {row.pyqYear}</span>}
                  <span>{row.subject}</span>
                  <span>{row.chapter}</span>
                </div>
                <p className="mt-2 text-[var(--text)]">{row.prompt}</p>
                <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-[var(--muted)]">
                  {opts.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ol>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
