import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'

type DraftShape = {
  mcqs: { prompt: string; options: string[]; correctIndex: number }[]
  fillBlanks: { prompt: string; answers: string[] }[]
  descriptives: { prompt: string; rubric?: string }[]
}

type SyncResponse = {
  chunks: number
  chars: number
  lessonsIndexed: number
  sources: { lessonId: string; title: string; type: string; kind: string }[]
}

const MCQ_OPTION_SLOTS = 4

function normalizeIncomingDraft(raw: DraftShape): DraftShape {
  const mcqs = (raw.mcqs ?? []).map((m) => {
    const opts = [...(m.options ?? [])]
    while (opts.length < MCQ_OPTION_SLOTS) opts.push('')
    const correctIndex = Math.min(
      Math.max(0, Math.floor(Number(m.correctIndex) || 0)),
      MCQ_OPTION_SLOTS - 1,
    )
    return {
      prompt: typeof m.prompt === 'string' ? m.prompt : '',
      options: opts.slice(0, MCQ_OPTION_SLOTS),
      correctIndex,
    }
  })
  const fillBlanks = (raw.fillBlanks ?? []).map((f) => ({
    prompt: typeof f.prompt === 'string' ? f.prompt : '',
    answers:
      Array.isArray(f.answers) && f.answers.length
        ? f.answers.map((a) => (typeof a === 'string' ? a : ''))
        : [''],
  }))
  const descriptives = (raw.descriptives ?? []).map((d) => ({
    prompt: typeof d.prompt === 'string' ? d.prompt : '',
    rubric: typeof d.rubric === 'string' ? d.rubric : '',
  }))
  return { mcqs, fillBlanks, descriptives }
}

function sanitizeDraftForCommit(d: DraftShape): DraftShape {
  const mcqs = d.mcqs
    .map((m) => {
      const options = m.options.map((x) => x.trim()).filter(Boolean)
      let correctIndex = Math.min(
        Math.max(0, m.correctIndex),
        Math.max(0, options.length - 1),
      )
      return {
        prompt: m.prompt.trim(),
        options,
        correctIndex,
      }
    })
    .filter((m) => m.prompt.length > 0 && m.options.length >= 2)

  const fillBlanks = d.fillBlanks
    .map((f) => ({
      prompt: f.prompt.trim(),
      answers: f.answers.map((a) => a.trim()).filter(Boolean),
    }))
    .filter((f) => f.prompt.length > 0 && f.answers.length >= 1)

  const descriptives = d.descriptives
    .map((x) => ({
      prompt: x.prompt.trim(),
      rubric: x.rubric?.trim() ? x.rubric.trim() : undefined,
    }))
    .filter((x) => x.prompt.length > 0)

  return { mcqs, fillBlanks, descriptives }
}

function draftSummary(d: DraftShape) {
  const nM = d.mcqs.length
  const nF = d.fillBlanks.length
  const nD = d.descriptives.length
  return `${nM} MCQ${nM === 1 ? '' : 's'}, ${nF} fill-in, ${nD} descriptive`
}

