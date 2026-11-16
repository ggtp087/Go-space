import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ApiError } from '../data/api/client'
import { useLanguage } from '../i18n/LanguageContext'
import { useAuth } from '../state/AuthContext'

/** Router state other pages pass to /login: `registered` after sign-up, `from` = the page to return to. */
export type LoginLocationState = { registered?: boolean; from?: string } | null

type LoginError = 'fieldsRequired' | 'invalidCredentials' | 'rateLimited' | 'requestFailed'

export function LoginPage() {
  const { t } = useLanguage()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LoginLocationState
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<LoginError | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const returnTo = state?.from?.startsWith('/') && !state.from.startsWith('//') ? state.from : '/map'

  // Already signed in (e.g. the user opened /login in a second tab).
  if (auth.status === 'signedIn' && !submitting) return <Navigate to={returnTo} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    if (!email.trim() || !password) {
      setError('fieldsRequired')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await auth.login(email.trim(), password)
      navigate(returnTo, { replace: true })
    } catch (caught) {
      // One generic message for a wrong email or a wrong password.
      setError(caught instanceof ApiError && caught.code === 'INVALID_CREDENTIALS' ? 'invalidCredentials' : caught instanceof ApiError && caught.code === 'RATE_LIMITED' ? 'rateLimited' : 'requestFailed')
      setPassword('')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">{t.auth.login.title}</h2>
      <p className="mb-7 mt-1.5 text-[13.5px] leading-relaxed text-slate">{t.auth.login.subtitle}</p>

      {state?.registered && !error && (
        <p role="status" className="mb-5 rounded-[9px] border border-green-100 bg-green-50 px-3.5 py-2.5 text-[13px] font-semibold text-green-800">
          {t.auth.login.accountCreated}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-5 rounded-[9px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-semibold text-red-600">
          {t.auth.login[error]}
        </p>
      )}

      <form className="space-y-[18px]" noValidate onSubmit={handleSubmit}>
        <Input
          label={t.auth.login.emailLabel}
          type="email"
          name="email"
          autoComplete="username"
          placeholder={t.auth.login.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          icon={<MailIcon />}
        />
        <Input
          label={t.auth.login.passwordLabel}
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          icon={<LockIcon />}
          showPasswordToggle
        />

        {/* Password reset isn't wired to the server yet (app.password_reset_tokens is unused); the link still opens the existing page. */}
        <div className="flex justify-end">
          <Link to="/reset-password" className="text-[13px] font-semibold text-green-700">
            {t.auth.login.forgotPassword}
          </Link>
        </div>

        <Button type="submit" variant="primary" fullWidth icon={<ArrowRightIcon />} aria-disabled={submitting}>
          {submitting ? t.auth.login.signingIn : t.auth.login.signInButton}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-mist">
        <span className="h-px flex-1 bg-line" />
        {t.auth.login.staffDivider}
        <span className="h-px flex-1 bg-line" />
      </div>

      <p className="text-center text-[13.5px] text-slate">
        {t.auth.login.noAccount}{' '}
        <Link to="/register" className="font-semibold text-green-700">
          {t.auth.login.registerHere}
        </Link>
      </p>
    </div>
  )
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}
