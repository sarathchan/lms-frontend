import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { Skeleton } from '../../components/ui/Skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { AttendanceCalendar, type CalendarEventApi } from './AttendanceCalendar'

export function MyAttendancePage() {
  const [tab, setTab] = useState<'table' | 'calendar'>('table')
  const user = useAuthStore((s) => s.user)
  const isStaff =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'INSTRUCTOR'

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'me'],
    queryFn: async () => {
      const { data } = await api.get('attendance/me')
      return data
    },
    enabled: !!user && !isStaff,
  })

  const { data: cal, isLoading: calLoading } = useQuery({
    queryKey: ['attendance', 'calendar', 'me'],
    queryFn: async () => {
      const { data } = await api.get<{ events: CalendarEventApi[] }>(
        'attendance/calendar/me',
      )
      return data
    },
    enabled: !!user && !isStaff && tab === 'calendar',
  })

  if (isStaff) return <Navigate to="/attendance" replace />

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const daily = data?.last30DaysDaily ?? []
  const courseSessions = data?.courseSessions ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1>My attendance</h1>
        <p className="text-base leading-7 text-[var(--muted)]">
          Last 30 days overview and monthly calendar. Indigo entries are
          organization events from your school (holidays, deadlines, etc.).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === 'table' ? 'default' : 'outline'}
          className="rounded-xl"
          onClick={() => setTab('table')}
        >
          Tables
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overall (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-semibold text-mylms-600">
            {data?.attendancePct ?? 0}%
          </p>
          <p className="text-sm text-slate-500">
            Present days / days with activity
          </p>
        </CardContent>
      </Card>

      {tab === 'calendar' && (
        <div className="lms-section">
          {calLoading || !cal ? (
            <Skeleton className="h-[560px]" />
          ) : (
            <AttendanceCalendar events={cal.events} />
          )}
        </div>
      )}

      {tab === 'table' && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily logins</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Duration (min)</th>
              </tr>
            </thead>
            <tbody>
              {daily.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-slate-500">
                    No rows yet — log in on different days to build history.
                  </td>
                </tr>
              )}
              {daily.map(
                (r: {
                  id: string
                  date: string
                  status: string
                  durationSec: number
                }) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-2 pr-4 text-slate-900 dark:text-white">
                      {String(r.date).slice(0, 10)}
                    </td>
                    <td className="py-2 pr-4">{r.status}</td>
                    <td className="py-2">
                      {Math.round(r.durationSec / 60)}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      )}

      {tab === 'table' && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course sessions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Time (min)</th>
              </tr>
            </thead>
            <tbody>
              {courseSessions.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-slate-500">
                    Open a course to record study time.
                  </td>
                </tr>
              )}
              {courseSessions.map(
                (r: {
                  id: string
                  date: string
                  status: string
                  durationSec: number
                }) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-2 pr-4 text-slate-900 dark:text-white">
                      {String(r.date).slice(0, 10)}
                    </td>
                    <td className="py-2 pr-4">{r.status}</td>
                    <td className="py-2">
                      {Math.round(r.durationSec / 60)}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
