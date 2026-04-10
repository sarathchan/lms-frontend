import { LottieLoader } from './LottieLoader'
import { Skeleton } from '../ui/Skeleton'

type Layout = 'fullscreen' | 'shell' | 'focused'

export function RouteLoadingFallback({
  layout,
  caption,
}: {
  layout: Layout
  caption?: string
}) {
  const lottieBlock = (
    <div className="flex flex-col items-center gap-1 py-2">
      <LottieLoader size={layout === 'shell' ? 72 : 88} />
      {caption ? (
        <p className="text-center text-sm text-[var(--muted)]">{caption}</p>
      ) : null}
    </div>
  )

  if (layout === 'fullscreen') {
    return (
      <div className="min-h-screen w-full bg-[var(--bg)] p-6 transition-colors duration-200">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
          {lottieBlock}
          <div className="w-full space-y-4">
            <Skeleton variant="shimmer" className="h-12 w-2/3 max-w-lg" />
            <Skeleton variant="shimmer" className="h-4 w-full max-w-md" />
            <Skeleton variant="shimmer" className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (layout === 'focused') {
    return (
      <div className="min-h-screen w-full bg-[var(--bg)] p-6 transition-colors duration-200">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
          {lottieBlock}
          <div className="w-full space-y-4">
            <Skeleton variant="shimmer" className="h-10 w-2/3" />
            <Skeleton variant="shimmer" className="h-4 w-full max-w-md" />
            <Skeleton variant="shimmer" className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 py-1">
      <div className="flex justify-center">{lottieBlock}</div>
      <Skeleton variant="shimmer" className="h-10 w-full max-w-lg" />
      <Skeleton variant="shimmer" className="h-4 w-full max-w-md" />
      <Skeleton variant="shimmer" className="h-56 w-full rounded-2xl" />
      <Skeleton variant="shimmer" className="h-40 w-full max-w-2xl rounded-2xl" />
    </div>
  )
}