function AssessmentDraftReadOnlyPreview({ draft }: { draft: DraftShape }) {
  return (
    <details
      open
      className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/40"
    >
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200">
        Preview questions (read-only)
      </summary>
      <div className="max-h-[min(420px,55vh)] space-y-4 overflow-y-auto border-t border-slate-200 px-3 py-3 text-sm dark:border-slate-700">
        {draft.mcqs.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
              Multiple choice
            </p>
            <ol className="list-decimal space-y-3 pl-4 text-slate-700 dark:text-slate-300">
              {draft.mcqs.map((m, i) => (
                <li key={`pv-mcq-${i}`} className="space-y-1.5">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {m.prompt || '(No prompt)'}
                  </p>
                  <ul className="list-none space-y-1 pl-0">
                    {m.options.map((opt, j) => {
                      const label = String.fromCharCode(65 + j)
                      const isCorrect = j === m.correctIndex
                      return (
                        <li
                          key={j}
                          className={
                            isCorrect
                              ? 'font-medium text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }
                        >
                          {label}. {opt.trim() || '—'}
                          {isCorrect ? ' (correct)' : ''}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        )}
        {draft.fillBlanks.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
              Fill in the blank
            </p>
            <ol className="list-decimal space-y-3 pl-4 text-slate-700 dark:text-slate-300">
              {draft.fillBlanks.map((f, i) => (
                <li key={`pv-fill-${i}`} className="space-y-1">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {f.prompt || '(No prompt)'}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Acceptable:{' '}
                    {f.answers.filter((a) => a.trim()).join(' · ') || '—'}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
        {draft.descriptives.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Descriptive
            </p>
            <ol className="list-decimal space-y-3 pl-4 text-slate-700 dark:text-slate-300">
              {draft.descriptives.map((d, i) => (
                <li key={`pv-desc-${i}`} className="space-y-1">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {d.prompt || '(No prompt)'}
                  </p>
                  {d.rubric?.trim() ? (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Rubric: {d.rubric}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        )}
        {draft.mcqs.length === 0 &&
          draft.fillBlanks.length === 0 &&
          draft.descriptives.length === 0 && (
            <p className="text-slate-500 dark:text-slate-400">
              No questions in this draft.
            </p>
          )}
      </div>
    </details>
  )
}

function apiErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: unknown } }).response?.data
    if (data && typeof data === 'object' && 'message' in data) {
      const m = (data as { message: unknown }).message
      if (typeof m === 'string') return m
      if (Array.isArray(m)) return m.join(', ')
    }
  }
  return 'Request failed'
}

type DraftEditorModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: DraftShape
  setDraft: Dispatch<SetStateAction<DraftShape | null>>
}

function AssessmentDraftEditorModal({
  open,
  onOpenChange,
  draft,
  setDraft,
}: DraftEditorModalProps) {
  const fieldClass =
    'w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]'

  const updateMcq = (
    i: number,
    patch: Partial<DraftShape['mcqs'][number]>,
  ) => {
    setDraft((d) => {
      if (!d) return d
      const mcqs = [...d.mcqs]
      mcqs[i] = { ...mcqs[i], ...patch }
      return { ...d, mcqs }
    })
  }

  const setMcqOption = (i: number, j: number, value: string) => {
    setDraft((d) => {
      if (!d) return d
      const mcqs = [...d.mcqs]
      const options = [...mcqs[i].options]
      options[j] = value
      mcqs[i] = { ...mcqs[i], options }
      return { ...d, mcqs }
    })
  }

  const removeMcq = (i: number) => {
    setDraft((d) => (d ? { ...d, mcqs: d.mcqs.filter((_, idx) => idx !== i) } : d))
  }

  const addMcq = () => {
    setDraft((d) =>
      d
        ? {
            ...d,
            mcqs: [
              ...d.mcqs,
              {
                prompt: '',
                options: Array(MCQ_OPTION_SLOTS).fill('') as string[],
                correctIndex: 0,
              },
            ],
          }
        : d,
    )
  }

  const updateFill = (
    i: number,
    patch: Partial<DraftShape['fillBlanks'][number]>,
  ) => {
    setDraft((d) => {
      if (!d) return d
      const fillBlanks = [...d.fillBlanks]
      fillBlanks[i] = { ...fillBlanks[i], ...patch }
      return { ...d, fillBlanks }
    })
  }

  const setFillAnswer = (i: number, j: number, value: string) => {
    setDraft((d) => {
      if (!d) return d
      const fillBlanks = [...d.fillBlanks]
      const answers = [...fillBlanks[i].answers]
      answers[j] = value
      fillBlanks[i] = { ...fillBlanks[i], answers }
      return { ...d, fillBlanks }
    })
  }

  const addFillAnswer = (i: number) => {
    setDraft((d) => {
      if (!d) return d
      const fillBlanks = [...d.fillBlanks]
      fillBlanks[i] = {
        ...fillBlanks[i],
        answers: [...fillBlanks[i].answers, ''],
      }
      return { ...d, fillBlanks }
    })
  }

  const removeFillAnswer = (i: number, j: number) => {
    setDraft((d) => {
      if (!d) return d
      const fillBlanks = [...d.fillBlanks]
      const answers = fillBlanks[i].answers.filter((_, idx) => idx !== j)
      fillBlanks[i] = {
        ...fillBlanks[i],
        answers: answers.length ? answers : [''],
      }
      return { ...d, fillBlanks }
    })
  }

  const removeFill = (i: number) => {
    setDraft((d) =>
      d ? { ...d, fillBlanks: d.fillBlanks.filter((_, idx) => idx !== i) } : d,
    )
  }

  const addFill = () => {
    setDraft((d) =>
      d
        ? {
            ...d,
            fillBlanks: [...d.fillBlanks, { prompt: '', answers: [''] }],
          }
        : d,
    )
  }

  const updateDesc = (
    i: number,
    patch: Partial<DraftShape['descriptives'][number]>,
  ) => {
    setDraft((d) => {
      if (!d) return d
      const descriptives = [...d.descriptives]
      descriptives[i] = { ...descriptives[i], ...patch }
      return { ...d, descriptives }
    })
  }

  const removeDesc = (i: number) => {
    setDraft((d) =>
      d
        ? { ...d, descriptives: d.descriptives.filter((_, idx) => idx !== i) }
        : d,
    )
  }

  const addDesc = () => {
    setDraft((d) =>
      d
        ? {
            ...d,
            descriptives: [...d.descriptives, { prompt: '', rubric: '' }],
          }
        : d,
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,880px)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit assessment draft</DialogTitle>
          <DialogDescription>
            Change prompts, choices, acceptable answers, and rubrics. Your edits
            apply immediately; use Save to course on the panel when ready.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 pr-1">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                Multiple choice
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={addMcq}>
                Add MCQ
              </Button>
            </div>
            {draft.mcqs.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No MCQs yet.</p>
            ) : (
              draft.mcqs.map((m, i) => (
                <div
                  key={`mcq-${i}`}
                  className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Label className="text-xs text-[var(--muted)]">
                      Question {i + 1}
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                      onClick={() => removeMcq(i)}
                    >
                      Remove
                    </Button>
                  </div>
                  <textarea
                    className={`${fieldClass} min-h-[72px] resize-y`}
                    value={m.prompt}
                    onChange={(e) => updateMcq(i, { prompt: e.target.value })}
                    placeholder="Question prompt"
                    aria-label={`MCQ ${i + 1} prompt`}
                  />
                  <fieldset className="space-y-2">
                    <legend className="text-xs font-medium text-[var(--muted)]">
                      Options (select correct)
                    </legend>
                    {m.options.map((opt, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`mcq-correct-${i}`}
                          checked={m.correctIndex === j}
                          onChange={() => updateMcq(i, { correctIndex: j })}
                          className="shrink-0"
                          aria-label={`Correct option ${j + 1} for question ${i + 1}`}
                        />
                        <span className="w-5 shrink-0 text-xs text-[var(--muted)]">
                          {String.fromCharCode(65 + j)}.
                        </span>
                        <input
                          type="text"
                          className={fieldClass}
                          value={opt}
                          onChange={(e) => setMcqOption(i, j, e.target.value)}
                          placeholder={`Option ${j + 1}`}
                          aria-label={`MCQ ${i + 1} option ${j + 1}`}
                        />
                      </div>
                    ))}
                  </fieldset>
                </div>
              ))
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                Fill in the blank
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={addFill}>
                Add question
              </Button>
            </div>
            {draft.fillBlanks.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No fill-in-the-blank questions yet.
              </p>
            ) : (
              draft.fillBlanks.map((f, i) => (
                <div
                  key={`fill-${i}`}
                  className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Label className="text-xs text-[var(--muted)]">
                      Fill-in {i + 1}
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                      onClick={() => removeFill(i)}
                    >
                      Remove
                    </Button>
                  </div>
                  <textarea
                    className={`${fieldClass} min-h-[72px] resize-y`}
                    value={f.prompt}
                    onChange={(e) => updateFill(i, { prompt: e.target.value })}
                    placeholder="Use _____ where the blank should appear"
                    aria-label={`Fill-in ${i + 1} prompt`}
                  />
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-[var(--muted)]">
                      Acceptable answers
                    </span>
                    {f.answers.map((ans, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <input
                          type="text"
                          className={fieldClass}
                          value={ans}
                          onChange={(e) => setFillAnswer(i, j, e.target.value)}
                          placeholder={`Answer variant ${j + 1}`}
                          aria-label={`Fill-in ${i + 1} answer ${j + 1}`}
                        />
                        {f.answers.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="shrink-0 text-xs"
                            onClick={() => removeFillAnswer(i, j)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => addFillAnswer(i)}
                    >
                      Add acceptable answer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                Descriptive
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={addDesc}>
                Add question
              </Button>
            </div>
            {draft.descriptives.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No descriptive questions yet.
              </p>
            ) : (
              draft.descriptives.map((q, i) => (
                <div
                  key={`desc-${i}`}
                  className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Label className="text-xs text-[var(--muted)]">
                      Descriptive {i + 1}
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                      onClick={() => removeDesc(i)}
                    >
                      Remove
                    </Button>
                  </div>
                  <textarea
                    className={`${fieldClass} min-h-[72px] resize-y`}
                    value={q.prompt}
                    onChange={(e) => updateDesc(i, { prompt: e.target.value })}
                    placeholder="Question prompt"
                    aria-label={`Descriptive ${i + 1} prompt`}
                  />
                  <div className="grid gap-1">
                    <Label className="text-xs text-[var(--muted)]">
                      Rubric (optional)
                    </Label>
                    <textarea
                      className={`${fieldClass} min-h-[56px] resize-y`}
                      value={q.rubric ?? ''}
                      onChange={(e) =>
                        updateDesc(i, { rubric: e.target.value })
                      }
                      placeholder="How answers will be graded"
                      aria-label={`Descriptive ${i + 1} rubric`}
                    />
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AiAssessmentPanel({ courseId }: { courseId: string }) {
  const qc = useQueryClient()
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(
    'medium',
  )
  const [mcq, setMcq] = useState(5)
  const [fill, setFill] = useState(3)
  const [desc, setDesc] = useState(2)
  const [moduleTitle, setModuleTitle] = useState('AI assessment')
  const [lessonTitle, setLessonTitle] = useState('Generated quiz')
  const [draft, setDraft] = useState<DraftShape | null>(null)
  const [draftModalOpen, setDraftModalOpen] = useState(false)
  const [lastSync, setLastSync] = useState<SyncResponse | null>(null)

  const { data: indexStatus, isLoading: indexLoading } = useQuery({
    queryKey: ['ai', 'course', courseId, 'content-index'],
    queryFn: async () => {
      const { data } = await api.get<{ chunkCount: number }>(
        `ai/courses/${courseId}/content-index`,
      )
      return data
    },
  })

  const syncFromCourse = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<SyncResponse>(
        `ai/courses/${courseId}/content-index/sync`,
        {},
      )
      return data
    },
    onSuccess: (data) => {
      setLastSync(data)
      toast.success(
        `Indexed ${data.lessonsIndexed} lesson(s) → ${data.chunks} chunks`,
      )
      void qc.invalidateQueries({
        queryKey: ['ai', 'course', courseId, 'content-index'],
      })
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err)),
  })

  const preview = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ draft: DraftShape }>(
        `ai/courses/${courseId}/preview-assessment`,
        { difficulty, mcq, fill, descriptive: desc },
      )
      return data
    },
    onSuccess: (payload) => {
      const raw = payload?.draft
      if (!raw || typeof raw !== 'object') {
        toast.error('Preview response did not include a draft.')
        return
      }
      setDraft(normalizeIncomingDraft(raw as DraftShape))
      setDraftModalOpen(true)
      toast.success(
        'Draft ready — review below and use Edit draft for changes.',
      )
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err)),
  })

  const commit = useMutation({
    mutationFn: async () => {
      if (!draft) {
        toast.error('No draft to save.')
        throw new Error('no_draft')
      }
      const parsed = sanitizeDraftForCommit(draft)
      if (
        parsed.mcqs.length + parsed.fillBlanks.length + parsed.descriptives.length ===
        0
      ) {
        toast.error(
          'Nothing valid to save. Each MCQ needs a prompt and at least 2 options; fill-ins need a prompt and at least one answer; descriptives need a prompt.',
        )
        throw new Error('empty_draft')
      }
      const { data } = await api.post(
        `ai/courses/${courseId}/commit-assessment`,
        {
          difficulty,
          moduleTitle,
          lessonTitle,
          mcqs: parsed.mcqs,
          fillBlanks: parsed.fillBlanks,
          descriptives: parsed.descriptives,
        },
      )
      return data
    },
    onSuccess: () => {
      toast.success('Assessment saved to course')
      setDraft(null)
      setDraftModalOpen(false)
      void qc.invalidateQueries({ queryKey: ['course', courseId] })
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === 'no_draft') return
      if (err instanceof Error && err.message === 'empty_draft') return
      toast.error(apiErrorMessage(err))
    },
  })

  return (
    <Card className="border-violet-200 dark:border-violet-900">
      <CardHeader>
        <CardTitle className="text-base">AI assessment (from this course)</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Build the index from lessons you already added—video and document
          modules, lesson notes, and PDF or text files attached to lessons. No
          need to upload the course again. Sync after you change structure or
          files, then generate a draft quiz.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50">
          {indexLoading ? (
            <span className="text-slate-500">Checking index…</span>
          ) : (
            <span className="text-slate-700 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-white">
                {indexStatus?.chunkCount ?? 0}
              </span>{' '}
              indexed chunk{indexStatus?.chunkCount === 1 ? '' : 's'} in memory
              {lastSync
                ? ` · last sync: ${lastSync.lessonsIndexed} lessons, ${lastSync.chars.toLocaleString()} characters`
                : ''}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={syncFromCourse.isPending}
            onClick={() => syncFromCourse.mutate()}
          >
            {syncFromCourse.isPending
              ? 'Syncing from course…'
              : 'Sync from course'}
          </Button>
        </div>

        {lastSync && lastSync.sources.length > 0 && (
          <details className="rounded-lg border border-slate-200 text-sm dark:border-slate-700">
            <summary className="cursor-pointer px-3 py-2 font-medium text-slate-700 dark:text-slate-300">
              What was indexed ({lastSync.sources.length} lessons)
            </summary>
            <div className="max-h-40 overflow-auto border-t border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Lesson</th>
                    <th className="px-2 py-1.5 font-medium">Type</th>
                    <th className="px-2 py-1.5 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {lastSync.sources.map((s) => (
                    <tr
                      key={s.lessonId}
                      className="border-t border-slate-100 dark:border-slate-800"
                    >
                      <td className="px-2 py-1.5">{s.title}</td>
                      <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">
                        {s.type}
                      </td>
                      <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">
                        {s.kind.replace(/_/g, ' ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <label className="flex items-center gap-1 text-sm">
            Difficulty
            <select
              className="rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as typeof difficulty)
              }
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </label>
          <label className="flex items-center gap-1 text-sm">
            MCQ
            <input
              type="number"
              min={0}
              className="w-14 rounded border px-1 dark:border-slate-700 dark:bg-slate-950"
              value={mcq}
              onChange={(e) => setMcq(+e.target.value)}
            />
          </label>
          <label className="flex items-center gap-1 text-sm">
            Fill
            <input
              type="number"
              min={0}
              className="w-14 rounded border px-1 dark:border-slate-700 dark:bg-slate-950"
              value={fill}
              onChange={(e) => setFill(+e.target.value)}
            />
          </label>
          <label className="flex items-center gap-1 text-sm">
            Desc
            <input
              type="number"
              min={0}
              className="w-14 rounded border px-1 dark:border-slate-700 dark:bg-slate-950"
              value={desc}
              onChange={(e) => setDesc(+e.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs">
            Module title
            <input
              className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs">
            Lesson title
            <input
              className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={preview.isPending || (indexStatus?.chunkCount ?? 0) < 1}
            onClick={() => preview.mutate()}
          >
            {preview.isPending ? 'Generating…' : 'Generate draft'}
          </Button>
          {(indexStatus?.chunkCount ?? 0) < 1 && (
            <span className="text-xs text-amber-700 dark:text-amber-300">
              Sync from course first.
            </span>
          )}
        </div>
        {draft && (
          <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Draft loaded:
              </span>{' '}
              {draftSummary(draft)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => setDraftModalOpen(true)}
              >
                Edit draft
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={commit.isPending}
                onClick={() => commit.mutate()}
              >
                {commit.isPending ? 'Saving…' : 'Save to course'}
              </Button>
            </div>
            <AssessmentDraftReadOnlyPreview draft={draft} />
          </div>
        )}

        {draft && (
          <AssessmentDraftEditorModal
            open={draftModalOpen}
            onOpenChange={setDraftModalOpen}
            draft={draft}
            setDraft={setDraft}
          />
        )}
      </CardContent>
    </Card>
  )
}
