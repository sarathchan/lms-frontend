import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import {
  formatUploadBytes,
  uploadCourseMediaMultipart,
} from '../../lib/uploadCourseMedia'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Card, CardContent } from '../../components/ui/card'

export type EditorQuizQ = {
  id: string
  type: string
  prompt: string
  options?: string[]
  correctIndex?: number
  blanks?: unknown
  order: number
  points: number
}

export type EditorLessonRow = {
  id: string
  title: string
  type: string
  order: number
  durationSec?: number | null
  mediaId?: string | null
  quiz?: {
    id: string
    timeLimitSec: number | null
    maxAttempts: number
    passScorePct: number
    questions: EditorQuizQ[]
  } | null
}

export type EditorModRow = {
  id: string
  title: string
  order: number
  lessons: EditorLessonRow[]
}

function SortableMod({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.92 : 1,
      }}
      className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-stretch">
        <button
          type="button"
          className="flex w-9 shrink-0 cursor-grab items-center justify-center border-r border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/50"
          {...attributes}
          {...listeners}
          aria-label="Drag module"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

function SortableLes({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.92 : 1,
      }}
      className="flex items-stretch rounded-lg border border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/40"
    >
      <button
        type="button"
        className="flex w-8 shrink-0 cursor-grab items-center justify-center text-slate-400"
        {...attributes}
        {...listeners}
        aria-label="Drag lesson"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

const LESSON_TYPES = ['VIDEO', 'DOCUMENT', 'QUIZ', 'VOICE'] as const

