function isLocalFromEnv(v: string | undefined): boolean | undefined {
  const s = v?.trim().toLowerCase()
  if (s === '' || s === undefined) return undefined
  if (s === 'true' || s === '1' || s === 'yes') return true
  if (s === 'false' || s === '0' || s === 'no') return false
  return undefined
}

/** Local/dev mode: `VITE_IS_LOCAL` if set, otherwise `import.meta.env.DEV`. */
export const isLocal = isLocalFromEnv(import.meta.env.VITE_IS_LOCAL) ?? import.meta.env.DEV

/** API origin for local development (matches Vite proxy target). */
export const LOCAL_API_ORIGIN = 'http://localhost:3000'

/** Production API origin whe `VITE_API_ORIGIN` is empty at build time (see `getApiOrigin`). */
export const PRODUCTION_API_ORIGIN = 'https://lms-backend.medalph.com'
