import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const variants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 lg:text-sm',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--primary)] text-white shadow-sm hover:brightness-110 active:scale-[0.98]',
        secondary:
          'border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_14%,var(--card))] text-[var(--text)] hover:brightness-95 active:scale-[0.98] dark:hover:brightness-110',
        outline:
          'border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))] active:scale-[0.98]',
        ghost:
          'text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--muted)_14%,var(--card))] active:scale-[0.98]',
        link:
          'h-auto min-h-0 p-0 text-[var(--primary)] underline-offset-4 hover:underline active:opacity-80',
      },
      size: {
        default: 'min-h-11 min-w-11 px-4 py-3',
        sm: 'min-h-11 min-w-11 px-3 py-2.5',
        lg: 'min-h-11 min-w-11 px-6 py-3',
        icon: 'min-h-11 min-w-11 shrink-0 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variants> {
  asChild?: boolean
  /** Shows spinner and disables the control (ignored when `asChild` is true). */
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button'
    const isDisabled = disabled || (!asChild && loading)

    if (asChild) {
      return (
        <Comp
          className={cn(
            variants({ variant, size, className }),
            'ring-offset-[var(--bg)]',
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    return (
      <Comp
        className={cn(
          variants({ variant, size, className }),
          'ring-offset-[var(--bg)]',
          loading && 'relative',
        )}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <Loader2
            className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-spin opacity-90"
            aria-hidden
          />
        )}
        <span className={cn('inline-flex items-center justify-center gap-2', loading && 'invisible')}>
          {children}
        </span>
      </Comp>
    )
  },
)
Button.displayName = 'Button'
