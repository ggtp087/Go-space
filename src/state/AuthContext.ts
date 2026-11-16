import { createContext, useContext } from 'react'
import type { ApiUser } from '../data/api/client'

/** The signed-in user (app.users + app.user_profiles), as /api/auth/me returns it. */
export type AuthUser = ApiUser

export type AuthContextValue =
  | { status: 'checking'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: AuthUser }

export type AuthActions = {
  /** Signs in; throws ApiError (INVALID_CREDENTIALS, RATE_LIMITED, …) on failure. */
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Replaces the user after a profile save, so the navbar and account page update immediately. */
  setUser: (user: AuthUser) => void
  /** The server answered 401 for a signed-in request (session expired): drop to signed out. */
  sessionEnded: () => void
}

export const AuthContext = createContext<(AuthContextValue & AuthActions) | null>(null)

/**
 * The session lives in an httpOnly cookie set by the server; the client never
 * sees or stores the token. This context only mirrors who is signed in.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

/** The signed-in user, for components rendered under RequireAuth. */
export function useSignedInUser(): AuthUser {
  const auth = useAuth()
  if (auth.status !== 'signedIn') throw new Error('useSignedInUser must be used under RequireAuth')
  return auth.user
}
