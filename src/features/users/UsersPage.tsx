import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
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
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

const ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'INSTRUCTOR',
  'STUDENT',
] as const

type RoleValue = (typeof ROLES)[number]

function rolesAssignableBy(actorRole: string | undefined): RoleValue[] {
  if (actorRole === 'SUPER_ADMIN') return [...ROLES]
  if (actorRole === 'ADMIN')
    return ROLES.filter((r) => r !== 'SUPER_ADMIN') as RoleValue[]
  if (actorRole === 'INSTRUCTOR') return ['STUDENT']
  return []
}

const createUserSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, 'At least 8 characters'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: z.enum(ROLES),
    organizationId: z.string().optional(),
    teamIds: z.array(z.string().uuid()).optional(),
    studentExamFocus: z.enum(['NEET', 'JEE', 'BOTH']).optional(),
  })
  .superRefine((data, ctx) => {
    const needsFocus = data.role === 'STUDENT'
    if (needsFocus && !data.studentExamFocus) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select an exam focus',
        path: ['studentExamFocus'],
      })
    }
  })

const editUserSchema = z.object({
  email: z.string().email().optional(),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, 'Min 8 characters if set'),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  organizationId: z.string().optional(),
  teamIds: z.array(z.string().uuid()).optional(),
  studentExamFocus: z.enum(['NEET', 'JEE', 'BOTH']).optional(),
})

type CreateUserValues = z.infer<typeof createUserSchema>
type EditUserValues = z.infer<typeof editUserSchema>

type UserRow = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  active: boolean
  organizationId: string | null
}

type TeamOption = {
  id: string
  name: string
  organizationId: string
}

