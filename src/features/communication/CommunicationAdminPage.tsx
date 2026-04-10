import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Skeleton } from '../../components/ui/Skeleton'

type TestRow = {
  id: string
  title: string
  published: boolean
  _count: { questions: number }
  poolCounts?: { ESSAY: number; LISTENING: number; SPEAKING: number }
}

export function CommunicationAdminPage() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [testId, setTestId] = useState('')
  const [qType, setQType] = useState<'ESSAY' | 'LISTENING' | 'SPEAKING'>(
    'ESSAY',
  )
  const [prompt, setPrompt] = useState('')
  const [expected, setExpected] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [listenFile, setListenFile] = useState<File | null>(null)
  const [audioMediaId, setAudioMediaId] = useState<string | null>(null)
  const [listenPrepHint, setListenPrepHint] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['communication', 'tests', 'staff'],
    queryFn: async () => {
      const { data } = await api.get<TestRow[]>('communication/tests')
      return data
    },
  })

  const selected = useMemo(
    () => data?.find((t) => t.id === testId),
    [data, testId],
  )

  const poolsReady =
    selected &&
    (selected.poolCounts?.ESSAY ?? 0) > 0 &&
    (selected.poolCounts?.LISTENING ?? 0) > 0 &&
    (selected.poolCounts?.SPEAKING ?? 0) > 0

  const createMut = useMutation({
    mutationFn: () =>
      api.post('communication/tests', {
        title: title.trim(),
        description: desc.trim() || undefined,
        published: false,
      }),
    onSuccess: () => {
      toast.success('Test created (draft)')
      setTitle('')
      setDesc('')
      void qc.invalidateQueries({ queryKey: ['communication'] })
    },
  })

  const publishMut = useMutation({
    mutationFn: (id: string) =>
      api.patch(`communication/tests/${id}`, { published: true }),
    onSuccess: () => {
      toast.success('Published — learners can start attempts')
      void qc.invalidateQueries({ queryKey: ['communication'] })
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message ?? 'Publish failed')
    },
  })

  const unpublishMut = useMutation({
    mutationFn: (id: string) =>
      api.patch(`communication/tests/${id}`, { published: false }),
    onSuccess: () => {
      toast.success('Unpublished')
      void qc.invalidateQueries({ queryKey: ['communication'] })
    },
  })

  const prepareListenMut = useMutation({
    mutationFn: async () => {
      if (!testId || !listenFile) throw new Error('Choose an audio file first')
      const fd = new FormData()
      fd.append('file', listenFile)
      const token = useAuthStore.getState().accessToken
      const res = await fetch(
        `/api/v1/communication/tests/${testId}/listening/prepare`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        },
      )
      const data = (await res.json()) as {
        transcript?: string
        mediaId?: string | null
        uploadError?: string
        message?: string | string[]
      }
      if (!res.ok) {
        const msg = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message
        throw new Error(msg || 'Transcription failed')
      }
      return data
    },
    onSuccess: (data) => {
      if (data.transcript) setExpected(data.transcript)
      setAudioMediaId(data.mediaId ?? null)
      if (data.uploadError) {
        setListenPrepHint(data.uploadError)
        toast.message('Transcript ready', {
          description:
            'Audio was not stored on the server — add an audio URL or configure AWS.',
        })
      } else {
        setListenPrepHint(null)
        toast.success(
          data.mediaId
            ? 'Audio stored and reference text filled from transcription'
            : 'Reference text updated from transcription',
        )
      }
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Transcription failed')
    },
  })

  const addQMut = useMutation({
    mutationFn: () =>
      api.post(`communication/tests/${testId}/questions`, {
        type: qType,
        prompt: prompt.trim(),
        expectedText:
          qType === 'LISTENING' ? expected.trim() || undefined : undefined,
        topic: qType === 'SPEAKING' ? topic.trim() || undefined : undefined,
        difficulty: difficulty.trim() || undefined,
        audioUrl: qType === 'LISTENING' ? audioUrl.trim() || undefined : undefined,
        audioMediaId:
          qType === 'LISTENING' && audioMediaId ? audioMediaId : undefined,
      }),
    onSuccess: () => {
      toast.success('Question added to pool')
      setPrompt('')
      setExpected('')
      setTopic('')
      setDifficulty('')
      setAudioUrl('')
      setListenFile(null)
      setAudioMediaId(null)
      setListenPrepHint(null)
      void qc.invalidateQueries({ queryKey: ['communication'] })
    },
  })

  const listeningAudioReady =
    qType !== 'LISTENING' ||
    !!audioUrl.trim() ||
    !!audioMediaId

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1>Communication tests</h1>
          <p>
            Build pools of essay, listening, and speaking items. Each learner
            attempt randomly draws exactly one of each type.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/communication">Learner view</Link>
        </Button>
      </div>

      <CommunicationOrgBankPanel />

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data?.length ? (
        <div className="lms-card text-center text-slate-500 dark:text-slate-400">
          No tests yet. Create one below.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((t) => (
            <li key={t.id} className="lms-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {t.title}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Pools — Essay: {t.poolCounts?.ESSAY ?? 0}, Listening:{' '}
                  {t.poolCounts?.LISTENING ?? 0}, Speaking:{' '}
                  {t.poolCounts?.SPEAKING ?? 0} ·{' '}
                  {t.published ? (
                    <span className="text-indigo-600 dark:text-indigo-400">
                      published
                    </span>
                  ) : (
                    'draft'
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {t.published ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={unpublishMut.isPending}
                    onClick={() => unpublishMut.mutate(t.id)}
                  >
                    Unpublish
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      publishMut.isPending ||
                      !(
                        (t.poolCounts?.ESSAY ?? 0) > 0 &&
                        (t.poolCounts?.LISTENING ?? 0) > 0 &&
                        (t.poolCounts?.SPEAKING ?? 0) > 0
                      )
                    }
                    onClick={() => publishMut.mutate(t.id)}
                  >
                    Publish
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="lms-card space-y-4">
        <h2>New test</h2>
        <div className="space-y-1">
          <Label htmlFor="ct-title">Title</Label>
          <input
            id="ct-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="lms-input"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ct-desc">Description</Label>
          <input
            id="ct-desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="lms-input"
          />
        </div>
        <Button
          type="button"
          disabled={createMut.isPending || !title.trim()}
          onClick={() => createMut.mutate()}
        >
          Create draft
        </Button>
      </div>

      <div className="lms-card space-y-4">
        <h2>Add question to pool</h2>
        <div className="space-y-1">
          <Label htmlFor="ct-test">Test</Label>
          <select
            id="ct-test"
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            className="lms-input"
          >
            <option value="">Select test…</option>
            {data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ct-type">Type</Label>
          <select
            id="ct-type"
            value={qType}
            onChange={(e) => {
              const v = e.target.value as 'ESSAY' | 'LISTENING' | 'SPEAKING'
              setQType(v)
              if (v !== 'LISTENING') {
                setListenFile(null)
                setAudioMediaId(null)
                setListenPrepHint(null)
              }
            }}
            className="lms-input"
          >
            <option value="ESSAY">Essay (multiple prompts allowed)</option>
            <option value="LISTENING">
              Listening (upload or URL + reference text)
            </option>
            <option value="SPEAKING">Speaking (topic / prompt)</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ct-prompt">Prompt / passage</Label>
          <textarea
            id="ct-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="lms-input min-h-[100px] py-3"
          />
        </div>
        {qType === 'LISTENING' && (
          <>
            <div className="space-y-2 rounded-lg border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/20">
              <Label htmlFor="ct-audio-file">Audio file</Label>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Upload a clip; the server transcribes it with Whisper and fills
                the reference text. The file is stored when S3 is configured.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="ct-audio-file"
                  type="file"
                  accept="audio/*,.webm,video/webm"
                  className="max-w-full text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setListenFile(f)
                    setListenPrepHint(null)
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={
                    prepareListenMut.isPending || !testId || !listenFile
                  }
                  onClick={() => void prepareListenMut.mutate()}
                >
                  {prepareListenMut.isPending
                    ? 'Transcribing…'
                    : 'Transcribe & attach'}
                </Button>
              </div>
              {audioMediaId && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Uploaded clip linked (ID {audioMediaId.slice(0, 8)}…). Learners
                  get a signed play URL during the test.
                </p>
              )}
              {listenPrepHint && (
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {listenPrepHint}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ct-exp">
                Reference / canonical text (for AI scoring — edit after
                transcription)
              </Label>
              <textarea
                id="ct-exp"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                className="lms-input min-h-[80px] py-3"
                placeholder="Filled automatically when you transcribe, or type/paste…"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ct-audio">Or: external audio URL</Label>
              <input
                id="ct-audio"
                value={audioUrl}
                onChange={(e) => {
                  setAudioUrl(e.target.value)
                  if (e.target.value.trim()) setAudioMediaId(null)
                }}
                className="lms-input"
                placeholder="https://… (optional if you uploaded above)"
              />
            </div>
          </>
        )}
        {qType === 'SPEAKING' && (
          <div className="space-y-1">
            <Label htmlFor="ct-topic">Topic hint</Label>
            <input
              id="ct-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="lms-input"
            />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="ct-diff">Difficulty (optional)</Label>
          <input
            id="ct-diff"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="lms-input"
            placeholder="easy, medium, hard…"
          />
        </div>
        <Button
          type="button"
          disabled={
            addQMut.isPending ||
            !testId ||
            !prompt.trim() ||
            (qType === 'LISTENING' && !listeningAudioReady)
          }
          onClick={() => addQMut.mutate()}
        >
          Add to pool
        </Button>
        {qType === 'LISTENING' && !listeningAudioReady && testId && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Transcribe an uploaded file (with storage) or enter an audio URL
            before adding.
          </p>
        )}
        {selected && !poolsReady && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Add at least one question per type (Essay, Listening, Speaking)
            before publishing.
          </p>
        )}
      </div>
    </motion.div>
  )
}

function CommunicationOrgBankPanel() {
  const qc = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')
  const [bqType, setBqType] = useState<'ESSAY' | 'LISTENING' | 'SPEAKING'>('ESSAY')
  const [bprompt, setBprompt] = useState('')
  const [bexpected, setBexpected] = useState('')
  const [btopic, setBtopic] = useState('')
  const [bdiff, setBdiff] = useState('')
  const [baudioUrl, setBaudioUrl] = useState('')
  const [baudioMediaId, setBaudioMediaId] = useState<string | null>(null)
  const [blistenFile, setBlistenFile] = useState<File | null>(null)

  const { data: bankRows, isLoading } = useQuery({
    queryKey: ['communication', 'bank', typeFilter],
    queryFn: async () => {
      const { data } = await api.get<
        {
          id: string
          type: string
          prompt: string
          difficulty: string | null
        }[]
      >('communication/bank/questions', {
        params: typeFilter ? { type: typeFilter } : {},
      })
      return data
    },
  })

  const prepareBankMut = useMutation({
    mutationFn: async () => {
      if (!blistenFile) throw new Error('Choose audio')
      const fd = new FormData()
      fd.append('file', blistenFile)
      const token = useAuthStore.getState().accessToken
      const res = await fetch('/api/v1/communication/bank/listening/prepare', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      const data = (await res.json()) as {
        transcript?: string
        mediaId?: string | null
        uploadError?: string
        message?: string | string[]
      }
      if (!res.ok) {
        const msg = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message
        throw new Error(msg || 'Prepare failed')
      }
      return data
    },
    onSuccess: (data) => {
      if (data.transcript) setBexpected(data.transcript)
      setBaudioMediaId(data.mediaId ?? null)
      toast.success(data.mediaId ? 'Audio stored' : 'Transcript only')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const addBankMut = useMutation({
    mutationFn: () =>
      api.post('communication/bank/questions', {
        type: bqType,
        prompt: bprompt.trim(),
        expectedText:
          bqType === 'LISTENING' ? bexpected.trim() || undefined : undefined,
        topic: bqType === 'SPEAKING' ? btopic.trim() || undefined : undefined,
        difficulty: bdiff.trim() || undefined,
        audioUrl: bqType === 'LISTENING' ? baudioUrl.trim() || undefined : undefined,
        audioMediaId:
          bqType === 'LISTENING' && baudioMediaId ? baudioMediaId : undefined,
      }),
    onSuccess: () => {
      toast.success('Added to organization pool')
      setBprompt('')
      setBexpected('')
      setBtopic('')
      setBdiff('')
      setBaudioUrl('')
      setBlistenFile(null)
      setBaudioMediaId(null)
      void qc.invalidateQueries({ queryKey: ['communication', 'bank'] })
    },
    onError: () => toast.error('Add failed'),
  })

  const delBankMut = useMutation({
    mutationFn: (id: string) => api.delete(`communication/bank/questions/${id}`),
    onSuccess: () => {
      toast.success('Removed')
      void qc.invalidateQueries({ queryKey: ['communication', 'bank'] })
    },
  })

  const bankListenReady =
    bqType !== 'LISTENING' ||
    !!baudioUrl.trim() ||
    !!baudioMediaId

  return (
    <div className="lms-card space-y-4">
      <h2>Organization communication pool</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Shared across tests in your organization. Each test still needs Essay,
        Listening, and Speaking available in the combined pool (test-specific +
        org-wide) to publish.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label>Filter type</Label>
          <select
            className="lms-input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="ESSAY">Essay</option>
            <option value="LISTENING">Listening</option>
            <option value="SPEAKING">Speaking</option>
          </select>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
          {(bankRows ?? []).map((r) => (
            <li
              key={r.id}
              className="flex items-start justify-between gap-2 rounded border border-slate-200 p-2 dark:border-slate-700"
            >
              <div>
                <span className="font-mono text-xs text-slate-400">{r.type}</span>
                <p className="line-clamp-2 text-slate-800 dark:text-slate-100">
                  {r.prompt}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-red-600"
                onClick={() => {
                  if (confirm('Remove from org pool?')) delBankMut.mutate(r.id)
                }}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
      <hr className="border-slate-200 dark:border-slate-700" />
      <h3 className="text-sm font-semibold">Add to organization pool</h3>
      <div className="space-y-1">
        <Label>Type</Label>
        <select
          className="lms-input"
          value={bqType}
          onChange={(e) =>
            setBqType(e.target.value as typeof bqType)
          }
        >
          <option value="ESSAY">Essay</option>
          <option value="LISTENING">Listening</option>
          <option value="SPEAKING">Speaking</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label>Prompt</Label>
        <textarea
          className="lms-input min-h-[4rem]"
          value={bprompt}
          onChange={(e) => setBprompt(e.target.value)}
        />
      </div>
      {bqType === 'LISTENING' && (
        <>
          <div className="space-y-1">
            <Label>Upload audio</Label>
            <input
              type="file"
              accept="audio/*,video/webm"
              onChange={(e) => setBlistenFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!blistenFile || prepareBankMut.isPending}
              onClick={() => prepareBankMut.mutate()}
            >
              Transcribe &amp; store
            </Button>
          </div>
          <div className="space-y-1">
            <Label>Expected / reference text</Label>
            <textarea
              className="lms-input min-h-[3rem]"
              value={bexpected}
              onChange={(e) => setBexpected(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Audio URL (optional)</Label>
            <input
              className="lms-input"
              value={baudioUrl}
              onChange={(e) => setBaudioUrl(e.target.value)}
            />
          </div>
        </>
      )}
      {bqType === 'SPEAKING' && (
        <div className="space-y-1">
          <Label>Topic hint</Label>
          <input
            className="lms-input"
            value={btopic}
            onChange={(e) => setBtopic(e.target.value)}
          />
        </div>
      )}
      <div className="space-y-1">
        <Label>Difficulty</Label>
        <input
          className="lms-input"
          value={bdiff}
          onChange={(e) => setBdiff(e.target.value)}
          placeholder="easy, medium, hard"
        />
      </div>
      <Button
        type="button"
        disabled={
          addBankMut.isPending ||
          !bprompt.trim() ||
          (bqType === 'LISTENING' && !bankListenReady)
        }
        onClick={() => addBankMut.mutate()}
      >
        Add to org pool
      </Button>
    </div>
  )
}
