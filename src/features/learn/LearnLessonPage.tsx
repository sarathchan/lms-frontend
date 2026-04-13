import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '../../components/ui/sheet'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  Menu,
  Mic,
  Play,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'
import { useAuthStore } from '../../stores/authStore'
import { formatCourseProgressLabel } from '../../lib/formatCourseProgressLabel'
import { getApiOrigin } from '../../lib/apiConfig'
import { LessonVideoPlayer } from './LessonVideoPlayer'

function readTimelineBufferedPct(video: HTMLVideoElement): number {
  if (!video.buffered.length || !video.duration || !Number.isFinite(video.duration))
    return 0
  try {
    const end = video.buffered.end(video.buffered.length - 1)
    return Math.min(100, Math.round((end / video.duration) * 100))
  } catch {
    return 0
  }
}

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

type Outline = {
  title: string
  percent: number
  completedLessons?: number
  totalLessons?: number
  completedLearningLessons?: number
  totalLearningLessons?: number
  completedAssessments?: number
  totalAssessments?: number
  modules: {
    id: string
    title: string
    lessons: {
      id: string
      title: string
      type: string
      completed: boolean
      quizId: string | null
    }[]
  }[]
}

type LessonCtx = {
  lesson: {
    id: string
    title: string
    type: string
    durationSec: number | null
    completionThresholdPct: number
  }
  courseId: string
  moduleId: string
  courseTitle: string
  quizId: string | null
  playbackUrl: string | null
  /** When set, helps pick HLS vs MP4 and hints the decoder. */
  playbackMime?: string | null
  externalUrl: string | null
  progress: {
    videoPositionSec: number
    watchedPct: number
    documentScrollPct: number
    completed: boolean
  } | null
}

/** Same ordering as backend: module order, then lesson order within module. */
function arePriorLessonsCompleted(
  ordered: { id: string; completed: boolean }[],
  currentLessonId: string,
): boolean {
  const idx = ordered.findIndex((l) => l.id === currentLessonId)
  if (idx < 0) return false
  if (idx === 0) return true
  for (let i = 0; i < idx; i++) {
    if (!ordered[i].completed) return false
  }
  return true
}

function firstIncompleteLessonBefore(
  ordered: { id: string; title: string; completed: boolean; moduleId: string }[],
  currentLessonId: string,
): (typeof ordered)[number] | null {
  const idx = ordered.findIndex((l) => l.id === currentLessonId)
  if (idx <= 0) return null
  for (let i = 0; i < idx; i++) {
    if (!ordered[i].completed) return ordered[i]
  }
  return null
}

function useThrottledCallback<T extends unknown[]>(
  fn: (...a: T) => void,
  ms: number,
) {
  const last = useRef(0)
  return useCallback(
    (...args: T) => {
      const n = Date.now()
      if (n - last.current >= ms) {
        last.current = n
        fn(...args)
      }
    },
    [fn, ms],
  )
}

function navLessonIcon(type: string) {
  const cls = 'h-4 w-4 shrink-0'
  switch (type) {
    case 'VIDEO':
      return <Play className={cn(cls, 'text-indigo-600 dark:text-indigo-400')} />
    case 'DOCUMENT':
      return <FileText className={cn(cls, 'text-sky-600 dark:text-sky-400')} />
    case 'QUIZ':
      return <Brain className={cn(cls, 'text-violet-600 dark:text-violet-400')} />
    case 'VOICE':
      return <Mic className={cn(cls, 'text-rose-600 dark:text-rose-400')} />
    default:
      return <BookOpen className={cn(cls, 'text-slate-500')} />
  }
}

