import { createContext, useContext } from 'react'
import type { CurrentUser } from '../mock/currentUser'

export type CurrentUserContextValue = {
  user: CurrentUser
  /** Applies a saved profile edit, so the navbar and account page update immediately. */
  updateUser: (patch: Partial<CurrentUser>) => void
}

export const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

/** The signed-in user (mock until auth exists), shared by the navbar and account settings. */
export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext)
  if (!ctx) throw new Error('useCurrentUser must be used within a CurrentUserProvider')
  return ctx
}
