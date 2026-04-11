import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { apiErrorMessage } from '../../lib/apiErrorMessage'
import { paginatedData } from '../../lib/paginated'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { cn } from '../../lib/utils'
import { CommunicationStaffNav } from './CommunicationStaffNav'

type PoolCounts = { ESSAY: number; LISTENING: number; SPEAKING: number }

type CommTestRow = {
  id: string
  title: string
  description: string | null
  published: boolean
  poolCounts: PoolCounts
}

type TeamRow = { id: string; name: string }

type UserRow = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

function poolReady(p: PoolCounts) {
  return p.ESSAY > 0 && p.LISTENING > 0 && p.SPEAKING > 0
}

export function CommunicationAssignPage() {
  const qc = useQueryClient()
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [userPick, setUserPick] = useState<Set<string>>(() => new Set())
  const [teamPick, setTeamPick] = useState<Set<string>>(() => new Set())
  const [userSearch, setUserSearch] = useState('')

  const { data: tests, isLoading: testsLoading } = useQuery({
    queryKey: ['communication', 'tests', 'staff'],
    queryFn: async () => {
      const { data } = await api.get<CommTestRow[]>('communication/tests')
      return data
    },
  })

  const assignableTests = useMemo(
    () => (tests ?? []).filter((t) => t.published && poolReady(t.poolCounts)),
    [tests],
  )

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['communication', 'assign', 'teams'],
    queryFn: async () => {
      const { data } = await api.get<{ data?: TeamRow[] }>('teams', {
        params: { page: 1, limit: 200 },
      })
      return paginatedData(data)
    },
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['communication', 'assign', 'users', userSearch],
    queryFn: async () => {
      const { data } = await api.get<{ data?: UserRow[] }>('users', {
        params: { page: 1, limit: 150, role: 'STUDENT', search: userSearch || undefined },
      })
      return paginatedData(data)
    },
  })

  const assignMut = useMutation({
    mutationFn: async () => {
      if (!selectedTestId) throw new Error('no test')
      await api.post('communication/assignments', {
        testId: selectedTestId,
        userIds: [...userPick],
        teamIds: [...teamPick],
      })
    },
    onSuccess: () => {
      toast.success('Assignment created')
      setUserPick(new Set())
      setTeamPick(new Set())
      void qc.invalidateQueries({ queryKey: ['communication'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not assign')),
  })

  const canSubmit =
    !!selectedTestId &&
    (userPick.size > 0 || teamPick.size > 0) &&
    !assignMut.isPending

  const toggleUser = (id: string) => {
    setUserPick((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const toggleTeam = (id: string) => {
    setTeamPick((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl space-y-8"
    >
      <CommunicationStaffNav />
      <div>
        <h1>Assign test</h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
          Choose a published test that is ready (all three sections), then select
          students and/or teams.
        </p>
      </div>

      <div className="lms-card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Select test
        </h2>
        {testsLoading && <Skeleton className="h-24 w-full rounded-xl" />}
        {!testsLoading && assignableTests.length === 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No published tests are ready yet. Publish one from Test management after
            importing essay, listening, and speaking questions.
          </p>
        )}
        {!testsLoading && assignableTests.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {assignableTests.map((t) => {
              const sel = selectedTestId === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTestId(t.id)}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-colors',
                    sel
                      ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40',
                  )}
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{t.title}</p>
                  {t.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{t.description}</p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lms-card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Students</h2>
            <span className="text-xs text-slate-500">{userPick.size} selected</span>
          </div>
          <div>
            <Label htmlFor="usr-search" className="sr-only">
              Search students
            </Label>
            <input
              id="usr-search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="lms-input w-full rounded-lg px-3 py-2 text-sm"
              placeholder="Search by name or email…"
            />
          </div>
          {usersLoading && <Skeleton className="h-40 w-full rounded-xl" />}
          {!usersLoading && (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {(users ?? []).map((u) => {
                const sel = userPick.has(u.id)
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      className={cn(
                        'w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                        sel
                          ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50',
                      )}
                    >
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {u.firstName} {u.lastName}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{u.email}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="lms-card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Teams</h2>
            <span className="text-xs text-slate-500">{teamPick.size} selected</span>
          </div>
          {teamsLoading && <Skeleton className="h-40 w-full rounded-xl" />}
          {!teamsLoading && (
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {(teams ?? []).map((tm) => {
                const sel = teamPick.has(tm.id)
                return (
                  <li key={tm.id}>
                    <button
                      type="button"
                      onClick={() => toggleTeam(tm.id)}
                      className={cn(
                        'w-full rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors',
                        sel
                          ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50',
                      )}
                    >
                      {tm.name}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="lms-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {selectedTestId
            ? 'Students see assigned tests on their dashboard and Communication page.'
            : 'Pick a test first.'}
        </p>
        <Button type="button" size="lg" disabled={!canSubmit} onClick={() => assignMut.mutate()}>
          {assignMut.isPending ? 'Assigning…' : 'Assign test'}
        </Button>
      </div>
    </motion.div>
  )
}
