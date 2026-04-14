import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { api } from '../../lib/api'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Skeleton } from '../../components/ui/Skeleton'
import { Download } from 'lucide-react'
import { cn } from '../../lib/utils'

const filterCard =
  'border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_8%,var(--card))] p-6 shadow-sm'
const reportCard =
  'border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-shadow hover:shadow-md'
const fieldInput =
  'lms-input mt-1 rounded-lg px-3 py-2 text-sm shadow-none font-sans'

type PerformanceRow = {
  userName: string
  userEmail: string
  courseTitle: string
  scorePct: number
  date: string
}

function formatReportDate(iso: string) {
  try {
    return format(parseISO(iso), 'dd MMM yyyy, hh:mm a')
  } catch {
    return new Date(iso).toLocaleString()
  }
}

async function downloadCsv(
  path: string,
  params: Record<string, string | undefined>,
  filename: string,
) {
  try {
    const res = await api.get(path, {
      params,
      responseType: 'blob',
    })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Download started')
  } catch {
    toast.error('Download failed')
  }
}

export function ReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [courseId, setCourseId] = useState('')
  const [teamId, setTeamId] = useState('')

  const params = useMemo(
    () => ({
      from,
      to,
      courseId: courseId.trim() || undefined,
      teamId: teamId.trim() || undefined,
    }),
    [from, to, courseId, teamId],
  )

  const {
    data: perfData,
    isLoading: perfLoading,
    isError: perfError,
    refetch: refetchPerf,
  } = useQuery({
    queryKey: ['reports', 'performance', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: PerformanceRow[] }>(
        'reports/performance',
        { params },
      )
      return data.data ?? []
    },
  })

  const rows = perfData ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full min-w-0 max-w-3xl space-y-4 lg:space-y-6 xl:max-w-5xl"
    >
      <div>
        <h1>Reports</h1>
        <p className="text-base leading-7 text-[color-mix(in_srgb,var(--text)_90%,var(--muted))]">
          Review assessment attempts in the table below, or export CSV (Excel-compatible).
          Filters apply to the performance table and all exports.
        </p>
      </div>

      <Card className={cn('rounded-2xl', filterCard)}>
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-xl font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:gap-6">
          <div>
            <Label htmlFor="from">From</Label>
            <input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={cn(fieldInput, 'w-full')}
            />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={cn(fieldInput, 'w-full')}
            />
          </div>
          <div>
            <Label htmlFor="course">Course ID (optional)</Label>
            <input
              id="course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="UUID"
              className={cn(fieldInput, 'w-full font-mono text-xs sm:text-sm')}
            />
          </div>
          <div>
            <Label htmlFor="team">Team ID (optional)</Label>
            <input
              id="team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="UUID"
              className={cn(fieldInput, 'w-full font-mono text-xs sm:text-sm')}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={cn('rounded-2xl', reportCard)}>
        <CardHeader className="flex flex-col gap-3 p-0 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xl font-semibold">
            Assessment performance
          </CardTitle>
          <Button
            type="button"
            className="w-full rounded-xl sm:w-auto"
            onClick={() => downloadCsv('reports/export', params, 'report.csv')}
          >
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {perfLoading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : perfError ? (
            <div className="rounded-lg border border-red-200 bg-red-50/80 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              <p>Could not load report data.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 rounded-lg"
                onClick={() => void refetchPerf()}
              >
                Retry
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No attempts in this date range. Adjust filters or try a wider range.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full min-w-[560px] text-left text-sm text-[var(--text)]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_10%,var(--card))]">
                    <th className="px-3 py-2.5 font-medium text-[var(--muted)]">
                      User
                    </th>
                    <th className="px-3 py-2.5 font-medium text-[var(--muted)]">
                      Course
                    </th>
                    <th className="px-3 py-2.5 font-medium text-[var(--muted)]">
                      Score
                    </th>
                    <th className="px-3 py-2.5 font-medium text-[var(--muted)]">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rows.map((r, i) => (
                    <tr key={`${r.date}-${r.userEmail}-${i}`}>
                      <td className="px-3 py-2.5 align-top">
                        <span className="font-medium">{r.userName}</span>
                        <br />
                        <span className="text-xs text-[var(--muted)]">
                          {r.userEmail}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-top">{r.courseTitle}</td>
                      <td className="px-3 py-2.5 align-top tabular-nums">
                        {r.scorePct}%
                      </td>
                      <td className="px-3 py-2.5 align-top text-[color-mix(in_srgb,var(--text)_88%,var(--muted))]">
                        {formatReportDate(r.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-lg font-semibold text-[var(--text)]">
          Additional exports
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          <Card className={cn('rounded-2xl', reportCard)}>
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                Attendance report
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-0 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="w-full rounded-xl sm:w-auto"
                onClick={() =>
                  downloadCsv('reports/attendance.csv', params, 'attendance.csv')
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </CardContent>
          </Card>

          <Card className={cn('rounded-2xl', reportCard)}>
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                Course completion
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-0 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="w-full rounded-xl sm:w-auto"
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    'reports/completion.csv',
                    params,
                    'completion.csv',
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </CardContent>
          </Card>

          <Card className={cn('rounded-2xl', reportCard)}>
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                Assessment detail (full)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-0 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="w-full rounded-xl sm:w-auto"
                variant="outline"
                onClick={() =>
                  downloadCsv(
                    'reports/assessments.csv',
                    params,
                    'assessments.csv',
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
