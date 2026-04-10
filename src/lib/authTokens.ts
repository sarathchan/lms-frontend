/** Decode JWT payload (access token) without verifying signature — client-side expiry + session hints only. */
export function parseAccessTokenClaims(accessToken: string): {
  expMs: number | null
  sessionId: string | null
} {
  try {
    const part = accessToken.split('.')[1]
    if (!part) return { expMs: null, sessionId: null }
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
    const json = JSON.parse(atob(padded)) as Record<string, unknown>
    const exp =
      typeof json.exp === 'number' ? json.exp * 1000 : null
    const sessionId =
      typeof json.sid === 'string' ? json.sid : null
    return { expMs: exp, sessionId }
  } catch {
    return { expMs: null, sessionId: null }
  }
}
