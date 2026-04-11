export function apiErrorMessage(e: unknown, fallback: string) {
  if (typeof e !== 'object' || e === null || !('response' in e)) return fallback
  const data = (e as { response?: { data?: { message?: unknown } } }).response
    ?.data?.message
  if (typeof data === 'string') return data
  if (Array.isArray(data) && typeof data[0] === 'string') return data.join(', ')
  return fallback
}
