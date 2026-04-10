import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { paginatedData } from '../../lib/paginated'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { cn } from '../../lib/utils'

type TeamRow = {
  id: string
  name: string
  _count?: { members: number }
}

type UserRow = {
  id: string
  email: string
  firstName: string
  lastName: string
}

const tableWrap =
  'overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700'
const th =
  'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'
const td = 'px-3 py-2 align-middle text-slate-900 dark:text-slate-100'
const rowHover =
  'border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'

export function AssignCourseModal({
  courseId,
  open,
  onOpenChange,
}: {
  courseId: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const qc = useQueryClient()
  const [usersPick, setUsersPick] = useState<Set<string>>(new Set())
  const [teamsPick, setTeamsPick] = useState<Set<string>>(new Set())
  const [userSearch, setUserSearch] = useState('')
  const [teamSearch, setTeamSearch] = useState('')
  const debouncedUserSearch = useDebouncedValue(userSearch, 350)
  const debouncedTeamSearch = useDebouncedValue(teamSearch, 200)

  useEffect(() => {
    if (!open) {
      setUserSearch('')
      setTeamSearch('')
      setUsersPick(new Set())
      setTeamsPick(new Set())
    }
  }, [open])

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'assign-modal', debouncedUserSearch],
    queryFn: async () => {
      const { data } = await api.get('users', {
        params: {
          page: 1,
          limit: 100,
          search: debouncedUserSearch.trim() || undefined,
          role: 'STUDENT',
        },
      })
      return data
    },
    enabled: open,
  })

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', 'assign-modal'],
    queryFn: async () => {
      const { data } = await api.get('teams', { params: { page: 1, limit: 500 } })
      return data
    },
    enabled: open,
  })

  const assignMut = useMutation({
    mutationFn: () =>
      api.post(`enrollments/courses/${courseId}`, {
        userIds: [...usersPick],
        teamIds: [...teamsPick],
        notify: true,
      }),
    onSuccess: (res) => {
      const n = (res.data as { assigned?: number })?.assigned ?? 0
      toast.success(`Assigned to ${n} learner(s)`)
      setUsersPick(new Set())
      setTeamsPick(new Set())
      onOpenChange(false)
      void qc.invalidateQueries({ queryKey: ['enrollments', courseId] })
      void qc.invalidateQueries({ queryKey: ['courses'] })
    },
  })

  const users = paginatedData(usersData) as UserRow[]
  const teams = paginatedData(teamsData) as TeamRow[]

  const filteredTeams = useMemo(() => {
    const q = debouncedTeamSearch.trim().toLowerCase()
    if (!q) return teams
    return teams.filter((t) => t.name.toLowerCase().includes(q))
  }, [teams, debouncedTeamSearch])

  const canSubmit = useMemo(
    () => usersPick.size > 0 || teamsPick.size > 0,
    [usersPick, teamsPick],
  )

  const summary = useMemo(() => {
    const parts: string[] = []
    if (usersPick.size) parts.push(`${usersPick.size} learner${usersPick.size === 1 ? '' : 's'}`)
    if (teamsPick.size) parts.push(`${teamsPick.size} team${teamsPick.size === 1 ? '' : 's'}`)
    return parts.length ? parts.join(' · ') : 'None selected'
  }, [usersPick, teamsPick])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <DialogTitle>Assign course</DialogTitle>
          <DialogDescription>
            Select individual learners and/or teams. Team members are enrolled
            together.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-4">
          <section className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Learners
              </h3>
              <input
                type="search"
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 sm:max-w-xs"
                aria-label="Search learners"
              />
            </div>
            <div className={cn(tableWrap, 'max-h-[220px] overflow-auto')}>
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <tr>
                    <th className={cn(th, 'w-12')} scope="col">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className={th} scope="col">
                      Name
                    </th>
                    <th className={th} scope="col">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={3} className={cn(td, 'py-8 text-center text-slate-500')}>
                        Loading learners…
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={cn(td, 'py-8 text-center text-slate-500')}>
                        No students match your search.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className={rowHover}>
                        <td className={td}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                            checked={usersPick.has(u.id)}
                            onChange={(e) => {
                              setUsersPick((prev) => {
                                const n = new Set(prev)
                                if (e.target.checked) n.add(u.id)
                                else n.delete(u.id)
                                return n
                              })
                            }}
                            aria-label={`Select ${u.firstName} ${u.lastName}`}
                          />
                        </td>
                        <td className={cn(td, 'font-medium')}>
                          {u.firstName} {u.lastName}
                        </td>
                        <td className={cn(td, 'text-slate-600 dark:text-slate-400')}>
                          {u.email}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Teams
              </h3>
              <input
                type="search"
                placeholder="Search teams…"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 sm:max-w-xs"
                aria-label="Search teams"
              />
            </div>
            <div className={cn(tableWrap, 'max-h-[220px] overflow-auto')}>
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <tr>
                    <th className={cn(th, 'w-12')} scope="col">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className={th} scope="col">
                      Team
                    </th>
                    <th className={th} scope="col">
                      Members
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamsLoading ? (
                    <tr>
                      <td colSpan={3} className={cn(td, 'py-8 text-center text-slate-500')}>
                        Loading teams…
                      </td>
                    </tr>
                  ) : filteredTeams.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={cn(td, 'py-8 text-center text-slate-500')}>
                        {teams.length === 0
                          ? 'No teams in your organization.'
                          : 'No teams match your search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTeams.map((t) => (
                      <tr key={t.id} className={rowHover}>
                        <td className={td}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                            checked={teamsPick.has(t.id)}
                            onChange={(e) => {
                              setTeamsPick((prev) => {
                                const n = new Set(prev)
                                if (e.target.checked) n.add(t.id)
                                else n.delete(t.id)
                                return n
                              })
                            }}
                            aria-label={`Select team ${t.name}`}
                          />
                        </td>
                        <td className={cn(td, 'font-medium')}>{t.name}</td>
                        <td className={cn(td, 'tabular-nums text-slate-600 dark:text-slate-400')}>
                          {t._count?.members ?? '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">{summary}</p>
          <div className="flex w-full justify-end gap-2 sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canSubmit || assignMut.isPending}
              onClick={() => assignMut.mutate()}
            >
              {assignMut.isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
