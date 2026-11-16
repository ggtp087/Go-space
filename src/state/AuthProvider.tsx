import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, apiGet, apiSend } from '../data/api/client'
import { AuthContext, type AuthContextValue, type AuthUser } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthContextValue>({ status: 'checking', user: null })

  // On load (and so on every refresh) ask the server whether the session
  // cookie is still valid.
  useEffect(() => {
    const controller = new AbortController()
    apiGet<{ user: AuthUser }>('auth/me', {}, controller.signal).then(
      ({ user }) => setState({ status: 'signedIn', user }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        if (!(error instanceof ApiError && error.status === 401)) console.error('[auth] /auth/me', error)
        setState({ status: 'signedOut', user: null })
      },
    )
    return () => controller.abort()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await apiSend<{ user: AuthUser }>('POST', 'auth/login', { email, password })
    setState({ status: 'signedIn', user })
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiSend('POST', 'auth/logout')
    } finally {
      setState({ status: 'signedOut', user: null })
    }
  }, [])

  const setUser = useCallback((user: AuthUser) => setState({ status: 'signedIn', user }), [])
  const sessionEnded = useCallback(() => setState({ status: 'signedOut', user: null }), [])

  const value = useMemo(() => ({ ...state, login, logout, setUser, sessionEnded }), [state, login, logout, setUser, sessionEnded])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
