import * as TabsPrimitive from '@radix-ui/react-tabs'
import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Tabs = TabsPrimitive.Root

export const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-auto min-h-11 w-full min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_10%,var(--card))] p-1 lg:flex-wrap',
      className,
    )}
    {...props}
  />
))
TabsList.displayName = 'TabsList'

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'shrink-0 rounded-lg px-4 py-3 text-base font-medium text-[var(--muted)] transition-all duration-200 data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--text)] data-[state=active]:shadow-sm min-h-11 lg:py-2.5 lg:text-sm',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = 'TabsTrigger'

export const TabsContent = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-4 outline-none lg:mt-6', className)}
    {...props}
  />
))
TabsContent.displayName = 'TabsContent'
