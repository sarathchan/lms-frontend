import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../hooks/useTheme'

const TAB_KEYS = [
  'profile',
  'account',
  'notifications',
  'preferences',
  'organization',
] as const

const settingsCardClass =
  'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition-colors duration-200 lg:p-6'

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'profile'
  const safeTab = TAB_KEYS.includes(tab as (typeof TAB_KEYS)[number])
    ? tab
    : 'profile'
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const { isDark, setDark } = useTheme()
  const canOrgSettings =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  const canChangeOwnPassword =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  const { data: me } = useQuery({
    queryKey: ['user', 'me', user?.id],
    queryFn: async () => {
      const { data } = await api.get(`users/${user!.id}`)
      return data as {
        email: string
        firstName: string
        lastName: string
        role: string
      }
    },
    enabled: !!user?.id,
  })

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await api.get<
        { id: string; name: string; settings?: unknown }[]
      >('organizations')
      return data
    },
    enabled: canOrgSettings,
  })

  const orgId = user?.organizationId
  const myOrg = orgs?.find((o) => o.id === orgId)

  const [courseDefaults, setCourseDefaults] = useState(
    JSON.stringify(
      (myOrg?.settings as { courseDefaults?: unknown } | undefined)
        ?.courseDefaults ?? { defaultPassScorePct: 60, defaultPublished: false },
      null,
      2,
    ),
  )

  useEffect(() => {
    const cd = (myOrg?.settings as { courseDefaults?: unknown } | undefined)
      ?.courseDefaults
    if (cd !== undefined) setCourseDefaults(JSON.stringify(cd, null, 2))
  }, [myOrg?.id])

  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyPush, setNotifyPush] = useState(true)

  useEffect(() => {
    try {
      const e = localStorage.getItem('mylms-notify-email')
      const p = localStorage.getItem('mylms-notify-push')
      if (e !== null) setNotifyEmail(e === '1')
      if (p !== null) setNotifyPush(p === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const saveNotif = () => {
    try {
      localStorage.setItem('mylms-notify-email', notifyEmail ? '1' : '0')
      localStorage.setItem('mylms-notify-push', notifyPush ? '1' : '0')
      toast.success('Notification preferences saved')
    } catch {
      toast.error('Could not save')
    }
  }

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const changePasswordMut = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('New password and confirmation do not match')
      }
      await api.patch('auth/me/password', { currentPassword, newPassword }, {
        silent: true,
      })
    },
    onSuccess: () => {
      toast.success('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (e: unknown) => {
      if (e && typeof e === 'object' && 'response' in e) {
        const data = (e as { response?: { data?: unknown } }).response?.data
        if (data && typeof data === 'object' && 'message' in data) {
          const m = (data as { message: unknown }).message
          const msg =
            typeof m === 'string' ? m : Array.isArray(m) ? m.join(', ') : null
          if (msg) {
            toast.error(msg)
            return
          }
        }
      }
      toast.error(e instanceof Error ? e.message : 'Could not update password')
    },
  })

  const orgMut = useMutation({
    mutationFn: async () => {
      let parsed: unknown
      try {
        parsed = JSON.parse(courseDefaults)
      } catch {
        throw new Error('Invalid JSON')
      }
      await api.patch(`organizations/${orgId}/settings`, {
        settings: { courseDefaults: parsed },
      })
    },
    onSuccess: () => {
      toast.success('Organization settings saved')
      void qc.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full min-w-0 max-w-3xl space-y-4 lg:space-y-6"
    >
      <div>
        <h1>Settings</h1>
        <p className="text-base leading-7 text-[var(--muted)]">
          Profile, account security, notifications, and preferences.
        </p>
      </div>

      <Tabs
        value={safeTab}
        onValueChange={(v) => {
          setParams({ tab: v })
        }}
        className="w-full"
      >
        <TabsList className="w-full justify-start gap-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          {canOrgSettings && orgId && (
            <TabsTrigger value="organization">Organization</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card className={settingsCardClass}>
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xl font-semibold">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <p className="mt-1 text-base leading-7 text-[var(--muted)]">
                  {me?.firstName} {me?.lastName}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="mt-1 text-base leading-7 text-[var(--muted)]">
                  {me?.email}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Role</Label>
                <p className="mt-1 text-base leading-7 text-[var(--muted)]">
                  {me?.role}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card className={settingsCardClass}>
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xl font-semibold">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
              {canChangeOwnPassword ? (
                <>
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    As an administrator, you can update your sign-in password.
                    Other sessions stay valid until they expire; new sign-ins use
                    the new password.
                  </p>
                  <div className="space-y-1">
                    <Label htmlFor="acct-cur-pw">Current password</Label>
                    <input
                      id="acct-cur-pw"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="lms-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="acct-new-pw">New password</Label>
                    <input
                      id="acct-new-pw"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="lms-input"
                    />
                    <p className="text-xs text-[var(--muted)]">
                      At least 8 characters.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="acct-confirm-pw">Confirm new password</Label>
                    <input
                      id="acct-confirm-pw"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="lms-input"
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full rounded-xl sm:w-auto"
                    disabled={
                      changePasswordMut.isPending ||
                      !currentPassword ||
                      !newPassword ||
                      newPassword.length < 8
                    }
                    onClick={() => changePasswordMut.mutate()}
                  >
                    {changePasswordMut.isPending
                      ? 'Updating…'
                      : 'Update password'}
                  </Button>
                </>
              ) : (
                <p className="text-base leading-7 text-[var(--muted)]">
                  Password changes are managed by your administrator or support.
                  Contact an admin to reset your password.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className={settingsCardClass}>
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xl font-semibold">
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)]"
                />
                <span className="text-sm font-medium text-[var(--text)]">
                  Email digests
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notifyPush}
                  onChange={(e) => setNotifyPush(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)]"
                />
                <span className="text-sm font-medium text-[var(--text)]">
                  In-app & push
                </span>
              </label>
              <Button
                type="button"
                className="w-full rounded-xl sm:w-auto"
                onClick={saveNotif}
              >
                Save preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className={settingsCardClass}>
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xl font-semibold">Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
              <p className="text-sm text-[var(--muted)]">
                Uses the same theme as the sidebar toggle. Your choice is saved
                on this device.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant={!isDark ? 'default' : 'outline'}
                  className="w-full rounded-xl sm:w-auto"
                  onClick={() => setDark(false)}
                >
                  Light
                </Button>
                <Button
                  type="button"
                  variant={isDark ? 'default' : 'outline'}
                  className="w-full rounded-xl sm:w-auto"
                  onClick={() => setDark(true)}
                >
                  Dark
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canOrgSettings && orgId && (
          <TabsContent value="organization">
            <Card className={settingsCardClass}>
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-xl font-semibold">
                  Organization & course defaults
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-0">
                <Label className="text-sm font-medium">
                  Course defaults (JSON)
                </Label>
                <textarea
                  className="lms-input min-h-[160px] font-mono text-sm"
                  value={courseDefaults}
                  onChange={(e) => setCourseDefaults(e.target.value)}
                />
                <Button
                  type="button"
                  className="w-full rounded-xl sm:w-auto"
                  disabled={orgMut.isPending}
                  onClick={() => orgMut.mutate()}
                >
                  Save organization settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  )
}
