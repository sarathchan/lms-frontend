import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { paginatedData } from '../../lib/paginated'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { useAuthStore } from '../../stores/authStore'

const createTeamSchema = z.object({
  name: z.string().min(2, 'At least 2 characters'),
  organizationId: z.string().optional(),
})

const editTeamSchema = z.object({
  name: z.string().min(2, 'At least 2 characters'),
})

type CreateTeamValues = z.infer<typeof createTeamSchema>
type EditTeamValues = z.infer<typeof editTeamSchema>

type TeamRow = {
  id: string
  name: string
  organizationId: string
  _count?: { members: number; courses: number }
}

type TeamDetail = {
  id: string
  name: string
  organizationId: string
  members: {
    id: string
    userId: string
    user: {
      id: string
      email: string
      firstName: string
      lastName: string
      role: string
    }
  }[]
}

type UserPickRow = {
  id: string
  email: string
  firstName: string
  lastName: string
  organizationId: string | null
  active: boolean
}

function errMessage(e: unknown) {
  if (e && typeof e === 'object' && 'response' in e) {
    const r = (e as { response?: { data?: { message?: string } } }).response
    const m = r?.data?.message
    if (typeof m === 'string') return m
  }
  return 'Something went wrong'
}

export function TeamsPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
  const isSuper = user?.role === 'SUPER_ADMIN'

  const [createOpen, setCreateOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<TeamRow | null>(null)
  const [deleteTeam, setDeleteTeam] = useState<TeamRow | null>(null)
  const [manageTeam, setManageTeam] = useState<TeamRow | null>(null)
  const [addUserId, setAddUserId] = useState('')

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await api.get<{ id: string; name: string }[]>(
        'organizations',
      )
      return data
    },
    enabled: isSuper && canManage,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await api.get('teams', { params: { page: 1, limit: 50 } })
      return data
    },
    staleTime: 45_000,
  })

  const createForm = useForm<CreateTeamValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: '', organizationId: '' },
  })

  const editForm = useForm<EditTeamValues>({
    resolver: zodResolver(editTeamSchema),
  })

  useEffect(() => {
    if (!createOpen || !isSuper || !orgs?.length) return
    const cur = createForm.getValues('organizationId')
    if (!cur) createForm.setValue('organizationId', orgs[0].id)
  }, [createOpen, isSuper, orgs, createForm])

  const createMut = useMutation({
    mutationFn: (v: CreateTeamValues) => {
      if (isSuper) {
        if (!v.organizationId) throw new Error('Select an organization')
        return api.post('teams', {
          name: v.name,
          organizationId: v.organizationId,
        })
      }
      return api.post('teams', { name: v.name })
    },
    onSuccess: () => {
      toast.success('Team created')
      setCreateOpen(false)
      createForm.reset({ name: '', organizationId: orgs?.[0]?.id ?? '' })
      void qc.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (e) => toast.error(errMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`teams/${id}`, { name }),
    onSuccess: () => {
      toast.success('Team updated')
      setEditTeam(null)
      void qc.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (e) => toast.error(errMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`teams/${id}`),
    onSuccess: () => {
      toast.success('Team deleted')
      setDeleteTeam(null)
      void qc.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (e) => toast.error(errMessage(e)),
  })

  const openCreate = () => {
    createForm.reset({
      name: '',
      organizationId: orgs?.[0]?.id ?? '',
    })
    setCreateOpen(true)
  }

  const openEdit = (t: TeamRow) => {
    setEditTeam(t)
    editForm.reset({ name: t.name })
  }

  const teams = paginatedData<TeamRow>(data)

  const { data: teamDetail, isLoading: teamDetailLoading } = useQuery({
    queryKey: ['teams', manageTeam?.id, 'detail'],
    queryFn: async () => {
      const { data } = await api.get<TeamDetail>(`teams/${manageTeam!.id}`)
      return data
    },
    enabled: !!manageTeam,
    staleTime: 20_000,
  })

  const { data: usersPickPayload } = useQuery({
    queryKey: ['users', 'picklist', manageTeam?.organizationId],
    queryFn: async () => {
      const { data } = await api.get<{ data: UserPickRow[] }>('users', {
        params: { page: 1, limit: 100, active: true },
      })
      return data
    },
    enabled: !!manageTeam && canManage,
    staleTime: 60_000,
  })
  const usersPick = paginatedData<UserPickRow>(usersPickPayload)

  const addableUsers = useMemo(() => {
    if (!manageTeam || !teamDetail) return []
    const memberIds = new Set(teamDetail.members.map((m) => m.userId))
    return usersPick.filter(
      (u) =>
        u.organizationId === manageTeam.organizationId &&
        u.active &&
        !memberIds.has(u.id),
    )
  }, [manageTeam, teamDetail, usersPick])

  const addMemberMut = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      api.post(`teams/${teamId}/members`, { userId }),
    onSuccess: (_d, vars) => {
      toast.success('Member added')
      setAddUserId('')
      void qc.invalidateQueries({ queryKey: ['teams'] })
      void qc.invalidateQueries({
        queryKey: ['teams', vars.teamId, 'detail'],
      })
    },
    onError: (e) => toast.error(errMessage(e)),
  })

  const removeMemberMut = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      api.delete(`teams/${teamId}/members/${userId}`),
    onSuccess: (_d, vars) => {
      toast.success('Member removed')
      void qc.invalidateQueries({ queryKey: ['teams'] })
      void qc.invalidateQueries({
        queryKey: ['teams', vars.teamId, 'detail'],
      })
    },
    onError: (e) => toast.error(errMessage(e)),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1>Teams</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Groups and cohorts
            {!canManage && (
              <span className="block text-xs">
                Admins can create and edit teams from here.
              </span>
            )}
          </p>
        </div>
        {canManage && (
          <Button type="button" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Add team
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const orgName = orgs?.find((o) => o.id === t.organizationId)?.name
            return (
              <div key={t.id} className="lms-card flex flex-col gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {t.name}
                  </h3>
                  {isSuper && orgName && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {orgName}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {t._count?.members ?? 0} members ·{' '}
                    {t._count?.courses ?? 0} courses
                  </p>
                </div>
                {canManage && (
                  <div className="flex justify-end gap-1 border-t border-[var(--border)] pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Manage members"
                      onClick={() => {
                        setAddUserId('')
                        setManageTeam(t)
                      }}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Edit team"
                      onClick={() => openEdit(t)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Delete team"
                      onClick={() => setDeleteTeam(t)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && teams.length === 0 && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          No teams yet.
          {canManage && ' Create one to group learners.'}
        </p>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New team</DialogTitle>
            <DialogDescription>
              Teams group learners for enrollments and reporting.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={createForm.handleSubmit((v) => createMut.mutate(v))}
          >
            {isSuper && (
              <label className="grid gap-1 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Organization
                </span>
                <select
                  className="lms-input"
                  {...createForm.register('organizationId')}
                >
                  {(orgs ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">Name</span>
              <input
                className="lms-input"
                placeholder="e.g. Sales Q1"
                {...createForm.register('name')}
              />
              {createForm.formState.errors.name && (
                <span className="text-xs text-red-600">
                  {createForm.formState.errors.name.message}
                </span>
              )}
            </label>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? 'Saving…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editTeam}
        onOpenChange={(o) => !o && setEditTeam(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit team</DialogTitle>
            <DialogDescription>Rename this team.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={editForm.handleSubmit((v) =>
              editTeam
                ? updateMut.mutate({ id: editTeam.id, name: v.name })
                : undefined,
            )}
          >
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">Name</span>
              <input className="lms-input" {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <span className="text-xs text-red-600">
                  {editForm.formState.errors.name.message}
                </span>
              )}
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTeam(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!manageTeam}
        onOpenChange={(o) => {
          if (!o) {
            setManageTeam(null)
            setAddUserId('')
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Team members</DialogTitle>
            <DialogDescription>
              {manageTeam ? (
                <>
                  Add or remove people in <strong>{manageTeam.name}</strong>.
                  Only users in the same organization can join.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {teamDetailLoading || !teamDetail ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--text)]">
                  Current members ({teamDetail.members.length})
                </p>
                {teamDetail.members.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No members yet.</p>
                ) : (
                  <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
                    {teamDetail.members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-[color-mix(in_srgb,var(--muted)_6%,var(--card))] px-2 py-1.5 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="font-medium text-[var(--text)]">
                            {m.user.firstName} {m.user.lastName}
                          </span>
                          <span className="block truncate text-xs text-[var(--muted)]">
                            {m.user.email}
                          </span>
                        </span>
                        {canManage && manageTeam && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-red-600"
                            disabled={removeMemberMut.isPending}
                            onClick={() =>
                              removeMemberMut.mutate({
                                teamId: manageTeam.id,
                                userId: m.userId,
                              })
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {canManage && manageTeam && (
                <div className="space-y-2 border-t border-[var(--border)] pt-4">
                  <p className="text-sm font-medium text-[var(--text)]">
                    Add member
                  </p>
                  {addableUsers.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">
                      No eligible users to add (everyone in this org may already
                      be on the team).
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <label className="grid flex-1 gap-1 text-sm">
                        <span className="text-[var(--muted)]">User</span>
                        <select
                          className="lms-input"
                          value={addUserId}
                          onChange={(e) => setAddUserId(e.target.value)}
                        >
                          <option value="">Select user…</option>
                          {addableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.firstName} {u.lastName} ({u.email})
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type="button"
                        className="rounded-xl sm:mb-0.5"
                        disabled={!addUserId || addMemberMut.isPending}
                        onClick={() => {
                          if (!addUserId || !manageTeam) return
                          addMemberMut.mutate({
                            teamId: manageTeam.id,
                            userId: addUserId,
                          })
                        }}
                      >
                        <UserPlus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageTeam(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTeam}
        onOpenChange={(o) => !o && setDeleteTeam(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete team</DialogTitle>
            <DialogDescription>
              Remove “{deleteTeam?.name}”? Member and course links will be
              removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTeam(null)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-red-600 hover:bg-red-500"
              disabled={deleteMut.isPending}
              onClick={() => deleteTeam && deleteMut.mutate(deleteTeam.id)}
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
