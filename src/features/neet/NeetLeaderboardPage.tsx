import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { cn } from '../../lib/utils'

type Row = {
  userId: string
  name: string
  totalScore: number
  attempts: number
}

type Lb = {
  scope: string
  rows: Row[]
  myRank: number | null
  myPercentile: number | null
}

export function NeetLeaderboardPage() {
  const [scope, setScope] = useState<'week' | 'all'>('week')
  const { data, isLoading } = useQuery({
    queryKey: ['neet', 'leaderboard', scope],
    queryFn: async () => {
      const { data } = await api.get<Lb>(`neet/leaderboard?scope=${scope}`)
      return data
    },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link
          to="/neet"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          ← NEET hub
        </Link>
        <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold text-[var(--text)]">
          <Trophy className="h-7 w-7 text-[var(--primary)]" />
          Leaderboard
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Ranked by total score from submitted mocks (ties favor faster times per test).
        </p>
      </div>

      <div className="flex gap-2">
        {(['week', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={cn(
              'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
              scope === s
                ? 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]'
                : 'border-[var(--border)] text-[var(--muted)]',
            )}
          >
            {s === 'week' ? 'This week' : 'All time'}
          </button>
        ))}
      </div>

      {data && (data.myRank != null || data.myPercentile != null) && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
          <span className="text-[var(--muted)]">You: </span>
          {data.myRank != null && (
            <span className="font-semibold text-[var(--text)]">
              rank {data.myRank}
            </span>
          )}
          {data.myPercentile != null && (
            <span className="ml-2 text-[var(--muted)]">
              · percentile {Math.round(data.myPercentile)}%
            </span>
          )}
        </div>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && data && (
        <ol className="space-y-2">
          {data.rows.length === 0 && (
            <li className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-[var(--muted)]">
              No attempts in this window yet.
            </li>
          )}
          {data.rows.map((r, i) => (
            <li
              key={r.userId}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 text-center font-mono text-[var(--muted)]">
                  {i + 1}
                </span>
                <span className="font-medium text-[var(--text)]">{r.name}</span>
              </div>
              <div className="text-right text-sm">
                <span className="font-semibold tabular-nums text-[var(--text)]">
                  {r.totalScore}
                </span>
                <span className="ml-2 text-[var(--muted)]">
                  pts · {r.attempts} test{r.attempts === 1 ? '' : 's'}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
