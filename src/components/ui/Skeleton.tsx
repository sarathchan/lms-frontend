export function Skeleton({
  className = '',
  variant = 'pulse',
}: {
  className?: string
  variant?: 'pulse' | 'shimmer'
}) {
  if (variant === 'shimmer') {
    return <div className={`mylms-skeleton-shimmer ${className}`} />
  }
  return (
    <div
      className={`animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--muted)_22%,var(--card))] ${className}`}
    />
  )
}
