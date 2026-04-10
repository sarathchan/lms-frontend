import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'

/** Avoid Vite's /socket.io WS proxy — it often logs ECONNRESET on restart or disconnect. */
function socketBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_WS_ORIGIN as string | undefined
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://localhost:3000'
  return window.location.origin
}

export function useRealtimeNotifications(enabled: boolean) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!enabled || !token) return
    const url = `${socketBaseUrl()}/realtime`
    const socket = io(url, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket
    socket.on('notification', () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    })
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, token, qc])
}
