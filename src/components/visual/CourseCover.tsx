import { cn } from '../../lib/utils'
import { courseCoverGradient, courseInitial } from '../../lib/courseCover'

type Props = {
  courseId: string
  title: string
  className?: string
  aspectClass?: string
}

export function CourseCover({
  courseId,
  title,
  className,
  aspectClass = 'aspect-[16/10]',
}: Props) {
  const initial = courseInitial(title)
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl shadow-inner',
        aspectClass,
        className,
      )}
      style={{ background: courseCoverGradient(courseId) }}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute -right-6 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 left-4 h-28 w-28 rounded-full bg-black/10 blur-xl"
        aria-hidden
      />
      <span className="absolute bottom-2 right-3 text-5xl font-black tracking-tight text-white/25 sm:text-6xl">
        {initial}
      </span>
    </div>
  )
}
