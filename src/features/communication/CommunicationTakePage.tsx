import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'
import { Focus, Headphones, Mic, PenLine } from 'lucide-react'

type Preview = {
  id: string
  title: string
  description: string | null
  poolCounts: { ESSAY: number; LISTENING: number; SPEAKING: number }
  instructions: string[]
}

type SessionQ = {
  id: string
  type: string
  prompt: string
  topic: string | null
  audioUrl: string | null
  expectedText: string | null
}

type Session = {
  attemptId: string
  testTitle: string
  currentSection: number
  sectionsTotal: number
  sectionLabels: string[]
  question: SessionQ
  draft: {
    questionId: string
    essayHtml?: string
    listeningText?: string
    speakingTranscript?: string
  }
  responsesSnapshot: Resp[]
}

type Resp = {
  questionId: string
  essayHtml?: string
  listeningText?: string
  speakingTranscript?: string
}

function storageKey(testId: string) {
  return `mylms-comm-attempt:${testId}`
}

export function CommunicationTakePage() {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [localDraft, setLocalDraft] = useState<Partial<Resp>>({})
  const [recording, setRecording] = useState(false)
  const [essayFocus, setEssayFocus] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const essayWordCount = useMemo(() => {
    const t = (localDraft.essayHtml ?? '').trim()
    if (!t) return 0
    return t.split(/\s+/).filter(Boolean).length
  }, [localDraft.essayHtml])

  useEffect(() => {
    if (!testId) return
    try {
      const s = sessionStorage.getItem(storageKey(testId))
      if (s) setAttemptId(s)
    } catch {
      /* ignore */
    }
  }, [testId])

  const { data: preview, isLoading: prevLoading } = useQuery({
    queryKey: ['communication', 'preview', testId],
    queryFn: async () => {
      const { data } = await api.get<Preview>(
        `communication/tests/${testId}/preview`,
      )
      return data
    },
    enabled: !!testId,
  })

  const { data: session, isLoading: sessLoading } = useQuery({
    queryKey: ['communication', 'session', attemptId],
    queryFn: async () => {
      const { data } = await api.get<Session>(
        `communication/attempts/${attemptId}/session`,
      )
      return data
    },
    enabled: !!attemptId,
  })

  useEffect(() => {
    if (!session?.question) return
    const q = session.question
    const r =
      session.responsesSnapshot?.find((x) => x.questionId === q.id) ??
      session.draft
    setLocalDraft({
      questionId: q.id,
      essayHtml: r.essayHtml,
      listeningText: r.listeningText,
      speakingTranscript: r.speakingTranscript,
    })
  }, [session?.question.id, session?.currentSection])

  const mergePayload = useCallback((): Resp[] => {
    if (!session) return []
    if (!session.responsesSnapshot?.length) {
      return [
        {
          questionId: session.question.id,
          ...localDraft,
        } as Resp,
      ]
    }
    const map = new Map(
      session.responsesSnapshot.map((r) => [r.questionId, { ...r }]),
    )
    const qid = session.question.id
    const cur = map.get(qid) ?? { questionId: qid }
    map.set(qid, {
      ...cur,
      ...localDraft,
      questionId: qid,
    })
    return [...map.values()]
  }, [session, localDraft])

  const saveMut = useMutation({
    mutationFn: async (responses: Resp[]) => {
      await api.patch(`communication/attempts/${attemptId}`, { responses })
    },
  })

  useEffect(() => {
    if (!attemptId || !session?.responsesSnapshot) return
    const t = setTimeout(() => {
      void saveMut.mutate(mergePayload())
    }, 1000)
    return () => clearTimeout(t)
  }, [
    localDraft.essayHtml,
    localDraft.listeningText,
    localDraft.speakingTranscript,
    attemptId,
    session?.question?.id,
    mergePayload,
  ])

  const startMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ id: string }>(
        `communication/tests/${testId}/attempts`,
      )
      return data
    },
    onSuccess: (d) => {
      setAttemptId(d.id)
      try {
        if (testId) sessionStorage.setItem(storageKey(testId), d.id)
      } catch {
        /* ignore */
      }
      toast.success('Attempt started. One random question per section.')
      void qc.invalidateQueries({ queryKey: ['communication', 'session'] })
    },
  })

  const advanceMut = useMutation({
    mutationFn: async () => {
      await api.post(`communication/attempts/${attemptId}/advance`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['communication', 'session'] })
      toast.success('Section saved')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message ?? 'Cannot continue yet')
    },
  })

  const submitMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ id: string }>(
        `communication/attempts/${attemptId}/submit`,
      )
      return data
    },
    onSuccess: (d) => {
      try {
        if (testId) sessionStorage.removeItem(storageKey(testId))
      } catch {
        /* ignore */
      }
      void qc.invalidateQueries({ queryKey: ['communication'] })
      toast.success('Submitted')
      navigate(`/communication/result/${d.id}`, { replace: true })
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message ?? 'Submit failed')
    },
  })

  const speak = (text: string) => {
    if (!window.speechSynthesis) {
      toast.error('Speech synthesis not available')
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.92
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  const toggleRecord = async () => {
    if (!attemptId || !session?.question?.id) return
    const questionId = session.question.id
    if (recording) {
      mediaRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const fd = new FormData()
        fd.append('file', blob, 'clip.webm')
        setRecording(false)
        mediaRef.current = null
        try {
          const { data } = await api.post<{ transcript: string }>(
            `communication/attempts/${attemptId}/transcribe`,
            fd,
          )
          setLocalDraft((m) => ({
            ...m,
            questionId,
            speakingTranscript: data.transcript,
          }))
          toast.success('Transcribed')
        } catch {
          toast.error('Transcription failed (check OPENAI_API_KEY on server)')
        }
      }
      mediaRef.current = rec
      rec.start()
      setRecording(true)
    } catch {
      toast.error('Microphone permission denied')
    }
  }

  const beforeAdvance = async () => {
    if (!attemptId || !session) return
    await api.patch(`communication/attempts/${attemptId}`, {
      responses: mergePayload(),
    })
    advanceMut.mutate()
  }

  if (!testId) return <Navigate to="/communication" replace />

  if (prevLoading || !preview) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const pct =
    attemptId && session
      ? Math.round((session.currentSection / session.sectionsTotal) * 100)
      : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Link
        to="/communication"
        className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
      >
        ← All tests
      </Link>

      <div>
        <h1>{preview.title}</h1>
        {preview.description && <p>{preview.description}</p>}
      </div>

      {!attemptId ? (
        <div className="lms-card space-y-6">
          <h2>Before you start</h2>
          <ul className="list-inside list-disc space-y-2 text-base leading-7 text-slate-700 dark:text-slate-300">
            {preview.instructions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
              <PenLine className="h-4 w-4 text-indigo-600" />
              Essay pool: {preview.poolCounts.ESSAY}
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
              <Headphones className="h-4 w-4 text-indigo-600" />
              Listening pool: {preview.poolCounts.LISTENING}
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
              <Mic className="h-4 w-4 text-indigo-600" />
              Speaking pool: {preview.poolCounts.SPEAKING}
            </span>
          </div>
          <Button
            size="lg"
            disabled={startMut.isPending}
            onClick={() => startMut.mutate()}
          >
            Start test
          </Button>
        </div>
      ) : sessLoading || !session ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="lms-card space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Section {session.currentSection} of {session.sectionsTotal}:{' '}
                <span className="text-slate-900 dark:text-slate-100">
                  {session.sectionLabels[session.currentSection - 1]}
                </span>
              </p>
              <span className="text-xs text-slate-500">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-indigo-600"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>

          <div className="lms-card space-y-4">
            {session.question.type === 'ESSAY' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="essay"
                  layout
                  className={
                    essayFocus
                      ? 'fixed inset-0 z-50 flex flex-col bg-slate-50 p-4 dark:bg-slate-950 sm:p-6'
                      : 'space-y-4'
                  }
                  initial={false}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Essay
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                        {essayWordCount} words
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => setEssayFocus((f) => !f)}
                      >
                        <Focus className="mr-1 h-4 w-4" />
                        {essayFocus ? 'Exit focus' : 'Focus mode'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300">
                    {session.question.prompt}
                  </p>
                  <textarea
                    className={cn(
                      'lms-input resize-y py-3 leading-relaxed',
                      essayFocus
                        ? 'min-h-[min(70vh,32rem)] flex-1 text-base'
                        : 'min-h-[220px]',
                    )}
                    placeholder="Write clearly and support your ideas…"
                    value={localDraft.essayHtml ?? ''}
                    onChange={(e) =>
                      setLocalDraft((m) => ({
                        ...m,
                        questionId: session.question.id,
                        essayHtml: e.target.value,
                      }))
                    }
                  />
                  <Button
                    disabled={advanceMut.isPending}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500"
                    onClick={() => void beforeAdvance()}
                  >
                    Continue to listening
                  </Button>
                </motion.div>
              </AnimatePresence>
            )}

            {session.question.type === 'LISTENING' && (
              <>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Listening
                </h2>
                <p className="text-center text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  Listen carefully, then summarize what you heard in your own
                  words.
                </p>
                <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-6 py-10 dark:border-slate-700 dark:bg-slate-800/30">
                  {session.question.audioUrl ? (
                    <audio
                      controls
                      className="w-full max-w-md rounded-lg"
                      src={session.question.audioUrl}
                    >
                      <track kind="captions" />
                    </audio>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-xl"
                      onClick={() => speak(session.question.prompt)}
                    >
                      Play passage (browser voice)
                    </Button>
                  )}
                </div>
                <input
                  className="lms-input py-3"
                  placeholder="Type what you heard"
                  value={localDraft.listeningText ?? ''}
                  onChange={(e) =>
                    setLocalDraft((m) => ({
                      ...m,
                      questionId: session.question.id,
                      listeningText: e.target.value,
                    }))
                  }
                />
                <Button
                  disabled={advanceMut.isPending}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500"
                  onClick={() => void beforeAdvance()}
                >
                  Continue to speaking
                </Button>
              </>
            )}

            {session.question.type === 'SPEAKING' && (
              <>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Speaking
                </h2>
                <p className="text-center text-base leading-relaxed text-slate-700 dark:text-slate-300">
                  {session.question.prompt}
                </p>
                {session.question.topic && (
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    Topic: {session.question.topic}
                  </p>
                )}
                <div className="flex flex-col items-center gap-4 py-6">
                  <motion.button
                    type="button"
                    onClick={() => void toggleRecord()}
                    className={cn(
                      'flex h-28 w-28 items-center justify-center rounded-full text-white shadow-xl transition-colors focus:outline-none focus:ring-4 focus:ring-indigo-500/30',
                      recording
                        ? 'bg-red-600 hover:bg-red-600'
                        : 'bg-indigo-600 hover:bg-indigo-500',
                    )}
                    animate={
                      recording
                        ? { scale: [1, 1.05, 1] }
                        : { scale: 1 }
                    }
                    transition={
                      recording
                        ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
                        : { duration: 0.2 }
                    }
                    aria-label={recording ? 'Stop recording' : 'Start recording'}
                  >
                    <Mic className="h-12 w-12" />
                  </motion.button>
                  <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-400">
                    {recording
                      ? 'Recording… tap again to stop and transcribe'
                      : 'Tap to record your answer'}
                  </p>
                </div>
                <textarea
                  className="lms-input min-h-[120px] py-3"
                  placeholder="Transcript appears here—you can edit before submitting."
                  value={localDraft.speakingTranscript ?? ''}
                  onChange={(e) =>
                    setLocalDraft((m) => ({
                      ...m,
                      questionId: session.question.id,
                      speakingTranscript: e.target.value,
                    }))
                  }
                />
                <Button
                  size="lg"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500"
                  disabled={submitMut.isPending}
                  onClick={async () => {
                    if (!attemptId || !session) return
                    await api.patch(`communication/attempts/${attemptId}`, {
                      responses: mergePayload(),
                    })
                    submitMut.mutate()
                  }}
                >
                  Submit assessment
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}
