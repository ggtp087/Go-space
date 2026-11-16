import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { CurrentUserContext, type CurrentUserContextValue } from './CurrentUserContext'
import { currentUser, type CurrentUser } from '../mock-auth/currentUser'

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(currentUser)
  const updateUser = useCallback((patch: Partial<CurrentUser>) => setUser((current) => ({ ...current, ...patch })), [])
  const value = useMemo<CurrentUserContextValue>(() => ({ user, updateUser }), [user, updateUser])
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
}
