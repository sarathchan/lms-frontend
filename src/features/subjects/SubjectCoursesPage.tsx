import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CourseCover } from '../../components/visual/CourseCover'
import { cn } from '../../lib/utils'

type SubjectCoursesResponse = {
  subject: {
    id: string
    name: string
    iconEmoji: string | null
    examType: { id: string; name: string; slug: string }
  }
  courses: {
    id: string
    title: string
    description: string | null
    published: boolean
  }[]
}

export function SubjectCoursesPage() {
  const { subjectId } = useParams<{ subjectId: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['subjects', subjectId, 'courses'],
    queryFn: async () => {
      const { data: res } = await api.get<SubjectCoursesResponse>(
        `subjects/${subjectId}/courses`,
      )
      return res
    },
    enabled: !!subjectId,
  })

  const emoji = data?.subject.iconEmoji?.trim() || '📚'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="sm" className="rounded-xl" asChild>
          <Link to="/learn">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold text-[var(--text)]">
            <span aria-hidden>{emoji}</span>
            {data?.subject.name ?? 'Subject'}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {data?.subject.examType.name ?? 'Exam'} · Your courses in this subject
          </p>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : data.courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center text-sm text-[var(--muted)]">
          No enrolled courses for this subject yet.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.courses.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
            >
              <Link
                to={`/courses/${c.id}`}
                className={cn(
                  'group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition',
                  'hover:-translate-y-1 hover:shadow-lg',
                )}
              >
                <CourseCover
                  courseId={c.id}
                  title={c.title}
                  aspectClass="aspect-[16/10]"
                  className="rounded-none"
                />
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold text-[var(--text)] group-hover:text-[var(--primary)]">
                    {c.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                    {c.description?.trim() || 'Open to view modules and lessons.'}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