export function CourseStructureEditor({
  courseId,
  modules,
}: {
  courseId: string
  modules: EditorModRow[]
}) {
  const qc = useQueryClient()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const sortedMods = useMemo(
    () => [...modules].sort((a, b) => a.order - b.order),
    [modules],
  )
  const moduleIds = sortedMods.map((m) => m.id)

  const [newModOpen, setNewModOpen] = useState(false)
  const [newModTitle, setNewModTitle] = useState('New module')
  const [lessonDlg, setLessonDlg] = useState<{
    moduleId: string
  } | null>(null)
  const [lesTitle, setLesTitle] = useState('')
  const [lesType, setLesType] =
    useState<(typeof LESSON_TYPES)[number]>('VIDEO')

  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ['course', courseId] })

  const addModule = useMutation({
    mutationFn: () =>
      api.post(`courses/${courseId}/modules`, {
        title: newModTitle,
        order: sortedMods.length,
      }),
    onSuccess: () => {
      toast.success('Module added')
      setNewModOpen(false)
      setNewModTitle('New module')
      invalidate()
    },
  })

  const reorderMods = useMutation({
    mutationFn: (ids: string[]) =>
      api.post(`courses/${courseId}/reorder-modules`, { moduleIds: ids }),
    onSuccess: () => invalidate(),
  })

  const onModDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldI = moduleIds.indexOf(String(active.id))
    const newI = moduleIds.indexOf(String(over.id))
    if (oldI < 0 || newI < 0) return
    reorderMods.mutate(arrayMove(moduleIds, oldI, newI))
  }

  const deleteModule = useMutation({
    mutationFn: (id: string) => api.delete(`courses/modules/${id}`),
    onSuccess: () => {
      toast.success('Module removed')
      invalidate()
    },
  })

  const addLesson = useMutation({
    mutationFn: () => {
      if (!lessonDlg) throw new Error('no module')
      const body: Record<string, unknown> = {
        title: lesTitle,
        type: lesType,
        order: 999,
      }
      if (lesType === 'QUIZ') {
        body.content = {
          timeLimitSec: 900,
          maxAttempts: 3,
          passScorePct: 60,
        }
      }
      return api.post(`courses/modules/${lessonDlg.moduleId}/lessons`, body)
    },
    onSuccess: () => {
      toast.success('Lesson added')
      setLessonDlg(null)
      setLesTitle('')
      setLesType('VIDEO')
      invalidate()
    },
  })

  return (
    <Card className="border-dashed border-mylms-300 dark:border-mylms-700">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Course structure
          </h2>
          <Button type="button" size="sm" onClick={() => setNewModOpen(true)}>
            <Plus className="h-4 w-4" />
            Module
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onModDragEnd}
        >
          <SortableContext
            items={moduleIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {sortedMods.map((mod) => (
                <SortableMod key={mod.id} id={mod.id}>
                  <ModuleLessons
                    courseId={courseId}
                    mod={mod}
                    onAddLesson={() => {
                      setLessonDlg({ moduleId: mod.id })
                      setLesTitle('New lesson')
                    }}
                    onDeleteModule={() => {
                      if (
                        confirm(
                          `Delete module "${mod.title}" and all its lessons?`,
                        )
                      )
                        deleteModule.mutate(mod.id)
                    }}
                    onInvalidate={invalidate}
                  />
                </SortableMod>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Dialog open={newModOpen} onOpenChange={setNewModOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New module</DialogTitle>
            </DialogHeader>
            <label className="grid gap-1 text-sm">
              <span>Title</span>
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                value={newModTitle}
                onChange={(e) => setNewModTitle(e.target.value)}
              />
            </label>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewModOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={addModule.isPending}
                onClick={() => addModule.mutate()}
              >
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!lessonDlg}
          onOpenChange={(o) => !o && setLessonDlg(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New lesson</DialogTitle>
            </DialogHeader>
            <label className="grid gap-1 text-sm">
              <span>Title</span>
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                value={lesTitle}
                onChange={(e) => setLesTitle(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Type</span>
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                value={lesType}
                onChange={(e) =>
                  setLesType(e.target.value as (typeof LESSON_TYPES)[number])
                }
              >
                {LESSON_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLessonDlg(null)}>
                Cancel
              </Button>
              <Button
                disabled={addLesson.isPending || !lesTitle.trim()}
                onClick={() => addLesson.mutate()}
              >
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function ModuleLessons({
  courseId,
  mod,
  onAddLesson,
  onDeleteModule,
  onInvalidate,
}: {
  courseId: string
  mod: EditorModRow
  onAddLesson: () => void
  onDeleteModule: () => void
  onInvalidate: () => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )
  const sorted = useMemo(
    () => [...mod.lessons].sort((a, b) => a.order - b.order),
    [mod.lessons],
  )
  const lessonIds = sorted.map((l) => l.id)

  const [titleEdit, setTitleEdit] = useState(mod.title)
  const saveTitle = useMutation({
    mutationFn: () =>
      api.post(`courses/modules/${mod.id}/update`, { title: titleEdit }),
    onSuccess: () => {
      toast.success('Module saved')
      onInvalidate()
    },
  })

  const reorderLes = useMutation({
    mutationFn: (ids: string[]) =>
      api.post(`courses/modules/${mod.id}/reorder-lessons`, {
        lessonIds: ids,
      }),
    onSuccess: () => onInvalidate(),
  })

  const onLesDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const o = lessonIds.indexOf(String(active.id))
    const n = lessonIds.indexOf(String(over.id))
    if (o < 0 || n < 0) return
    reorderLes.mutate(arrayMove(lessonIds, o, n))
  }

  const delLesson = useMutation({
    mutationFn: (id: string) => api.delete(`courses/lessons/${id}`),
    onSuccess: () => {
      toast.success('Lesson removed')
      onInvalidate()
    },
  })

  return (
    <div className="p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="min-w-[8rem] flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium dark:border-slate-700 dark:bg-slate-950"
          value={titleEdit}
          onChange={(e) => setTitleEdit(e.target.value)}
          onBlur={() => {
            if (titleEdit !== mod.title) saveTitle.mutate()
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={onAddLesson}>
          <Plus className="h-3.5 w-3.5" />
          Lesson
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onDeleteModule}
          aria-label="Delete module"
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onLesDragEnd}
      >
        <SortableContext
          items={lessonIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {sorted.map((lesson) => (
              <li key={lesson.id}>
                <SortableLes id={lesson.id}>
                  <LessonRowEditor
                    courseId={courseId}
                    moduleId={mod.id}
                    moduleTitle={mod.title}
                    lesson={lesson}
                    onRemoved={() => delLesson.mutate(lesson.id)}
                    onInvalidate={onInvalidate}
                  />
                </SortableLes>
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function LessonRowEditor({
  courseId,
  moduleId,
  moduleTitle,
  lesson,
  onRemoved,
  onInvalidate,
}: {
  courseId: string
  moduleId: string
  moduleTitle: string
  lesson: EditorLessonRow
  onRemoved: () => void
  onInvalidate: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(lesson.title)
  const [uploadProgress, setUploadProgress] = useState<{
    percent: number
    loaded: number
    total: number
  } | null>(null)
  const save = useMutation({
    mutationFn: () =>
      api.post(`courses/lessons/${lesson.id}/update`, { title }),
    onSuccess: () => {
      toast.success('Lesson updated')
      onInvalidate()
    },
  })

  const uploadMedia = async (file: File) => {
    const kind =
      lesson.type === 'VIDEO'
        ? 'VIDEO'
        : lesson.type === 'DOCUMENT'
          ? 'DOCUMENT'
          : 'OTHER'
    setUploadProgress({ percent: 0, loaded: 0, total: file.size })
    try {
      const { mediaId } = await uploadCourseMediaMultipart(
        file,
        kind,
        setUploadProgress,
      )
      await api.post(`courses/lessons/${lesson.id}/update`, { mediaId })
      toast.success('File attached')
      onInvalidate()
    } finally {
      setUploadProgress(null)
    }
  }

  return (
    <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <input
          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium hover:border-slate-200 dark:hover:border-slate-700"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title !== lesson.title) save.mutate()
          }}
        />
        <p className="text-xs text-slate-500">
          {lesson.type}
          {lesson.mediaId ? ' · Media attached' : ''}
        </p>
        {uploadProgress && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[11px] font-medium tabular-nums text-slate-600 dark:text-slate-400">
              <span>Uploading</span>
              <span>
                {formatUploadBytes(uploadProgress.loaded)} /{' '}
                {formatUploadBytes(uploadProgress.total)} ·{' '}
                {uploadProgress.percent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-indigo-600 transition-[width] duration-200 ease-out dark:bg-indigo-500"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {(lesson.type === 'VIDEO' || lesson.type === 'DOCUMENT') && (
          <>
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void uploadMedia(f).catch(() => {})
                e.target.value = ''
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={uploadProgress != null}
              onClick={() => fileRef.current?.click()}
            >
              {uploadProgress != null ? 'Uploading…' : 'Upload'}
            </Button>
          </>
        )}
        {lesson.type === 'QUIZ' && lesson.quiz && (
          <QuizQuickEdit
            courseId={courseId}
            moduleId={moduleId}
            quizId={lesson.quiz.id}
            q={lesson.quiz}
            moduleTitle={moduleTitle}
            lessonTitle={lesson.title}
            onDone={onInvalidate}
          />
        )}
        <Button type="button" size="sm" variant="ghost" onClick={onRemoved}>
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    </div>
  )
}

function QuizQuickEdit({
  courseId,
  moduleId,
  quizId,
  q,
  moduleTitle,
  lessonTitle,
  onDone,
}: {
  courseId: string
  moduleId: string
  quizId: string
  q: NonNullable<EditorLessonRow['quiz']>
  moduleTitle: string
  lessonTitle: string
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pickOpen, setPickOpen] = useState(false)
  const [selectedBank, setSelectedBank] = useState<Set<string>>(() => new Set())
  const [genCount, setGenCount] = useState(5)
  const [genDiff, setGenDiff] = useState('')
  const [timeLimitSec, setTimeLimitSec] = useState(q.timeLimitSec ?? 0)
  const [maxAttempts, setMaxAttempts] = useState(q.maxAttempts)
  const [passScorePct, setPassScorePct] = useState(q.passScorePct)
  const [prompt, setPrompt] = useState('')
  const [qType, setQType] = useState<'MCQ' | 'FILL_BLANK' | 'DESCRIPTIVE'>(
    'MCQ',
  )
  const [options, setOptions] = useState('A\nB\nC\nD')
  const [correctIndex, setCorrectIndex] = useState(0)
  const [blanks, setBlanks] = useState('answer')
  const [subject, setSubject] = useState('General')
  const [chapter, setChapter] = useState(moduleTitle)
  const [topic, setTopic] = useState(lessonTitle)

  useEffect(() => {
    if (open) {
      setChapter(moduleTitle)
      setTopic(lessonTitle)
    }
  }, [open, moduleTitle, lessonTitle])

  const saveQuiz = useMutation({
    mutationFn: () =>
      api.patch(`assessments/quizzes/${quizId}`, {
        timeLimitSec: timeLimitSec || null,
        maxAttempts,
        passScorePct,
      }),
    onSuccess: () => {
      toast.success('Quiz settings saved')
      onDone()
    },
  })

  const addQ = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        type: qType,
        prompt,
        order: q.questions.length,
        subject: subject.trim() || 'General',
        chapter: chapter.trim() || moduleTitle,
        topic: topic.trim() || lessonTitle,
      }
      if (qType === 'MCQ') {
        body.options = options.split('\n').filter(Boolean)
        body.correctIndex = correctIndex
      }
      if (qType === 'FILL_BLANK') {
        body.blanks = blanks.split(',').map((s) => s.trim()).filter(Boolean)
      }
      return api.post(`assessments/quizzes/${quizId}/questions`, body)
    },
    onSuccess: () => {
      toast.success('Question added')
      setPrompt('')
      onDone()
    },
  })

  const { data: bankPage } = useQuery({
    queryKey: ['question-bank', 'pick', courseId, moduleId],
    queryFn: async () => {
      const { data } = await api.get<{
        items: { id: string; questionText: string; type: string }[]
      }>('question-bank/entries', {
        params: {
          courseId,
          moduleId,
          isApproved: 'true',
          pageSize: '100',
        },
      })
      return data
    },
    enabled: open && pickOpen,
  })

  const attachBank = useMutation({
    mutationFn: () =>
      api.post(`question-bank/quizzes/${quizId}/from-bank`, {
        entryIds: [...selectedBank],
      }),
    onSuccess: () => {
      toast.success('Linked from bank')
      setSelectedBank(new Set())
      setPickOpen(false)
      onDone()
    },
    onError: () =>
      toast.error(
        'Could not attach — use approved bank items in this chapter & course',
      ),
  })

  const genBank = useMutation({
    mutationFn: () =>
      api.post(`question-bank/quizzes/${quizId}/generate`, {
        moduleId,
        count: genCount,
        ...(genDiff ? { difficulty: genDiff } : {}),
      }),
    onSuccess: () => {
      toast.success('Generated from bank')
      onDone()
    },
    onError: () => toast.error('Generate failed (check bank has approved items)'),
  })

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Quiz & questions
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assessment builder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm">
            <label className="grid gap-1">
              Time limit (sec, 0 = none)
              <input
                type="number"
                className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                value={timeLimitSec}
                onChange={(e) => setTimeLimitSec(+e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              Max attempts
              <input
                type="number"
                className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(+e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              Pass score %
              <input
                type="number"
                className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                value={passScorePct}
                onChange={(e) => setPassScorePct(+e.target.value)}
              />
            </label>
            <Button size="sm" onClick={() => saveQuiz.mutate()}>
              Save quiz settings
            </Button>
            <hr className="border-slate-200 dark:border-slate-800" />
            <p className="font-medium">Add question</p>
            <label className="grid gap-1">
              Subject (analytics)
              <input
                className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Chemistry"
              />
            </label>
            <label className="grid gap-1">
              Chapter
              <input
                className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="Module or chapter name"
              />
            </label>
            <label className="grid gap-1">
              Topic
              <input
                className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Electrophilic substitution"
              />
            </label>
            <select
              className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
              value={qType}
              onChange={(e) =>
                setQType(e.target.value as typeof qType)
              }
            >
              <option value="MCQ">MCQ</option>
              <option value="FILL_BLANK">Fill blank</option>
              <option value="DESCRIPTIVE">Descriptive</option>
            </select>
            <label className="grid gap-1">
              Prompt
              <textarea
                className="min-h-[4rem] rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>
            {qType === 'MCQ' && (
              <>
                <label className="grid gap-1">
                  Options (one per line)
                  <textarea
                    className="min-h-[5rem] rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                    value={options}
                    onChange={(e) => setOptions(e.target.value)}
                  />
                </label>
                <label className="grid gap-1">
                  Correct index (0-based)
                  <input
                    type="number"
                    className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                    value={correctIndex}
                    onChange={(e) => setCorrectIndex(+e.target.value)}
                  />
                </label>
              </>
            )}
            {qType === 'FILL_BLANK' && (
              <label className="grid gap-1">
                Accepted answers (comma-separated)
                <input
                  className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                  value={blanks}
                  onChange={(e) => setBlanks(e.target.value)}
                />
              </label>
            )}
            <Button
              size="sm"
              disabled={!prompt.trim() || addQ.isPending}
              onClick={() => addQ.mutate()}
            >
              Add question
            </Button>
            <hr className="border-slate-200 dark:border-slate-800" />
            <p className="font-medium">Question bank</p>
            <p className="text-xs text-slate-500">
              Approved items for this course chapter can be linked or auto-sampled into this quiz.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setPickOpen(true)}
              >
                Link from bank…
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs">
                Count
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="w-20 rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                  value={genCount}
                  onChange={(e) => setGenCount(+e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs">
                Difficulty
                <select
                  className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                  value={genDiff}
                  onChange={(e) => setGenDiff(e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={genBank.isPending}
                onClick={() => genBank.mutate()}
              >
                Auto-generate
              </Button>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
              {q.questions
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((qq) => (
                  <li key={qq.id} className="flex justify-between gap-2">
                    <span className="line-clamp-2">
                      [{qq.type}] {qq.prompt}
                    </span>
                    <RemoveQuestionBtn id={qq.id} onDone={onDone} />
                  </li>
                ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select bank entries</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto text-sm">
            {(bankPage?.items ?? []).length === 0 && (
              <p className="text-slate-500">
                No approved questions in this chapter. Add them under Question bank in the sidebar.
              </p>
            )}
            {(bankPage?.items ?? []).map((row) => (
              <label
                key={row.id}
                className="flex cursor-pointer gap-2 rounded border border-slate-200 p-2 dark:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedBank.has(row.id)}
                  onChange={(e) => {
                    setSelectedBank((prev) => {
                      const n = new Set(prev)
                      if (e.target.checked) n.add(row.id)
                      else n.delete(row.id)
                      return n
                    })
                  }}
                />
                <span className="line-clamp-3">
                  <span className="font-mono text-[10px] text-slate-400">
                    {row.type}
                  </span>{' '}
                  {row.questionText.replace(/<[^>]+>/g, ' ')}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPickOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedBank.size || attachBank.isPending}
              onClick={() => attachBank.mutate()}
            >
              Add selected to quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RemoveQuestionBtn({
  id,
  onDone,
}: {
  id: string
  onDone: () => void
}) {
  const del = useMutation({
    mutationFn: () => api.delete(`assessments/questions/${id}`),
    onSuccess: () => {
      toast.success('Question removed')
      onDone()
    },
  })
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 shrink-0 px-1"
      onClick={() => del.mutate()}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}
