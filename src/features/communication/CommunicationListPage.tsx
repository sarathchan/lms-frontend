import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { useAuthStore } from '../../stores/authStore'
import { Mic, Pencil } from 'lucide-react'

type Pub = { id: string; title: string; description: string | null }

export function CommunicationListPage() {
  const user = useAuthStore((s) => s.user)
  const isStaff =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'INSTRUCTOR'

  const { data, isLoading } = useQuery({
    queryKey: ['communication', 'published'],
    queryFn: async () => {
      const { data } = await api.get<Pub[]>('communication/tests/published')
      return data
    },
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1>Communication skills</h1>
          <p className="text-base leading-7 text-slate-700 dark:text-slate-300">
            Essay, listening, and speaking assessments.
          </p>
        </div>
        {isStaff && (
          <Button asChild variant="secondary">
            <Link to="/communication/admin">
              <Pencil className="mr-2 h-4 w-4" />
              Manage tests
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !data?.length ? (
        <Card className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <Mic className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">
            No published communication tests yet.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {data.map((t) => (
            <li key={t.id}>
              <Card className="transition-all hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {t.title}
                    </h2>
                    {t.description && (
                      <p className="mt-2 text-base leading-7 text-slate-700 dark:text-slate-300">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <Button asChild className="rounded-xl shrink-0">
                    <Link to={`/communication/${t.id}`}>Start</Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}
