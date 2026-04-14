import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type ResponsiveTableProps = {
  /** Table (or scroll wrapper + table) shown from `lg` breakpoint up */
  desktop: ReactNode
  /** Card / list layout below `lg` */
  mobile: ReactNode
  className?: string
}

/**
 * Desktop (lg+): table view. Mobile / tablet: stacked card list.
 * Matches MYLMS breakpoint system: tablet `sm`, desktop `lg`.
 */
export function ResponsiveTable({
  desktop,
  mobile,
  className,
}: ResponsiveTableProps) {
  return (
    <div className={cn('w-full min-w-0', className)}>
      <div className="hidden min-w-0 lg:block">{desktop}</div>
      <div className="lg:hidden">{mobile}</div>
    </div>
  )
}
