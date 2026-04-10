import { useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../../lib/api'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Download } from 'lucide-react'
import { cn } from '../../lib/utils'

const filterCard =
  'border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_8%,var(--card))] p-6 shadow-sm'
const reportCard =
  'border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-shadow hover:shadow-md'
const fieldInput =
  'lms-input mt-1 rounded-lg px-3 py-2 text-sm shadow-none font-sans'

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

  const params = {
    from,
    to,
    courseId: courseId.trim() || undefined,
    teamId: teamId.trim() || undefined,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-6"
    >
      <div>
        <h1>Reports</h1>
        <p className="text-base leading-7 text-[color-mix(in_srgb,var(--text)_90%,var(--muted))]">
          Export CSV reports (Excel-compatible). Filters apply to attendance and
          assessment exports.
        </p>
      </div>

      <Card className={cn('rounded-2xl', filterCard)}>
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-xl font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-0 sm:grid-cols-2">
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

      <div className="grid gap-4 sm:grid-cols-1">
        <Card className={cn('rounded-2xl', reportCard)}>
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xl font-semibold">
              Attendance report
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 p-0">
            <Button
              type="button"
              className="rounded-xl"
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
            <CardTitle className="text-xl font-semibold">
              Course completion
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 p-0">
            <Button
              type="button"
              className="rounded-xl"
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
            <CardTitle className="text-xl font-semibold">
              Assessment performance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 p-0">
            <Button
              type="button"
              className="rounded-xl"
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
    </motion.div>
  )
}