function LessonTOC({
  outline,
  courseId,
  activeLessonId,
  onPick,
  onLessonHover,
}: {
  outline: Outline
  courseId: string
  activeLessonId: string
  onPick?: () => void
  /** Warm lesson JSON + playback URL when the user hovers another lesson in the outline. */
  onLessonHover?: (lessonId: string) => void
}) {
  return (
    <nav className="max-h-[50vh] space-y-3 overflow-y-auto md:max-h-[calc(100vh-9rem)]">
      {outline.modules.map((mod) => (
        <div key={mod.id}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {mod.title}
          </p>
          <ul className="space-y-0.5 border-l-2 border-slate-200 pl-2 dark:border-slate-700">
            {mod.lessons.map((les) => {
              const active = les.id === activeLessonId
              return (
                <li key={les.id}>
                  <Link
                    to={`/learn/${courseId}/${mod.id}/${les.id}`}
                    onClick={() => onPick?.()}
                    onMouseEnter={() => {
                      if (les.id !== activeLessonId) onLessonHover?.(les.id)
                    }}
                    className={cn(
                      'flex items-start gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
                      active
                        ? 'bg-indigo-100 font-medium text-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-50'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80',
                    )}
                  >
                    <span className="mt-0.5">{navLessonIcon(les.type)}</span>
                    <span className="min-w-0 flex-1 leading-snug">{les.title}</span>
                    {les.completed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function LearnLessonPage() {
  const { courseId, moduleId, lessonId } = useParams<{
    courseId: string
    moduleId: string
    lessonId: string
  }>()
  const qc = useQueryClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pdfPages, setPdfPages] = useState<number | null>(null)
  const [tocOpen, setTocOpen] = useState(false)
  const [videoBuffering, setVideoBuffering] = useState(false)
  const [bufferAheadPct, setBufferAheadPct] = useState(0)
  const completionBaseline = useRef<boolean | null>(null)
  const user = useAuthStore((s) => s.user)

  const { data: outline } = useQuery({
    queryKey: ['progress', 'outline', courseId],
    queryFn: async () => {
      const { data } = await api.get<Outline>(
        `progress/courses/${courseId}/outline`,
      )
      return data
    },
    enabled: !!courseId,
    staleTime: 60 * 1000,
  })

  const { data: ctx, isLoading: ctxLoading } = useQuery({
    queryKey: ['progress', 'lesson', lessonId],
    queryFn: async () => {
      const { data } = await api.get<LessonCtx>(`progress/lessons/${lessonId}`)
      return data
    },
    enabled: !!lessonId,
    /** Same signed URL longer → better range cache reuse (matches server presign TTL). */
    staleTime: 90 * 60 * 1000,
    gcTime: 100 * 60 * 1000,
  })

  useEffect(() => {
    completionBaseline.current = null
  }, [lessonId])

  useEffect(() => {
    setBufferAheadPct(0)
  }, [lessonId])

  /** Warm TLS to the API origin so the lesson JSON (and presigned URL) returns sooner. */
  useEffect(() => {
    if (!lessonId || !courseId) return
    const origin = getApiOrigin()
    if (!origin) return
    const l = document.createElement('link')
    l.rel = 'preconnect'
    l.href = origin
    document.head.appendChild(l)
    return () => {
      if (l.parentNode) document.head.removeChild(l)
    }
  }, [lessonId, courseId])

  const prefetchLessonContext = useCallback(
    (id: string) => {
      void qc.prefetchQuery({
        queryKey: ['progress', 'lesson', id],
        queryFn: async () => {
          const { data } = await api.get<LessonCtx>(`progress/lessons/${id}`)
          return data
        },
        staleTime: 90 * 60 * 1000,
      })
    },
    [qc],
  )

  /** Warm DNS/TLS to the media host as soon as we know the URL (lesson API often finishes before outline). */
  useEffect(() => {
    if (!ctx || ctx.lesson.type !== 'VIDEO') return
    const raw = ctx.playbackUrl || ctx.externalUrl
    if (!raw) return
    let origin: string
    try {
      origin = new URL(raw).origin
    } catch {
      return
    }
    const links: HTMLLinkElement[] = []
    for (const rel of ['dns-prefetch', 'preconnect'] as const) {
      const l = document.createElement('link')
      l.rel = rel
      l.href = origin
      document.head.appendChild(l)
      links.push(l)
    }
    return () => {
      for (const l of links) {
        if (l.parentNode) document.head.removeChild(l)
      }
    }
  }, [ctx?.lesson.type, ctx?.playbackUrl, ctx?.externalUrl])

  useEffect(() => {
    if (!ctx || ctx.lesson.id !== lessonId) return
    const done = ctx.progress?.completed ?? false
    if (completionBaseline.current === null) {
      completionBaseline.current = done
      return
    }
    if (done && !completionBaseline.current) {
      toast.success('Lesson completed 🎉')
    }
    completionBaseline.current = done
  }, [ctx, lessonId])

  const flatLessons = useMemo(() => {
    if (!outline?.modules) {
      return [] as {
        moduleId: string
        id: string
        title: string
        type: string
        completed: boolean
        quizId: string | null
      }[]
    }
    const out: {
      moduleId: string
      id: string
      title: string
      type: string
      completed: boolean
      quizId: string | null
    }[] = []
    for (const mod of outline.modules) {
      for (const les of mod.lessons) {
        out.push({
          moduleId: mod.id,
          id: les.id,
          title: les.title,
          type: les.type,
          completed: les.completed,
          quizId: les.quizId,
        })
      }
    }
    return out
  }, [outline])

  const nextLesson = useMemo(() => {
    const i = flatLessons.findIndex((l) => l.id === lessonId)
    if (i < 0 || i >= flatLessons.length - 1) return null
    return flatLessons[i + 1]!
  }, [flatLessons, lessonId])

  useEffect(() => {
    const id = nextLesson?.id
    if (!id) return
    void qc.prefetchQuery({
      queryKey: ['progress', 'lesson', id],
      queryFn: async () => {
        const { data } = await api.get<LessonCtx>(`progress/lessons/${id}`)
        return data
      },
      staleTime: 90 * 60 * 1000,
    })
  }, [nextLesson?.id, qc])

  const canStartAssessmentFromLesson = useMemo(() => {
    if (!ctx || ctx.lesson.type !== 'QUIZ' || !ctx.quizId || !lessonId)
      return false
    const role = user?.role
    if (
      role === 'SUPER_ADMIN' ||
      role === 'ADMIN' ||
      role === 'INSTRUCTOR'
    )
      return true
    if (role !== 'STUDENT') return true
    return arePriorLessonsCompleted(flatLessons, lessonId)
  }, [ctx, lessonId, user?.role, flatLessons])

  const assessmentBlockedByLesson = useMemo(() => {
    if (!ctx || ctx.lesson.type !== 'QUIZ' || !lessonId) return null
    if (user?.role !== 'STUDENT') return null
    if (arePriorLessonsCompleted(flatLessons, lessonId)) return null
    return firstIncompleteLessonBefore(flatLessons, lessonId)
  }, [ctx, lessonId, user?.role, flatLessons])

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['progress', 'outline', courseId] })
    void qc.invalidateQueries({ queryKey: ['progress', 'lesson', lessonId] })
    void qc.invalidateQueries({ queryKey: ['progress', 'course', courseId] })
  }

  const progressMut = useMutation({
    mutationFn: (body: {
      lessonId: string
      video?: { positionSec: number; watchedPct: number }
      document?: { scrollPct: number; page?: number }
    }) => api.post('progress/update', body),
    onMutate: async (body) => {
      if (!lessonId) return {}
      await qc.cancelQueries({ queryKey: ['progress', 'lesson', lessonId] })
      const previous = qc.getQueryData<LessonCtx>(['progress', 'lesson', lessonId])
      if (previous) {
        const threshold = previous.lesson.completionThresholdPct ?? 80
        const base = previous.progress ?? {
          videoPositionSec: 0,
          watchedPct: 0,
          documentScrollPct: 0,
          completed: false,
        }
        const next = { ...base }
        if (body.video) {
          next.videoPositionSec = body.video.positionSec
          next.watchedPct = body.video.watchedPct
          if (body.video.watchedPct >= threshold) next.completed = true
        }
        if (body.document) {
          next.documentScrollPct = Math.max(
            base.documentScrollPct,
            body.document.scrollPct,
          )
          if (next.documentScrollPct >= threshold) next.completed = true
        }
        qc.setQueryData<LessonCtx>(['progress', 'lesson', lessonId], {
          ...previous,
          progress: next,
        })
      }
      return { previous }
    },
    onError: (_err, _body, ctx) => {
      const prev = (ctx as { previous?: LessonCtx } | undefined)?.previous
      if (prev && lessonId) {
        qc.setQueryData(['progress', 'lesson', lessonId], prev)
      }
    },
    onSettled: () => invalidate(),
  })

  const sendVideoProgress = useThrottledCallback(
    (positionSec: number, watchedPct: number) => {
      if (!lessonId) return
      void progressMut.mutate({
        lessonId,
        video: { positionSec, watchedPct },
      })
    },
    4000,
  )

  const sendDocProgress = useThrottledCallback(
    (scrollPct: number, page: number) => {
      if (!lessonId) return
      void progressMut.mutate({
        lessonId,
        document: { scrollPct, page },
      })
    },
    2000,
  )

  useEffect(() => {
    const v = videoRef.current
    if (!v || !ctx || ctx.lesson.type !== 'VIDEO') return
    const src = ctx.playbackUrl || ctx.externalUrl
    if (!src) return
    const start = ctx.progress?.videoPositionSec ?? 0
    if (start > 0 && v.readyState >= 1) {
      v.currentTime = start
    }
    const onTime = () => {
      if (!v.duration || !Number.isFinite(v.duration)) return
      const pct = Math.min(100, Math.round((v.currentTime / v.duration) * 100))
      sendVideoProgress(Math.floor(v.currentTime), pct)
    }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('pause', onTime)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('pause', onTime)
    }
  }, [ctx, sendVideoProgress])

  const onPdfScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    if (max <= 0) return
    const pct = Math.min(100, Math.round((el.scrollTop / max) * 100))
    sendDocProgress(pct, 1)
  }

  if (!courseId || !moduleId || !lessonId) {
    return <Navigate to="/courses" replace />
  }

  if (ctxLoading || !ctx) {
    return (
      <div className="flex min-h-screen">
        <Skeleton className="hidden w-72 shrink-0 md:block" />
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (ctx.moduleId !== moduleId) {
    return (
      <Navigate
        to={`/learn/${courseId}/${ctx.moduleId}/${lessonId}`}
        replace
      />
    )
  }

  const videoSrc = ctx.playbackUrl || ctx.externalUrl
  const resumeSec = Math.floor(ctx.progress?.videoPositionSec ?? 0)
  const videoSrcWithResume =
    videoSrc && resumeSec >= 2
      ? (() => {
          try {
            const u = new URL(videoSrc)
            u.hash = `t=${resumeSec}`
            return u.toString()
          } catch {
            return `${videoSrc}#t=${resumeSec}`
          }
        })()
      : videoSrc
  const pdfSrc = ctx.playbackUrl || ctx.externalUrl
  const completed = ctx.progress?.completed ?? false

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex min-h-screen flex-col bg-[var(--bg)] md:flex-row"
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--card)] px-3 py-2.5 transition-colors duration-200 md:hidden">
        <Sheet open={tocOpen} onOpenChange={setTocOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 rounded-xl">
              <Menu className="mr-1 h-4 w-4" />
              Outline
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pt-12">
            <SheetTitle className="sr-only">Course outline</SheetTitle>
            <Link
              to={`/courses/${courseId}`}
              onClick={() => setTocOpen(false)}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to course
            </Link>
            {outline ? (
              <LessonTOC
                outline={outline}
                courseId={courseId}
                activeLessonId={lessonId}
                onPick={() => setTocOpen(false)}
                onLessonHover={prefetchLessonContext}
              />
            ) : (
              <div className="space-y-3 pt-2" aria-busy="true">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            )}
          </SheetContent>
        </Sheet>
        <span className="truncate text-sm font-medium text-[var(--text)]">
          {ctx.lesson.title}
        </span>
      </div>

      <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)] transition-colors duration-200 md:flex"
      >
        <div className="flex flex-col gap-3 overflow-hidden p-4">
          <Link
            to={`/courses/${courseId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] transition hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to course
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Modules & lessons
          </p>
          {outline ? (
            <LessonTOC
              outline={outline}
              courseId={courseId}
              activeLessonId={lessonId}
              onLessonHover={prefetchLessonContext}
            />
          ) : (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-5 shadow-sm transition-colors duration-200 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                {ctx.courseTitle}
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-[var(--text)] sm:text-2xl">
                {ctx.lesson.title}
              </h1>
            </div>
            {completed && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-bg)] px-3 py-1 text-xs font-semibold text-[var(--success)]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </span>
            )}
          </div>
          <div className="mt-4">
            {outline ? (
              <>
                <div className="mb-1 flex justify-between text-xs font-medium text-[var(--muted)]">
                  <span>Course progress</span>
                  <span>{outline.percent}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
                  <motion.div
                    className="h-full rounded-full bg-[var(--primary)]"
                    initial={false}
                    animate={{ width: `${outline.percent}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 22 }}
                  />
                </div>
                {outline.totalLessons != null &&
                  outline.completedLessons != null && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {formatCourseProgressLabel({
                        completedLessons: outline.completedLessons,
                        totalLessons: outline.totalLessons,
                        completedLearningLessons: outline.completedLearningLessons,
                        totalLearningLessons: outline.totalLearningLessons,
                        completedAssessments: outline.completedAssessments,
                        totalAssessments: outline.totalAssessments,
                      })}
                    </p>
                  )}
              </>
            ) : (
              <div className="space-y-2" aria-busy="true">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col p-4 sm:p-6">
          <div className="flex-1">
            {ctx.lesson.type === 'VIDEO' && (
              <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-slate-900/10 dark:ring-white/10">
                {videoSrc ? (
                  <>
                    <LessonVideoPlayer
                      key={lessonId}
                      videoRef={videoRef}
                      src={videoSrcWithResume ?? ''}
                      mimeType={ctx.playbackMime}
                      className="aspect-video w-full"
                      controls
                      playsInline
                      preload="auto"
                      // @ts-expect-error fetchPriority is supported on HTMLMediaElement in Chromium; React DOM types omit it for <video>
                      fetchPriority="high"
                      onLoadStart={() => {
                        setBufferAheadPct(0)
                        setVideoBuffering(true)
                      }}
                      onProgress={(e) =>
                        setBufferAheadPct(readTimelineBufferedPct(e.currentTarget))
                      }
                      onTimeUpdate={(e) =>
                        setBufferAheadPct(readTimelineBufferedPct(e.currentTarget))
                      }
                      onWaiting={() => setVideoBuffering(true)}
                      onStalled={() => setVideoBuffering(true)}
                      onPlaying={() => setVideoBuffering(false)}
                      onCanPlay={(e) => {
                        setVideoBuffering(false)
                        setBufferAheadPct(readTimelineBufferedPct(e.currentTarget))
                      }}
                      onLoadedData={(e) => {
                        setBufferAheadPct(readTimelineBufferedPct(e.currentTarget))
                      }}
                      onError={() => setVideoBuffering(false)}
                      onLoadedMetadata={(e) => {
                        const el = e.currentTarget
                        if (resumeSec > 0 && resumeSec < 2) {
                          el.currentTime = resumeSec
                        }
                      }}
                    />
                    <div
                      className="flex h-1 w-full items-center bg-slate-900"
                      aria-hidden
                      title="Buffered ahead on the timeline"
                    >
                      <div
                        className="h-full bg-indigo-500/70 transition-[width] duration-200 ease-out"
                        style={{ width: `${bufferAheadPct}%` }}
                      />
                    </div>
                    {videoBuffering && (
                      <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35"
                        aria-hidden
                      >
                        <div className="flex flex-col items-center gap-2 text-white">
                          <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          <span className="text-xs font-medium opacity-90">
                            Loading video…
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 bg-slate-900 py-20 text-center">
                    <Play className="h-12 w-12 text-slate-500" />
                    <p className="max-w-md px-4 leading-relaxed text-slate-300">
                      No video is linked for this lesson. Ask your instructor to
                      attach media or an external URL.
                    </p>
                  </div>
                )}
              </div>
            )}

            {ctx.lesson.type === 'DOCUMENT' && (
              <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-colors duration-200">
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <h2 className="text-sm font-semibold text-[var(--text)]">
                    Reader view
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                    Scroll to read. Progress saves automatically (
                    {ctx.lesson.completionThresholdPct}% to mark complete).
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  {pdfSrc ? (
                    <div
                      ref={scrollRef}
                      onScroll={onPdfScroll}
                      className="max-h-[70vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_25%,var(--card))]"
                    >
                      <Document
                        file={pdfSrc}
                        onLoadSuccess={(d) => setPdfPages(d.numPages)}
                        loading={
                          <div className="p-8 text-center text-[var(--muted)]">
                            Loading PDF…
                          </div>
                        }
                        error={
                          <div className="p-8 text-center leading-relaxed text-[var(--muted)]">
                            Could not load PDF. Try the{' '}
                            <a
                              href={pdfSrc}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-[var(--primary)] underline"
                            >
                              direct link
                            </a>
                            .
                          </div>
                        }
                      >
                        {pdfPages &&
                          Array.from({ length: pdfPages }, (_, i) => (
                            <Page
                              key={i + 1}
                              pageNumber={i + 1}
                              className="mx-auto border-b border-[var(--border)]"
                              width={Math.min(
                                720,
                                typeof window !== 'undefined'
                                  ? window.innerWidth - 80
                                  : 720,
                              )}
                            />
                          ))}
                      </Document>
                    </div>
                  ) : (
                    <p className="leading-relaxed text-[var(--muted)]">
                      No PDF is attached. Contact your instructor if you
                      expected a document here.
                    </p>
                  )}
                </div>
              </div>
            )}

            {ctx.lesson.type === 'QUIZ' && ctx.quizId && (
              <Card className="mx-auto max-w-xl rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <ClipboardList className="h-6 w-6 text-[var(--primary)]" />
                    Assessment
                  </CardTitle>
                  <p className="leading-relaxed text-[var(--muted)]">
                    Opens on a focused screen with a progress indicator and
                    review when you finish.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canStartAssessmentFromLesson ? (
                    <Button asChild className="rounded-xl" size="lg">
                      <Link to={`/assessment/${ctx.quizId}`}>
                        Start assessment
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        className="rounded-xl"
                        size="lg"
                        disabled
                      >
                        Start assessment
                      </Button>
                      <p className="text-sm leading-relaxed text-[var(--muted)]">
                        {assessmentBlockedByLesson ? (
                          <>
                            Complete{' '}
                            <Link
                              to={`/learn/${courseId}/${assessmentBlockedByLesson.moduleId}/${assessmentBlockedByLesson.id}`}
                              className="font-medium text-[var(--primary)] underline"
                            >
                              {assessmentBlockedByLesson.title}
                            </Link>{' '}
                            first, then return here.
                          </>
                        ) : (
                          <>
                            Complete all earlier lessons in this course (in
                            order) before you can start this assessment.
                          </>
                        )}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {ctx.lesson.type === 'VOICE' && (
              <Card className="mx-auto max-w-xl rounded-2xl">
                <CardContent className="py-10 text-center leading-relaxed text-[var(--muted)]">
                  Voice lesson — use the course tools or contact your instructor.
                </CardContent>
              </Card>
            )}
          </div>

          {nextLesson && (
            <div className="mt-8 flex justify-end border-t border-[var(--border)] pt-6">
              <Button asChild size="lg" className="rounded-xl shadow-sm">
                <Link
                  to={`/learn/${courseId}/${nextLesson.moduleId}/${nextLesson.id}`}
                >
                  Next lesson
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </motion.div>
  )
}
