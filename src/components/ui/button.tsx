import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const variants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--primary)] text-white shadow-sm hover:brightness-110 active:scale-[0.98]',
        secondary:
          'border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_14%,var(--card))] text-[var(--text)] hover:brightness-95 dark:hover:brightness-110',
        outline:
          'border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--muted)_12%,var(--card))]',
        ghost:
          'text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--muted)_14%,var(--card))]',
        link: 'h-auto p-0 text-[var(--primary)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-6',
        icon: 'h-10 w-10',
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
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(
          variants({ variant, size, className }),
          'ring-offset-[var(--bg)]',
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
