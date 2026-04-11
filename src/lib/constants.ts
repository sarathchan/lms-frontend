/**
 * Used in production only when `VITE_API_ORIGIN` is empty at build time.
 * If `.env.production` sets `VITE_API_ORIGIN`, that value wins (see `getApiOrigin`).
 */
export const PRODUCTION_API_ORIGIN = 'http://13.201.48.42:3000'