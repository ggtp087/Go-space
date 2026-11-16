import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext'
import { useAuth } from '../../state/AuthContext'

/** Renders its children only when signed in; otherwise sends the visitor to /login (and back here afterwards). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const { t } = useLanguage()
  const location = useLocation()

  if (auth.status === 'checking') {
    return (
      <div role="status" className="flex h-screen items-center justify-center bg-bg text-[13.5px] text-slate">
        {t.user.checkingSession}
      </div>
    )
  }
  if (auth.status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return children
}
