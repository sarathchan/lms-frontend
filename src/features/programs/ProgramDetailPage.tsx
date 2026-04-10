import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { paginatedData } from '../../lib/paginated'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react'
const panel =
  'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm'

type ProgramDetail = {
  id: string
  name: string
  description: string | null
  examType: { id: string; name: string; slug: string }
  courses: {
    id: string
    courseId: string
    order: number
    practiceModuleId: string | null
    course: {
      id: string
      title: string
      published: boolean
      subjectId: string | null
      subject: { id: string; name: string; iconEmoji: string | null } | null
    }
  }[]
  members: {
    userId: string
    user: { id: string; email: string; firstName: string; lastName: string }
  }[]
  neetTests: {
    id: string
    title: string
    durationMins: number
    published: boolean
    strictNeetMarking: boolean
    type: string
    _count: { questions: number }
  }[]
}

type CourseOpt = { id: string; title: string }

type CourseWithMods = {
  id: string
  modules: { id: string; title: string }[]
}

export function ProgramDetailPage() {
  const { programId } = useParams<{ programId: string }>()
  const qc = useQueryClient()

  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [courseOpen, setCourseOpen] = useState(false)
  const [pickCourseId, setPickCourseId] = useState('')
  const [practiceModuleId, setPracticeModuleId] = useState<string>('')

  const [memberOpen, setMemberOpen] = useState(false)
  const [memberIdsRaw, setMemberIdsRaw] = useState('')

  const [testOpen, setTestOpen] = useState(false)
  const [testTitle, setTestTitle] = useState('')
  const [testDuration, setTestDuration] = useState(180)
  const [testPublished, setTestPublished] = useState(false)

  const { data: program, isLoading } = useQuery({
    queryKey: ['programs', programId],
    queryFn: async () => {
      const { data } = await api.get<ProgramDetail>(`programs/${programId}`)
      return data
    },
    enabled: !!programId,
  })

  const { data: coursesPage } = useQuery({
    queryKey: ['programs', 'pick-courses'],
    queryFn: async () => {
      const { data } = await api.get('courses', { params: { page: 1, limit: 100 } })
      return data
    },
    enabled: courseOpen,
  })

  const { data: pickedCourse } = useQuery({
    queryKey: ['course', pickCourseId, 'mods'],
    queryFn: async () => {
      const { data } = await api.get<CourseWithMods>(`courses/${pickCourseId}`)
      return data
    },
    enabled: !!pickCourseId && courseOpen,
  })

  const courseOptions = useMemo(
    () => paginatedData<CourseOpt>(coursesPage),
    [coursesPage],
  )

  const updateMeta = useMutation({
    mutationFn: async () => {
      await api.patch(`programs/${programId}`, {
        name: name.trim(),
        description: description.trim() || null,
      })
    },
    onSuccess: () => {
      toast.success('Saved')
      setEditOpen(false)
      void qc.invalidateQueries({ queryKey: ['programs'] })
    },
  })

  const addCourse = useMutation({
    mutationFn: async () => {
      await api.post(`programs/${programId}/courses`, {
        courseId: pickCourseId,
        practiceModuleId: practiceModuleId || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Course linked')
      setCourseOpen(false)
      setPickCourseId('')
      setPracticeModuleId('')
      void qc.invalidateQueries({ queryKey: ['programs', programId] })
    },
  })

  const removeCourse = useMutation({
    mutationFn: async (linkId: string) => {
      await api.delete(`programs/${programId}/courses/${linkId}`)
    },
    onSuccess: () => {
      toast.success('Removed')
      void qc.invalidateQueries({ queryKey: ['programs', programId] })
    },
  })

  const addMembers = useMutation({
    mutationFn: async (userIds: string[]) => {
      await api.post(`programs/${programId}/members`, { userIds, enrollInCourses: true })
    },
    onSuccess: () => {
      toast.success('Members updated')
      setMemberOpen(false)
      setMemberIdsRaw('')
      void qc.invalidateQueries({ queryKey: ['programs', programId] })
    },
  })

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`programs/${programId}/members/${userId}`)
    },
    onSuccess: () => {
      toast.success('Removed from program')
      void qc.invalidateQueries({ queryKey: ['programs', programId] })
    },
  })

  const createTest = useMutation({
    mutationFn: async () => {
      await api.post(`programs/${programId}/neet-tests`, {
        title: testTitle.trim(),
        durationMins: testDuration,
        published: testPublished,
      })
    },
    onSuccess: () => {
      toast.success('NEET test created (strict +4/−1 marking)')
      setTestOpen(false)
      setTestTitle('')
      setTestDuration(180)
      setTestPublished(false)
      void qc.invalidateQueries({ queryKey: ['programs', programId] })
      void qc.invalidateQueries({ queryKey: ['neet'] })
    },
  })

  const openEdit = () => {
    if (!program) return
    setName(program.name)
    setDescription(program.description ?? '')
    setEditOpen(true)
  }

  const parseMemberIds = () =>
    memberIdsRaw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)

  if (!programId) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Missing program. <Link to="/programs">Back</Link>
      </p>
    )
  }

  if (isLoading || !program) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/programs"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Programs
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text)]">{program.name}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {program.examType.name} · Students see tests and coaching stats on their dashboard (no extra app area).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={openEdit}>
              Edit details
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <a href="/questions" target="_blank" rel="noreferrer">
                Question bank <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to="/neet">NEET tools</Link>
            </Button>
          </div>
        </div>
      </div>

      <section className={panel}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[var(--text)]">Program courses</h2>
          <Button size="sm" className="rounded-xl" onClick={() => setCourseOpen(true)}>
            Link course
          </Button>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Map each subject to a normal LMS course. “Practice now” on the student dashboard uses the linked chapter
          (or first module).
        </p>
        <ul className="mt-4 space-y-2">
          {program.courses.length === 0 && (
            <li className="text-sm text-[var(--muted)]">No courses linked yet.</li>
          )}
          {program.courses.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-[var(--text)]">{c.course.title}</p>
                <p className="text-xs text-[var(--muted)]">
                  {c.course.subject?.name ?? 'Subject not set on course'} ·{' '}
                  {c.course.published ? 'Published' : 'Draft'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="rounded-lg" asChild>
                  <Link to={`/courses/${c.courseId}`}>Open course</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg text-red-600 hover:text-red-700"
                  aria-label="Remove course"
                  onClick={() => removeCourse.mutate(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={panel}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[var(--text)]">Students</h2>
          <Button size="sm" className="rounded-xl" onClick={() => setMemberOpen(true)}>
            Add members
          </Button>
        </div>
        <ul className="mt-4 space-y-2">
          {program.members.length === 0 && (
            <li className="text-sm text-[var(--muted)]">No students assigned.</li>
          )}
          {program.members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm"
            >
              <span className="text-[var(--text)]">
                {m.user.firstName} {m.user.lastName}{' '}
                <span className="text-[var(--muted)]">({m.user.email})</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg text-red-600"
                onClick={() => removeMember.mutate(m.userId)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className={panel}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[var(--text)]">NEET tests (program)</h2>
          <Button size="sm" className="rounded-xl" onClick={() => setTestOpen(true)}>
            Create test
          </Button>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Default 180 minutes, +4 / −1 / 0 marking. Attach questions from the NEET question bank to each test id (API
          or existing flows).
        </p>
        <ul className="mt-4 space-y-2">
          {program.neetTests.length === 0 && (
            <li className="text-sm text-[var(--muted)]">No tests yet.</li>
          )}
          {program.neetTests.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-[var(--text)]">{t.title}</p>
                <p className="text-xs text-[var(--muted)]">
                  {t.durationMins} min · {t._count.questions} questions ·{' '}
                  {t.published ? 'Live' : 'Draft'}
                  {t.strictNeetMarking ? ' · NEET marks' : ''}
                </p>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg" asChild>
                <Link to="/neet">Student hub</Link>
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit program</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Name</Label>
              <input
                className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                className="lms-input mt-1 min-h-[80px] w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={!name.trim() || updateMeta.isPending}
              onClick={() => updateMeta.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={courseOpen} onOpenChange={setCourseOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link course</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Course</Label>
              <select
                className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                value={pickCourseId}
                onChange={(e) => {
                  setPickCourseId(e.target.value)
                  setPracticeModuleId('')
                }}
              >
                <option value="">Select…</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            {pickedCourse?.modules?.length ? (
              <div>
                <Label>Practice chapter (module)</Label>
                <select
                  className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  value={practiceModuleId}
                  onChange={(e) => setPracticeModuleId(e.target.value)}
                >
                  <option value="">First module (default)</option>
                  {pickedCourse.modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCourseOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={!pickCourseId || addCourse.isPending}
              onClick={() => addCourse.mutate()}
            >
              Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add students</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--muted)]">
            Paste user IDs (UUID), separated by commas or new lines. They will be enrolled in all program courses.
          </p>
          <textarea
            className="lms-input mt-2 min-h-[120px] w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono text-xs"
            value={memberIdsRaw}
            onChange={(e) => setMemberIdsRaw(e.target.value)}
            placeholder="uuid-here&#10;uuid-here"
          />
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setMemberOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={parseMemberIds().length === 0 || addMembers.isPending}
              onClick={() => addMembers.mutate(parseMemberIds())}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create NEET test</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Title</Label>
              <input
                className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Full mock — April"
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <input
                type="number"
                className="lms-input mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                value={testDuration}
                onChange={(e) => setTestDuration(parseInt(e.target.value, 10) || 180)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={testPublished}
                onChange={(e) => setTestPublished(e.target.checked)}
              />
              Published (visible to assigned students)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setTestOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={!testTitle.trim() || createTest.isPending}
              onClick={() => createTest.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
