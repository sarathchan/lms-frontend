import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { apiErrorMessage } from '../../lib/apiErrorMessage'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { cn } from '../../lib/utils'
import { CommunicationStaffNav } from './CommunicationStaffNav'
import { Check, Plus, X } from 'lucide-react'

type PoolCounts = { ESSAY: number; LISTENING: number; SPEAKING: number }

type CommTestRow = {
  id: string
  title: string
  description: string | null
  published: boolean
  poolCounts: PoolCounts
}

type BankQuestion = {
  id: string
  type: string
  prompt: string
}

const fieldInput =
  'lms-input mt-1 w-full rounded-lg px-3 py-2 text-sm shadow-none font-sans'

export function CommunicationTestsPage() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [openTestId, setOpenTestId] = useState<string | null>(null)
  const [importTab, setImportTab] = useState<'ESSAY' | 'LISTENING' | 'SPEAKING'>('ESSAY')

  const { data: tests, isLoading } = useQuery({
    queryKey: ['communication', 'tests', 'staff'],
    queryFn: async () => {
      const { data } = await api.get<CommTestRow[]>('communication/tests')
      return data
    },
  })

  const { data: bankForImport } = useQuery({
    queryKey: ['communication', 'bank', importTab, 'for-import'],
    queryFn: async () => {
      const { data } = await api.get<BankQuestion[]>('communication/bank/questions', {
        params: { type: importTab },
      })
      return data
    },
    enabled: !!openTestId,
  })

  const createMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CommTestRow>('communication/tests', {
        title: title.trim(),
        description: description.trim() || undefined,
        published: false,
      })
      return data
    },
    onSuccess: () => {
      toast.success('Test created')
      setTitle('')
      setDescription('')
      void qc.invalidateQueries({ queryKey: ['communication'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not create test')),
  })

  const publishMut = useMutation({
    mutationFn: async ({ testId, published }: { testId: string; published: boolean }) => {
      await api.patch(`communication/tests/${testId}`, { published })
    },
    onSuccess: () => {
      toast.success('Test updated')
      void qc.invalidateQueries({ queryKey: ['communication'] })
    },
    onError: (e) =>
      toast.error(
        apiErrorMessage(
          e,
          'Could not publish — add essay, listening, and speaking to this test first.',
        ),
      ),
  })

  const importMut = useMutation({
    mutationFn: async ({ testId, questionIds }: { testId: string; questionIds: string[] }) => {
      const { data } = await api.post<{ imported: number }>(
        `communication/tests/${testId}/import-from-bank`,
        { questionIds },
      )
      return data
    },
    onSuccess: (d) => {
      toast.success(`Imported ${d.imported} question(s)`)
      void qc.invalidateQueries({ queryKey: ['communication'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Import failed')),
  })

  const poolReady = (p: PoolCounts) =>
    p.ESSAY > 0 && p.LISTENING > 0 && p.SPEAKING > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl space-y-8"
    >
      <CommunicationStaffNav />
      <div>
        <h1>Test management</h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
          Create a test, import one or more questions per section from the pool, then
          publish when essay, listening, and speaking are all present on the test.
        </p>
      </div>

      <div className="lms-card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Create test
        </h2>
        <div>
          <Label htmlFor="ct-title">Title</Label>
          <input
            id="ct-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cn(fieldInput)}
            placeholder="e.g. Week 4 communication checkpoint"
            minLength={2}
          />
        </div>
        <div>
          <Label htmlFor="ct-desc">Description (optional)</Label>
          <textarea
            id="ct-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={cn(fieldInput, 'min-h-[88px] resize-y')}
            placeholder="Shown to learners before they start"
          />
        </div>
        <Button
          type="button"
          disabled={title.trim().length < 2 || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          {createMut.isPending ? 'Creating…' : 'Create test'}
        </Button>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Your tests</h2>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        )}
        {!isLoading && (!tests || tests.length === 0) && (
          <p className="text-slate-600 dark:text-slate-400">No tests yet.</p>
        )}
        {!isLoading &&
          tests?.map((t) => {
            const p = t.poolCounts
            const ready = poolReady(p)
            const expanded = openTestId === t.id
            return (
              <div key={t.id} className="lms-card mb-4 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{t.title}</p>
                    <ul className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <li className="inline-flex items-center gap-1">
                        {p.ESSAY > 0 ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        Essay ({p.ESSAY})
                      </li>
                      <li className="inline-flex items-center gap-1">
                        {p.LISTENING > 0 ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        Listening ({p.LISTENING})
                      </li>
                      <li className="inline-flex items-center gap-1">
                        {p.SPEAKING > 0 ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        Speaking ({p.SPEAKING})
                      </li>
                    </ul>
                    {!ready && (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        Import questions from the pool until all three types are on this
                        test, then publish.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenTestId(expanded ? null : t.id)}
                    >
                      {expanded ? 'Close builder' : 'Add from pool'}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/communication/${t.id}`} target="_blank" rel="noreferrer">
                        Preview
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={t.published ? 'outline' : 'default'}
                      disabled={publishMut.isPending}
                      onClick={() =>
                        publishMut.mutate({ testId: t.id, published: !t.published })
                      }
                    >
                      {t.published ? 'Unpublish' : 'Publish'}
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                    <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
                      Each &quot;Add&quot; copies one pool question onto this test (you can
                      add several per type).
                    </p>
                    <Tabs
                      value={importTab}
                      onValueChange={(v) =>
                        setImportTab(v as 'ESSAY' | 'LISTENING' | 'SPEAKING')
                      }
                    >
                      <TabsList>
                        <TabsTrigger value="ESSAY">Essay pool</TabsTrigger>
                        <TabsTrigger value="LISTENING">Listening pool</TabsTrigger>
                        <TabsTrigger value="SPEAKING">Speaking pool</TabsTrigger>
                      </TabsList>
                      <TabsContent value={importTab} className="mt-4 space-y-2">
                        {!bankForImport?.length && (
                          <p className="text-sm text-slate-500">No questions in this pool tab.</p>
                        )}
                        {bankForImport?.map((q) => (
                          <div
                            key={q.id}
                            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800/30"
                          >
                            <p className="line-clamp-2 text-sm text-slate-800 dark:text-slate-200">
                              {q.prompt}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              disabled={importMut.isPending}
                              className="shrink-0 gap-1"
                              onClick={() =>
                                importMut.mutate({ testId: t.id, questionIds: [q.id] })
                              }
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add to test
                            </Button>
                          </div>
                        ))}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </motion.div>
  )
}