export function UsersPage() {
  const qc = useQueryClient()
  const authUser = useAuthStore((s) => s.user)
  const isSuperAdmin = authUser?.role === 'SUPER_ADMIN'
  const isOrgAdmin = authUser?.role === 'ADMIN'
  const isInstructor = authUser?.role === 'INSTRUCTOR'
  const canSeeOrgs = isSuperAdmin || isOrgAdmin
  const assignableRoles = useMemo(
    () => rolesAssignableBy(authUser?.role),
    [authUser?.role],
  )

  const canEditOrDeleteUser = (u: UserRow) => {
    if (isSuperAdmin) return true
    if (isOrgAdmin) return u.role !== 'SUPER_ADMIN'
    if (isInstructor) return u.role === 'STUDENT'
    return false
  }

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await api.get<{ id: string; name: string }[]>(
        'organizations',
      )
      return data
    },
    enabled: canSeeOrgs,
  })

  const orgNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of orgs ?? []) m.set(o.id, o.name)
    return m
  }, [orgs])

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 400)
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<string>('')

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, debouncedSearch, roleFilter, activeFilter],
    queryFn: async () => {
      const { data } = await api.get('users', {
        params: {
          page,
          limit: 15,
          search: debouncedSearch || undefined,
          role: roleFilter || undefined,
          active:
            activeFilter === 'true'
              ? true
              : activeFilter === 'false'
                ? false
                : undefined,
        },
      })
      return data
    },
  })

  const createForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'STUDENT',
      organizationId: '',
      teamIds: [],
      studentExamFocus: 'NEET',
    },
  })

  const editForm = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
  })

  const canManageUsers = isSuperAdmin || isOrgAdmin || isInstructor

  const { data: teamsPayload } = useQuery({
    queryKey: ['teams', 'picklist'],
    queryFn: async () => {
      const { data } = await api.get<{ data: TeamOption[] }>('teams', {
        params: { page: 1, limit: 100 },
      })
      return data
    },
    enabled: canManageUsers && (createOpen || !!editUser),
    staleTime: 60_000,
  })
  const teamsList = useMemo(
    () => paginatedData<TeamOption>(teamsPayload),
    [teamsPayload],
  )

  const watchedOrgCreate = createForm.watch('organizationId')
  const effectiveOrgForCreate = isSuperAdmin
    ? (watchedOrgCreate?.trim() ?? '')
    : (authUser?.organizationId ?? '')

  const teamsForCreate = useMemo(() => {
    if (!effectiveOrgForCreate) return []
    return teamsList.filter((t) => t.organizationId === effectiveOrgForCreate)
  }, [teamsList, effectiveOrgForCreate])

  const teamsForEdit = useMemo(() => {
    if (!editUser?.organizationId) return []
    return teamsList.filter((t) => t.organizationId === editUser.organizationId)
  }, [teamsList, editUser])

  const { data: editUserDetail } = useQuery({
    queryKey: ['users', editUser?.id, 'detail'],
    queryFn: async () => {
      const { data } = await api.get<{
        id: string
        teamIds: string[]
        studentExamFocus?: 'NEET' | 'JEE' | 'BOTH'
      }>(`users/${editUser!.id}`)
      return data
    },
    enabled: !!editUser,
  })

  useEffect(() => {
    if (!editUser || !editUserDetail || editUserDetail.id !== editUser.id)
      return
    editForm.setValue('teamIds', editUserDetail.teamIds ?? [])
    if (editUserDetail.studentExamFocus) {
      editForm.setValue('studentExamFocus', editUserDetail.studentExamFocus)
    }
  }, [editUser, editUserDetail, editForm])

  useEffect(() => {
    if (createOpen && isInstructor) {
      createForm.setValue('role', 'STUDENT', { shouldValidate: true })
    }
  }, [createOpen, isInstructor, createForm])

  const createMut = useMutation({
    mutationFn: (v: CreateUserValues) => {
      const role = isInstructor ? 'STUDENT' : v.role
      const body: Record<string, unknown> = {
        email: v.email,
        password: v.password,
        firstName: v.firstName,
        lastName: v.lastName,
        role,
        teamIds: v.teamIds ?? [],
      }
      if (role === 'STUDENT' && v.studentExamFocus) {
        body.studentExamFocus = v.studentExamFocus
      }
      if (isSuperAdmin && v.organizationId?.trim()) {
        body.organizationId = v.organizationId.trim()
      }
      return api.post('users', body)
    },
    onSuccess: () => {
      toast.success('User created')
      setCreateOpen(false)
      createForm.reset({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'STUDENT',
        organizationId: '',
        teamIds: [],
        studentExamFocus: 'NEET',
      })
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: EditUserValues }) => {
      const payload: Record<string, unknown> = { ...body }
      if (!payload.password) delete payload.password
      if (isInstructor) delete payload.role
      if (payload.studentExamFocus === undefined)
        delete payload.studentExamFocus
      if (isSuperAdmin) {
        const oid = body.organizationId?.trim()
        payload.organizationId = oid === '' || oid === undefined ? null : oid
      } else {
        delete payload.organizationId
      }
      payload.teamIds = body.teamIds ?? []
      return api.patch(`users/${id}`, payload)
    },
    onSuccess: (_d, vars) => {
      toast.success('User updated')
      setEditUser(null)
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: ['users', vars.id, 'detail'] })
      void qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`users/${id}`),
    onSuccess: () => {
      toast.success('User removed')
      setDeleteUser(null)
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const openEdit = (u: UserRow) => {
    setEditUser(u)
    editForm.reset({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role as EditUserValues['role'],
      active: u.active,
      password: '',
      organizationId: u.organizationId ?? '',
      teamIds: [],
      studentExamFocus: 'NEET',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1>Users</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Create, update, and deactivate accounts
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="min-w-[10rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          {canManageUsers && (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add user
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  {canSeeOrgs && (
                    <th className="px-4 py-3 font-medium">Organization</th>
                  )}
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData<UserRow>(data).map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-4 py-3 text-slate-900 dark:text-white">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {u.email}
                    </td>
                    {canSeeOrgs && (
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {u.organizationId
                          ? (orgNameById.get(u.organizationId) ?? u.organizationId)
                          : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.active ? (
                        <span className="text-emerald-600">Active</span>
                      ) : (
                        <span className="text-slate-400">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {canEditOrDeleteUser(u) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Edit"
                            onClick={() => openEdit(u)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canEditOrDeleteUser(u) && u.id !== authUser?.id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            onClick={() => setDeleteUser(u)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <span className="flex items-center px-2 text-sm text-slate-500">
                {page} / {data.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New user</DialogTitle>
            <DialogDescription>
              They can sign in immediately with this password.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={createForm.handleSubmit((v) => createMut.mutate(v))}
          >
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">Email</span>
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                {...createForm.register('email')}
              />
              {createForm.formState.errors.email && (
                <span className="text-xs text-red-600">
                  {createForm.formState.errors.email.message}
                </span>
              )}
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Password
              </span>
              <input
                type="password"
                className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                {...createForm.register('password')}
              />
              {createForm.formState.errors.password && (
                <span className="text-xs text-red-600">
                  {createForm.formState.errors.password.message}
                </span>
              )}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  First name
                </span>
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  {...createForm.register('firstName')}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Last name
                </span>
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  {...createForm.register('lastName')}
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">Role</span>
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 disabled:opacity-70"
                disabled={isInstructor}
                {...createForm.register('role')}
              >
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {isInstructor && (
                <span className="text-xs text-slate-500">
                  Instructors can only add students.
                </span>
              )}
            </label>
            {(createForm.watch('role') === 'STUDENT' || isInstructor) && (
              <label className="grid gap-1 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Exam focus (student)
                </span>
                <select
                  className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  {...createForm.register('studentExamFocus')}
                >
                  <option value="NEET">NEET</option>
                  <option value="JEE">JEE</option>
                  <option value="BOTH">NEET + JEE (both)</option>
                </select>
                {createForm.formState.errors.studentExamFocus && (
                  <span className="text-xs text-red-600">
                    {createForm.formState.errors.studentExamFocus.message}
                  </span>
                )}
              </label>
            )}
            {isSuperAdmin && (
              <label className="grid gap-1 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Organization
                </span>
                <select
                  className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  {...createForm.register('organizationId')}
                >
                  <option value="">Default (no org selected)</option>
                  {(orgs ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">
                  Org admins always create users in their own organization.
                </span>
              </label>
            )}
            {teamsForCreate.length > 0 ? (
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Teams (optional)
                </legend>
                <p className="text-xs text-[var(--muted)]">
                  Add the user to teams in this organization.
                </p>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_6%,var(--card))] p-2">
                  {teamsForCreate.map((t) => {
                    const sel = createForm.watch('teamIds') ?? []
                    const checked = sel.includes(t.id)
                    return (
                      <label
                        key={t.id}
                        className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text)]"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)]"
                          checked={checked}
                          onChange={(e) => {
                            const cur = createForm.getValues('teamIds') ?? []
                            if (e.target.checked)
                              createForm.setValue('teamIds', [...cur, t.id], {
                                shouldDirty: true,
                              })
                            else
                              createForm.setValue(
                                'teamIds',
                                cur.filter((id) => id !== t.id),
                                { shouldDirty: true },
                              )
                          }}
                        />
                        <span>{t.name}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ) : effectiveOrgForCreate ? (
              <p className="text-xs text-[var(--muted)]">
                No teams in this organization yet. Create teams from the Teams
                page.
              </p>
            ) : isSuperAdmin ? (
              <p className="text-xs text-[var(--muted)]">
                Select an organization to assign teams.
              </p>
            ) : null}
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
        open={!!editUser}
        onOpenChange={(o) => !o && setEditUser(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update profile and access.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={editForm.handleSubmit((v) =>
              editUser
                ? updateMut.mutate({ id: editUser.id, body: v })
                : undefined,
            )}
          >
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">Email</span>
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                {...editForm.register('email')}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                New password (optional)
              </span>
              <input
                type="password"
                className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                {...editForm.register('password')}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  First name
                </span>
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  {...editForm.register('firstName')}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Last name
                </span>
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  {...editForm.register('lastName')}
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">Role</span>
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 disabled:opacity-70"
                disabled={isInstructor}
                {...editForm.register('role')}
              >
                {(isSuperAdmin
                  ? [...ROLES]
                  : assignableRoles
                ).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {isInstructor && (
                <span className="text-xs text-slate-500">
                  Student role only for instructor-managed accounts.
                </span>
              )}
            </label>
            {editUser?.role === 'STUDENT' && (
              <label className="grid gap-1 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Exam focus
                </span>
                <select
                  className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  {...editForm.register('studentExamFocus')}
                >
                  <option value="NEET">NEET</option>
                  <option value="JEE">JEE</option>
                  <option value="BOTH">NEET + JEE (both)</option>
                </select>
                <span className="text-xs text-slate-500">
                  Updates which entrance exams appear on the student dashboard.
                </span>
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editForm.watch('active')}
                onChange={(e) =>
                  editForm.setValue('active', e.target.checked, {
                    shouldDirty: true,
                  })
                }
              />
              <span>Active</span>
            </label>
            {isSuperAdmin && (
              <label className="grid gap-1 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Organization
                </span>
                <select
                  className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  {...editForm.register('organizationId')}
                >
                  <option value="">No organization</option>
                  {(orgs ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {editUser?.organizationId && teamsForEdit.length > 0 ? (
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Teams
                </legend>
                <p className="text-xs text-[var(--muted)]">
                  Membership is limited to teams in the user&apos;s organization.
                </p>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_6%,var(--card))] p-2">
                  {teamsForEdit.map((t) => {
                    const sel = editForm.watch('teamIds') ?? []
                    const checked = sel.includes(t.id)
                    return (
                      <label
                        key={t.id}
                        className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text)]"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)]"
                          checked={checked}
                          onChange={(e) => {
                            const cur = editForm.getValues('teamIds') ?? []
                            if (e.target.checked)
                              editForm.setValue('teamIds', [...cur, t.id], {
                                shouldDirty: true,
                              })
                            else
                              editForm.setValue(
                                'teamIds',
                                cur.filter((id) => id !== t.id),
                                { shouldDirty: true },
                              )
                          }}
                        />
                        <span>{t.name}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ) : editUser?.organizationId ? (
              <p className="text-xs text-[var(--muted)]">
                No teams in this organization yet.
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)]">
                Assign an organization to this user before adding them to teams.
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditUser(null)}
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
        open={!!deleteUser}
        onOpenChange={(o) => !o && setDeleteUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Remove {deleteUser?.firstName} {deleteUser?.lastName} (
              {deleteUser?.email})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-red-600 hover:bg-red-500"
              disabled={deleteMut.isPending}
              onClick={() => deleteUser && deleteMut.mutate(deleteUser.id)}
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
