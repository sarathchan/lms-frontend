import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { parseAccessTokenClaims } from '../lib/authTokens'

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'INSTRUCTOR'
  | 'STUDENT'

export type StudentProfileBrief = {
  activeExamType: { id: string; name: string; slug: string } | null
  examTypes: { id: string; name: string; slug: string }[]
}

export type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  organizationId: string | null
  /** Present for students after login; exam focus + active dashboard exam. */
  studentProfile?: StudentProfileBrief | null
}

type State = {
  accessToken: string | null
  refreshToken: string | null
  /** Server login session id (returned by login/refresh; also JWT claim `sid`). */
  sessionId: string | null
  /** Access JWT expiry (ms since epoch), from token `exp`. */
  accessExpiresAtMs: number | null
  user: AuthUser | null
  setAuth: (payload: {
    accessToken: string
    refreshToken: string
    user: AuthUser
    sessionId?: string | null
  }) => void
  setTokens: (
    access: string,
    refresh: string,
    meta?: { sessionId?: string | null },
  ) => void
  logout: () => void
}

export const useAuthStore = create<State>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      accessExpiresAtMs: null,
      user: null,
      setAuth: ({ accessToken, refreshToken, user, sessionId }) => {
        const claims = parseAccessTokenClaims(accessToken)
        set({
          accessToken,
          refreshToken,
          user,
          sessionId: sessionId ?? claims.sessionId ?? null,
          accessExpiresAtMs: claims.expMs,
        })
      },
      setTokens: (accessToken, refreshToken, meta) =>
        set((state) => {
          const claims = parseAccessTokenClaims(accessToken)
          return {
            accessToken,
            refreshToken,
            sessionId:
              claims.sessionId ??
              meta?.sessionId ??
              state.sessionId ??
              null,
            accessExpiresAtMs: claims.expMs,
          }
        }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          sessionId: null,
          accessExpiresAtMs: null,
          user: null,
        }),
    }),
    { name: 'mylms-auth' },
  ),
)
