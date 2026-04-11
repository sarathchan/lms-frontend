/**
 * Fallback API origin when `VITE_API_ORIGIN` is unset in a production build.
 * Local Nest default; set `VITE_API_ORIGIN` in `.env.production` for a remote API.
 */
export const PRODUCTION_API_ORIGIN = 'http://localhost:3000'
