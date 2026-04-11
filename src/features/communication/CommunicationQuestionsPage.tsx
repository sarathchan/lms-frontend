import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { apiErrorMessage } from '../../lib/apiErrorMessage'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { cn } from '../../lib/utils'
import { CommunicationStaffNav } from './CommunicationStaffNav'
import { Loader2, Pencil, Trash2 } from 'lucide-react'

type CommType = 'ESSAY' | 'LISTENING' | 'SPEAKING'

type BankQuestion = {
  id: string
  type: string
  prompt: string
  expectedText: string | null
  topic: string | null
  difficulty: string | null
  audioUrl: string | null
  audioMediaId: string | null
}

const fieldInput =
  'lms-input mt-1 w-full rounded-lg px-3 py-2 text-sm shadow-none font-sans'

type CommDifficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTY_OPTIONS: { value: CommDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

function difficultyBadgeClass(value: string | null | undefined): string {
  const v = (value ?? '').toLowerCase()
  if (v === 'easy')
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/45 dark:text-emerald-200'
  if (v === 'hard')
    return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
  return 'bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-100'
}

function normalizeBankDifficulty(raw: string | null | undefined): CommDifficulty {
  const v = (raw ?? '').toLowerCase()
  if (v === 'easy' || v === 'medium' || v === 'hard') return v
  return 'medium'
}

function DifficultyBadge({ value }: { value: string | null | undefined }) {
  if (!value?.trim()) return null
  const label = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        difficultyBadgeClass(value),
      )}
    >
      {label}
    </span>
  )
}

