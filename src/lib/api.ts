import axios from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '../stores/authStore'
import { getApiBaseUrl } from './apiConfig'

function errMessage(data: unknown): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message: unknown }).message
    if (typeof m === 'string') return m
    if (Array.isArray(m)) return m.join(', ')
  }
  return 'Something went wrong'
}

/** Readable message from a failed request (for inline UI; avoids duplicate toasts when using `silent`). */
export function formatAxiosError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = (err as { response?: { data?: unknown } }).response
    if (r?.data != null) return errMessage(r.data)
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /** When true, the response error interceptor will not show toast.error */
    silent?: boolean
  }
}

type RefreshResponse = {
  accessToken: string
  refreshToken: string
  sessionId?: string | null
}

let refreshInflight: Promise<RefreshResponse> | null = null

function isAuthRefreshUrl(url: string) {
  return url.includes('/auth/refresh') || url.includes('/auth/login')
}

async function refreshAccessToken(): Promise<RefreshResponse> {
  if (!refreshInflight) {
    const refresh = useAuthStore.getState().refreshToken
    if (!refresh) {
      throw new Error('No refresh token')
    }
    refreshInflight = axios
      .post<RefreshResponse>(`${getApiBaseUrl()}/auth/refresh`, {
        refreshToken: refresh,
      })
      .then(({ data }) => {
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken, {
          sessionId: data.sessionId,
        })
        return data
      })
      .finally(() => {
        refreshInflight = null
      })
  }
  return refreshInflight
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
})

const ACCESS_SKEW_MS = 45_000

api.interceptors.request.use(async (config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  const url = String(config.url ?? '')
  if (!isAuthRefreshUrl(url)) {
    const { accessToken, refreshToken, accessExpiresAtMs } =
      useAuthStore.getState()
    if (
      accessToken &&
      refreshToken &&
      accessExpiresAtMs != null &&
      Date.now() > accessExpiresAtMs - ACCESS_SKEW_MS
    ) {
      try {
        await refreshAccessToken()
      } catch {
        /* 401 handler or request may still fail */
      }
    }
  }

  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const sid = useAuthStore.getState().sessionId
  if (sid) {
    config.headers['X-Session-Id'] = sid
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config as typeof err.config & {
      _retry?: boolean
      silent?: boolean
    }
    const reqUrl = String(original?.url ?? '')
    if (
      err.response?.status === 401 &&
      !original._retry &&
      !isAuthRefreshUrl(reqUrl)
    ) {
      original._retry = true
      if (useAuthStore.getState().refreshToken) {
        try {
          const data = await refreshAccessToken()
          original.headers.Authorization = `Bearer ${data.accessToken}`
          const sid = useAuthStore.getState().sessionId
          if (sid) original.headers['X-Session-Id'] = sid
          return api(original)
        } catch {
          useAuthStore.getState().logout()
          toast.error('Session expired. Please sign in again.')
        }
      } else {
        useAuthStore.getState().logout()
        toast.error('Session expired. Please sign in again.')
      }
    } else if (err.response && !original?.silent) {
      toast.error(errMessage(err.response.data))
    } else if (!err.response && !original?.silent) {
      toast.error(err.message || 'Network error')
    }
    return Promise.reject(err)
  },
)
