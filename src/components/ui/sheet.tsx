import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Sheet({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog.Root>
  )
}

export function SheetTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode
  asChild?: boolean
}) {
  return <Dialog.Trigger asChild={asChild}>{children}</Dialog.Trigger>
}

export function SheetContent({
  className,
  children,
  side = 'left',
}: {
  className?: string
  children: React.ReactNode
  side?: 'left' | 'right'
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)]" />
      <Dialog.Content
        className={cn(
          'fixed z-50 flex h-full w-[min(100%,20rem)] flex-col border-[var(--border)] bg-[var(--card)] text-[var(--text)] shadow-xl sm:w-72',
          side === 'left' ? 'left-0 top-0 border-r' : 'right-0 top-0 border-l',
          className,
        )}
      >
        {children}
        <Dialog.Close className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[color-mix(in_srgb,var(--muted)_14%,var(--card))]">
          <X className="h-5 w-5 shrink-0" />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  )
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      className={cn('text-lg font-semibold text-[var(--text)]', className)}
      {...props}
    />
  )
}