export function CommunicationQuestionsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<CommType>('ESSAY')
  const [prompt, setPrompt] = useState('')
  const [difficulty, setDifficulty] = useState<CommDifficulty | ''>('')
  const [topic, setTopic] = useState('')
  const [expectedText, setExpectedText] = useState('')
  const [audioMediaId, setAudioMediaId] = useState<string | null>(null)
  const [listenFile, setListenFile] = useState<File | null>(null)
  const [ttsPreviewUrl, setTtsPreviewUrl] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<BankQuestion | null>(null)

  const { data: questions, isLoading } = useQuery({
    queryKey: ['communication', 'bank', tab],
    queryFn: async () => {
      const { data } = await api.get<BankQuestion[]>('communication/bank/questions', {
        params: { type: tab },
      })
      return data
    },
  })

  const prepareListenMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post<{
        transcript: string
        mediaId: string | null
        uploadError?: string
      }>('communication/bank/listening/prepare', fd)
      return data
    },
    onSuccess: (d) => {
      setAudioMediaId(d.mediaId)
      setTtsPreviewUrl(null)
      if (d.transcript && !expectedText.trim()) setExpectedText(d.transcript)
      if (d.uploadError) toast.message('Audio note', { description: d.uploadError })
      else toast.success('Audio processed')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not process audio')),
  })

  const generateAudioMut = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post<{ audioUrl: string; mediaId: string }>(
        'communication/generate-audio',
        { text },
      )
      return data
    },
    onSuccess: (d) => {
      setAudioMediaId(d.mediaId)
      setTtsPreviewUrl(d.audioUrl)
      toast.success('Audio generated')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not generate audio')),
  })

  const addMut = useMutation({
    mutationFn: async () => {
      const type = tab
      const body: Record<string, unknown> = {
        type,
        prompt: prompt.trim(),
        difficulty,
      }
      if (type === 'SPEAKING') body.topic = topic.trim() || undefined
      if (type === 'LISTENING') {
        body.expectedText = expectedText.trim() || undefined
        if (audioMediaId) body.audioMediaId = audioMediaId
      }
      const { data } = await api.post<BankQuestion>('communication/bank/questions', body)
      return data
    },
    onSuccess: () => {
      toast.success('Question saved')
      setPrompt('')
      setDifficulty('')
      setTopic('')
      setExpectedText('')
      setAudioMediaId(null)
      setListenFile(null)
      setTtsPreviewUrl(null)
      void qc.invalidateQueries({ queryKey: ['communication'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not save question')),
  })

  const patchMut = useMutation({
    mutationFn: async () => {
      if (!editRow) return
      await api.patch(`communication/bank/questions/${editRow.id}`, {
        prompt: editRow.prompt,
        expectedText: editRow.expectedText ?? undefined,
        topic: editRow.topic ?? undefined,
        difficulty: editRow.difficulty ?? undefined,
      })
    },
    onSuccess: () => {
      toast.success('Question updated')
      setEditRow(null)
      void qc.invalidateQueries({ queryKey: ['communication'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not update')),
  })

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`communication/bank/questions/${id}`)
    },
    onSuccess: () => {
      toast.success('Question removed')
      void qc.invalidateQueries({ queryKey: ['communication'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not delete')),
  })

  const canAdd =
    prompt.trim().length >= 3 &&
    difficulty !== '' &&
    (tab !== 'LISTENING' ||
      !!audioMediaId ||
      expectedText.trim().length > 0) &&
    !addMut.isPending

  const isPreparingAudio =
    prepareListenMut.isPending || generateAudioMut.isPending

  const canPrepareListeningAudio = !!(listenFile || expectedText.trim())

  function prepareListeningAudio() {
    if (listenFile) {
      prepareListenMut.mutate(listenFile)
      return
    }
    const t = expectedText.trim()
    if (!t) {
      toast.message('Nothing to prepare', {
        description: 'Enter reference text to generate audio, or choose a file to upload.',
      })
      return
    }
    generateAudioMut.mutate(t)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl space-y-8"
    >
      <CommunicationStaffNav />
      <div>
        <h1>Question pool</h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
          Build your organization&apos;s communication bank. Import these into a
          test from Test management.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as CommType)
          setAudioMediaId(null)
          setListenFile(null)
          setTtsPreviewUrl(null)
        }}
        className="w-full"
      >
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="ESSAY">Essay</TabsTrigger>
          <TabsTrigger value="LISTENING">Listening</TabsTrigger>
          <TabsTrigger value="SPEAKING">Speaking</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6 space-y-6">
          <div className="lms-card space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Add question
            </h2>
            <div>
              <Label htmlFor="cq-prompt">Prompt</Label>
              <textarea
                id="cq-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className={cn(fieldInput, 'min-h-[100px] resize-y')}
                placeholder={
                  tab === 'LISTENING'
                    ? 'Short context shown while learners listen…'
                    : 'What should the learner address?'
                }
              />
            </div>
            <div>
              <Label htmlFor="cq-diff">Difficulty</Label>
              <select
                id="cq-diff"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty((e.target.value || '') as CommDifficulty | '')
                }
                className={fieldInput}
              >
                <option value="" disabled>
                  Select difficulty
                </option>
                {DIFFICULTY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {tab === 'SPEAKING' && (
              <div>
                <Label htmlFor="cq-topic">Topic (optional)</Label>
                <input
                  id="cq-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={fieldInput}
                  placeholder="Speaking theme"
                />
              </div>
            )}
            {tab === 'LISTENING' && (
              <>
                <div>
                  <Label htmlFor="cq-exp">Reference / expected text</Label>
                  <textarea
                    id="cq-exp"
                    value={expectedText}
                    onChange={(e) => {
                      setExpectedText(e.target.value)
                      setTtsPreviewUrl(null)
                    }}
                    className={cn(fieldInput, 'min-h-[80px] resize-y')}
                    placeholder="Script for generated audio and/or listening evaluation; prefilled from upload transcript when possible."
                  />
                </div>
                <div>
                  <Label htmlFor="cq-audio">Or upload an audio file</Label>
                  <input
                    id="cq-audio"
                    type="file"
                    accept="audio/*,.webm,.ogg"
                    className="mt-1 block w-full text-sm"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      setListenFile(f)
                      setAudioMediaId(null)
                      setTtsPreviewUrl(null)
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2 inline-flex items-center gap-2"
                    disabled={!canPrepareListeningAudio || isPreparingAudio}
                    onClick={() => prepareListeningAudio()}
                  >
                    {isPreparingAudio ? (
                      <>
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        Preparing…
                      </>
                    ) : (
                      'Upload & prepare audio'
                    )}
                  </Button>
                  {audioMediaId && (
                    <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                      Audio linked — ready to save.
                    </p>
                  )}
                  {ttsPreviewUrl && (
                    <div className="mt-4 space-y-2">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">
                        Preview
                      </Label>
                      <audio controls className="w-full max-w-md rounded-lg" src={ttsPreviewUrl} />
                    </div>
                  )}
                </div>
              </>
            )}
            <Button type="button" disabled={!canAdd} onClick={() => addMut.mutate()}>
              {addMut.isPending ? 'Saving…' : 'Add question'}
            </Button>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Pool list</h2>
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            )}
            {!isLoading && (!questions || questions.length === 0) && (
              <p className="text-slate-600 dark:text-slate-400">
                No {tab.toLowerCase()} questions yet.
              </p>
            )}
            {!isLoading && questions && questions.length > 0 && (
              <ul className="space-y-3">
                {questions.map((q) => (
                  <li key={q.id} className="lms-card flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        {q.type}
                      </p>
                      <p className="line-clamp-3 text-sm text-slate-800 dark:text-slate-200">
                        {q.prompt}
                      </p>
                      {q.difficulty && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-slate-500">Difficulty:</span>
                          <DifficultyBadge value={q.difficulty} />
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditRow({
                            ...q,
                            difficulty: normalizeBankDifficulty(q.difficulty),
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                        disabled={delMut.isPending}
                        onClick={() => {
                          if (confirm('Delete this question from the pool?')) {
                            delMut.mutate(q.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit question</DialogTitle>
          </DialogHeader>
          {editRow && (
            <div className="space-y-3">
              <div>
                <Label>Prompt</Label>
                <textarea
                  value={editRow.prompt}
                  onChange={(e) => setEditRow({ ...editRow, prompt: e.target.value })}
                  className={cn(fieldInput, 'min-h-[120px] resize-y')}
                />
              </div>
              <div>
                <Label>Difficulty</Label>
                <select
                  value={normalizeBankDifficulty(editRow.difficulty)}
                  onChange={(e) =>
                    setEditRow({
                      ...editRow,
                      difficulty: e.target.value as CommDifficulty,
                    })
                  }
                  className={fieldInput}
                >
                  {DIFFICULTY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {(editRow.type === 'LISTENING' || editRow.type === 'SPEAKING') && (
                <div>
                  <Label>
                    {editRow.type === 'LISTENING' ? 'Expected text' : 'Topic'}
                  </Label>
                  <textarea
                    value={
                      (editRow.type === 'LISTENING'
                        ? editRow.expectedText
                        : editRow.topic) ?? ''
                    }
                    onChange={(e) =>
                      editRow.type === 'LISTENING'
                        ? setEditRow({ ...editRow, expectedText: e.target.value })
                        : setEditRow({ ...editRow, topic: e.target.value })
                    }
                    className={cn(fieldInput, 'min-h-[80px] resize-y')}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button disabled={patchMut.isPending} onClick={() => patchMut.mutate()}>
              {patchMut.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
