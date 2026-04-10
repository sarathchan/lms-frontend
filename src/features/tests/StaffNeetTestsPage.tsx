import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Skeleton } from '../../components/ui/Skeleton'
import { ExternalLink } from 'lucide-react'

const panel =
  'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm'

type NeetTestRow = {
  id: string
  title: string
  durationMins: number
  type: string
  published: boolean
  questionCount: number
  attemptCount?: number
}

export function StaffNeetTestsPage() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [durationMins, setDurationMins] = useState(180)
  const [published, setPublished] = useState(false)

  const { data } = useQuery({
    queryKey: ['neet', 'tests', 'staff'],
    queryFn: async () => {
      const { data: res } = await api.get<NeetTestRow[]>('neet/tests', {
        params: { includeUnpublished: 'true' },
      })
      return res
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      await api.post('neet/tests', { title, durationMins, published })
    },
    onSuccess: () => {
      toast.success('Test created')
      setTitle('')
      void qc.invalidateQueries({ queryKey: ['neet'] })
    },
    onError: () => toast.error('Could not create test'),
  })

  const rows = useMemo(() => data ?? [], [data])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)]">Tests</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          NEET mock tests — create and publish for students.
        </p>
      </div>

      <div className={panel}>
        <h2 className="font-medium text-[var(--text)]">Create test</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Label>Title</Label>
            <input
              className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="NEET Full Mock #1"
            />
          </div>
          <div>
            <Label>Duration (minutes)</Label>
            <input
              type="number"
              className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={durationMins}
              onChange={(e) => setDurationMins(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              Published
            </label>
          </div>
        </div>
        <Button
          className="mt-4 rounded-xl"
          disabled={!title.trim() || create.isPending}
          onClick={() => create.mutate()}
        >
          Create
        </Button>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Add questions from the Question Bank (link questions to this test in the API or
          future test builder).
        </p>
      </div>

      <div className={panel + ' overflow-x-auto p-0'}>
        {!data ? (
          <div className="p-6">
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_6%,var(--card))]">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Student</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-[var(--border)]/80 hover:bg-[color-mix(in_srgb,var(--muted)_5%,transparent)]"
                >
                  <td className="px-4 py-3 font-medium text-[var(--text)]">{t.title}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{t.durationMins} min</td>
                  <td className="px-4 py-3">{t.questionCount ?? '—'}</td>
                  <td className="px-4 py-3">
                    {t.published ? (
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                        Live
                      </span>
                    ) : (
                      <span className="rounded-md border border-[var(--border)] px-2 py-0.5 text-xs">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" className="rounded-lg" asChild>
                      <Link to={`/neet`}>
                        Hub <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
