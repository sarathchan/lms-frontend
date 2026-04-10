import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { GraduationCap, Plus } from 'lucide-react'
import { cn } from '../../lib/utils'

const panel =
  'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm'

type ProgramRow = {
  id: string
  name: string
  description: string | null
  examType: { id: string; name: string; slug: string }
  updatedAt: string
  _count: { courses: number; members: number; neetTests: number }
}

export function ProgramsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [examTypeId, setExamTypeId] = useState('')

  const { data: examTypes } = useQuery({
    queryKey: ['exam-types'],
    queryFn: async () => {
      const { data } = await api.get<{ id: string; name: string }[]>('exam-types')
      return data
    },
    enabled: open,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['programs', 'list'],
    queryFn: async () => {
      const { data: rows } = await api.get<ProgramRow[]>('programs')
      return rows
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      await api.post('programs', {
        name: name.trim(),
        description: description.trim() || undefined,
        examTypeId,
      })
    },
    onSuccess: () => {
      toast.success('Program created')
      setOpen(false)
      setName('')
      setDescription('')
      setExamTypeId('')
      void qc.invalidateQueries({ queryKey: ['programs'] })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Coaching programs</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Bundle Physics, Chemistry, and Biology courses with NEET-style tests and cohort ranking.
          </p>
        </div>
        <Button className="rounded-xl" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New program
        </Button>
      </div>

      <div className={cn(panel, 'p-0 overflow-hidden')}>
        {!data && isLoading ? (
          <div className="p-6">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !data?.length ? (
          <div className="p-10 text-center text-sm text-[var(--muted)]">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 opacity-40" />
            No programs yet. Create one to assign courses, students, and tests.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {data.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/programs/${p.id}`}
                  className="flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--muted)_6%,transparent)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-[var(--text)]">{p.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {p.examType.name} · {p._count.courses} courses · {p._count.members} students ·{' '}
                      {p._count.neetTests} tests
                    </p>
                  </div>
                  <span className="text-sm font-medium text-[var(--primary)]">Manage →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create coaching program</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Exam type</Label>
              <select
                className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                value={examTypeId}
                onChange={(e) => setExamTypeId(e.target.value)}
              >
                <option value="">Select…</option>
                {(examTypes ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Name</Label>
              <input
                className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="NEET Coaching 2026"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <textarea
                className="lms-input mt-1 min-h-[88px] w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Batch details, schedule notes…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={!name.trim() || !examTypeId || create.isPending}
              onClick={() => create.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
