import { PRODUCTION_API_ORIGIN } from './constants'

/** API server origin (scheme + host + port), no trailing slash. Empty in dev when using the Vite `/api` proxy. */
export function getApiOrigin(): string {
  const v = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.trim()
  if (v) return v.replace(/\/$/, '')
  if (import.meta.env.PROD) return PRODUCTION_API_ORIGIN.replace(/\/$/, '')
  return ''
}

/** Base URL for REST calls (`…/api/v1`). */
export function getApiBaseUrl(): string {
  const o = getApiOrigin()
  return o ? `${o}/api/v1` : '/api/v1'
}
