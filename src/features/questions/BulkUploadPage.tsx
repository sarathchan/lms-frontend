import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { paginatedData } from '../../lib/paginated'

const panel =
  'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm'

type CourseRow = { id: string; title: string }

export function BulkUploadPage() {
  const navigate = useNavigate()
  const [courseId, setCourseId] = useState('')
  const [csv, setCsv] = useState(
    'moduleId,questionText,type,subject,chapter,topic,difficulty,marks,options,correctIndex,blanks\n',
  )

  const { data: coursesRes } = useQuery({
    queryKey: ['courses', 'bulk-picker'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CourseRow[] }>('courses', {
        params: { limit: 100, page: 1 },
      })
      return paginatedData(data)
    },
  })

  const run = useMutation({
    mutationFn: async () => {
      if (!courseId) throw new Error('Select a course')
      const { data } = await api.post<{ created: number; errors: string[] }>(
        'question-bank/bulk',
        { courseId, csv },
      )
      return data
    },
    onSuccess: (data) => {
      toast.success(`Created ${data.created} entries`)
      if (data.errors?.length) {
        toast.message(`${data.errors.length} row warnings — check console`)
        console.warn(data.errors)
      }
      navigate('/questions')
    },
    onError: () => toast.error('Upload failed'),
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="rounded-xl" asChild>
          <Link to="/questions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Question bank
          </Link>
        </Button>
        <h1 className="text-xl font-semibold text-[var(--text)]">Bulk CSV</h1>
      </div>

      <div className={panel}>
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-1 h-8 w-8 text-[var(--primary)]" />
          <div className="min-w-0 flex-1 space-y-4">
            <p className="text-sm text-[var(--muted)]">
              Required columns: <code>moduleId</code>, <code>questionText</code>,{' '}
              <code>type</code> (MCQ, FILL_BLANK, DESCRIPTIVE). Optional: subject,
              chapter, topic, difficulty (EASY/MEDIUM/HARD), marks, options (pipe
              | separated), correctIndex, blanks (pipe | separated).
            </p>
            <div>
              <Label>Course</Label>
              <select
                className="lms-input mt-1 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">Select course</option>
                {(coursesRes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>CSV</Label>
              <textarea
                className="lms-input mt-1 min-h-[220px] w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-xs"
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
              />
            </div>
            <Button disabled={run.isPending || !courseId} onClick={() => run.mutate()}>
              Import
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
