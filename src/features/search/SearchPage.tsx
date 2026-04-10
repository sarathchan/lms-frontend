import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

export function SearchPage() {
  const [q, setQ] = useState('')
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: async () => {
      const { data } = await api.get('search', { params: { q } })
      return data
    },
    enabled: false,
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Search
      </h1>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && refetch()}
          placeholder="Search users and courses…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-lg bg-mylms-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Go
        </button>
      </div>
      {data && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 font-semibold text-slate-800 dark:text-slate-200">
              Users
            </h2>
            <ul className="space-y-2">
              {(data.users ?? []).map(
                (u: { id: string; email: string; firstName: string; lastName: string }) => (
                  <li
                    key={u.id}
                    className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                  >
                    {u.firstName} {u.lastName}{' '}
                    <span className="text-slate-500">{u.email}</span>
                  </li>
                ),
              )}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 font-semibold text-slate-800 dark:text-slate-200">
              Courses
            </h2>
            <ul className="space-y-2">
              {(data.courses ?? []).map(
                (c: { id: string; title: string; published: boolean }) => (
                  <li key={c.id}>
                    <Link
                      to={`/courses/${c.id}`}
                      className="block rounded-lg border border-slate-200 px-3 py-2 hover:border-mylms-400 dark:border-slate-800"
                    >
                      {c.title}{' '}
                      <span className="text-xs text-slate-400">
                        {c.published ? 'published' : 'draft'}
                      </span>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
