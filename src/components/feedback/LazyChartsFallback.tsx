import { LottieLoader } from './LottieLoader'
import { Skeleton } from '../ui/Skeleton'

export function LazyChartsFallback({
  variant = 'student',
}: {
  variant?: 'student' | 'admin'
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <LottieLoader size={56} aria-label="Loading charts" />
      <div className="w-full space-y-4">
        {variant === 'admin' ? (
          <Skeleton variant="shimmer" className="h-10 w-48 rounded-lg" />
        ) : null}
        <Skeleton variant="shimmer" className="h-48 w-full rounded-2xl" />
        <Skeleton variant="shimmer" className="h-64 w-full rounded-2xl" />
        {variant === 'admin' ? (
          <Skeleton variant="shimmer" className="h-72 w-full rounded-2xl" />
        ) : null}
      </div>
    </div>
  )
}
