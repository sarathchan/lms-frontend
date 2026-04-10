import { LottieLoader } from './LottieLoader'
import { Skeleton } from '../ui/Skeleton'

export function DashboardLoadingSkeleton({
  variant,
}: {
  variant: 'student' | 'admin'
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:gap-6">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <LottieLoader size={80} aria-label="Loading dashboard" />
          <p className="text-center text-sm text-[var(--muted)] sm:text-left">
            {variant === 'student'
              ? 'Preparing your dashboard…'
              : 'Loading analytics…'}
          </p>
        </div>
        {variant === 'student' ? (
          <Skeleton
            variant="shimmer"
            className="hidden h-36 w-52 rounded-2xl sm:block sm:h-40 sm:w-60"
          />
        ) : null}
      </div>

      {variant === 'student' ? (
        <>
          <Skeleton variant="shimmer" className="h-40 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton variant="shimmer" className="h-32 rounded-2xl" />
            <Skeleton variant="shimmer" className="h-32 rounded-2xl" />
            <Skeleton variant="shimmer" className="h-32 rounded-2xl" />
          </div>
          <Skeleton variant="shimmer" className="h-52 w-full rounded-2xl" />
        </>
      ) : (
        <>
          <Skeleton variant="shimmer" className="h-10 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="shimmer" className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton variant="shimmer" className="h-80 w-full rounded-2xl" />
        </>
      )}
    </div>
  )
}
