import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bell, Check } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications'

type Row = {
  id: string
  type: string
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

export function NotificationBell() {
  const qc = useQueryClient()
  useRealtimeNotifications(true)

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const { data } = await api.get<{ count: number }>('notifications/unread-count')
      return data.count
    },
    refetchInterval: 60_000,
  })

  const { data: feed } = useQuery({
    queryKey: ['notifications', 'feed'],
    queryFn: async () => {
      const { data } = await api.get<{ items: Row[] }>('notifications', {
        params: { limit: 20 },
      })
      return data.items
    },
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`notifications/${id}/read`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAll = useMutation({
    mutationFn: () => api.post('notifications/read-all'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const c = unread ?? 0

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" className="relative shrink-0" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {c > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {c > 9 ? '9+' : c}
            </span>
          )}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-[100] max-h-[min(70vh,24rem)] w-[min(calc(100vw-2rem),22rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900"
          sideOffset={8}
          align="end"
        >
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Notifications
            </span>
            {c > 0 && (
              <button
                type="button"
                className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                onClick={() => markAll.mutate()}
              >
                Mark all read
              </button>
            )}
          </div>
          {(feed ?? []).length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-slate-500">No notifications</p>
          )}
          {(feed ?? []).map((n) => (
            <DropdownMenu.Item
              key={n.id}
              className={cn(
                'mb-1 cursor-pointer rounded-lg px-3 py-2 outline-none focus:bg-slate-100 dark:focus:bg-slate-800',
                !n.readAt && 'bg-indigo-50/90 dark:bg-slate-800/50',
              )}
              onSelect={(e) => e.preventDefault()}
            >
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {n.title}
                  </p>
                  <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.readAt && (
                  <button
                    type="button"
                    className="shrink-0 self-start rounded p-1 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-slate-700"
                    aria-label="Mark read"
                    onClick={() => markRead.mutate(n.id)}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
