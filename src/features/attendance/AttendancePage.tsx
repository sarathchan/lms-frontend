import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { useAuthStore } from '../../stores/authStore'
import { AttendanceCalendar, type CalendarEventApi } from './AttendanceCalendar'

function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

export function AttendancePage() {
  const [tab, setTab] = useState<'charts' | 'calendar'>('charts')
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [startDate, setStartDate] = useState(todayISODate)
  const [endDate, setEndDate] = useState('')
  const [orgPick, setOrgPick] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'admin'],
    queryFn: async () => {
      const { data } = await api.get('attendance/admin')
      return data
    },
  })

  const { data: cal, isLoading: calLoading } = useQuery({
    queryKey: ['attendance', 'calendar', 'admin'],
    queryFn: async () => {
      const { data } = await api.get<{ events: CalendarEventApi[] }>(
        'attendance/calendar/admin',
      )
      return data
    },
    enabled: tab === 'calendar',
  })

  const needsOrgPicker =
    user?.role === 'SUPER_ADMIN' && !user?.organizationId

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await api.get<{ id: string; name: string }[]>(
        'organizations',
      )
      return data
    },
    enabled: tab === 'calendar' && needsOrgPicker,
  })

  const createMut = useMutation({
    mutationFn: async () => {
      await api.post('attendance/calendar/events', {
        title: title.trim(),
        body: body.trim() || undefined,
        startDate,
        endDate: endDate.trim() || undefined,
        organizationId: needsOrgPicker ? orgPick || undefined : undefined,
      })
    },
    onSuccess: () => {
      toast.success('Calendar event added — students in the organization will see it.')
      setTitle('')
      setBody('')
      setStartDate(todayISODate())
      setEndDate('')
      void qc.invalidateQueries({ queryKey: ['attendance', 'calendar', 'admin'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Could not add event'),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`attendance/calendar/events/${id}`)
    },
    onSuccess: () => {
      toast.success('Event removed')
      void qc.invalidateQueries({ queryKey: ['attendance', 'calendar', 'admin'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Could not remove'),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  const loginData =
    data?.dailyLoginTrend?.map(
      (d: { date: string; records: number }) => ({
        date: String(d.date).slice(5),
        records: d.records,
      }),
    ) ?? []

  const courseData =
    data?.courseAttendanceTrend?.map(
      (d: { date: string; sessions: number; totalSeconds: number }) => ({
        date: String(d.date).slice(5),
        sessions: d.sessions,
        hours: Math.round((d.totalSeconds / 3600) * 10) / 10,
      }),
    ) ?? []

  const orgEvents =
    cal?.events?.filter((e) => e.kind === 'org_event' && e.id) ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1>Attendance</h1>
        <p className="text-base leading-7 text-[var(--muted)]">
          Login and course activity (organization students). The calendar shows
          daily attendance (green / yellow / red) and organization events you add
          (indigo) — students see the same events on My attendance → Calendar.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === 'charts' ? 'default' : 'outline'}
          className="rounded-xl"
          onClick={() => setTab('charts')}
        >
          Charts
        </Button>
        <Button
          type="button"
          variant={tab === 'calendar' ? 'default' : 'outline'}
          className="rounded-xl"
          onClick={() => setTab('calendar')}
        >
          Calendar
        </Button>
      </div>

      {tab === 'charts' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily logins</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {loginData.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No records yet</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={loginData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="records" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course activity (hours)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {courseData.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No session data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Add organization calendar event
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {needsOrgPicker && (
                <div>
                  <Label>Organization</Label>
                  <select
                    className="lms-input mt-1 max-w-md"
                    value={orgPick}
                    onChange={(e) => setOrgPick(e.target.value)}
                    required
                  >
                    <option value="">Select organization…</option>
                    {orgs?.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label>Title</Label>
                <input
                  className="lms-input mt-1 max-w-xl"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Holiday — campus closed"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <Label>Start date</Label>
                  <input
                    type="date"
                    className="lms-input mt-1"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End date (optional)</Label>
                  <input
                    type="date"
                    className="lms-input mt-1"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Leave blank for a single day. Inclusive when set.
                  </p>
                </div>
              </div>
              <div>
                <Label>Details (optional)</Label>
                <textarea
                  className="lms-input mt-1 min-h-[80px] max-w-xl"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Shown to students in the agenda view (tooltip context)."
                />
              </div>
              <Button
                type="button"
                className="rounded-xl"
                disabled={
                  createMut.isPending ||
                  !title.trim() ||
                  !startDate ||
                  (needsOrgPicker && !orgPick)
                }
                onClick={() => createMut.mutate()}
              >
                {createMut.isPending ? 'Saving…' : 'Publish to student calendars'}
              </Button>
            </CardContent>
          </Card>

          {calLoading || !cal ? (
            <Skeleton className="h-[560px] rounded-2xl" />
          ) : (
            <>
              <AttendanceCalendar events={cal.events} />
              {orgEvents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Organization events (this month range)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {orgEvents.map((e) => (
                      <div
                        key={e.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                      >
                        <div>
                          <p className="font-medium text-[var(--text)]">
                            {e.title}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {e.startDate}
                            {e.endDate && e.endDate !== e.startDate
                              ? ` → ${e.endDate}`
                              : ''}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          disabled={deleteMut.isPending}
                          onClick={() => e.id && deleteMut.mutate(e.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}
