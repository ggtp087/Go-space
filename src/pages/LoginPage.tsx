import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useLanguage } from '../i18n/LanguageContext'

export function LoginPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [rememberMe, setRememberMe] = useState(true)

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">{t.auth.login.title}</h2>
      <p className="mb-7 mt-1.5 text-[13.5px] leading-relaxed text-slate">{t.auth.login.subtitle}</p>

      <form
        className="space-y-[18px]"
        onSubmit={(event) => {
          event.preventDefault()
          navigate('/map')
        }}
      >
        <Input
          label={t.auth.login.emailLabel}
          type="text"
          placeholder={t.auth.login.emailPlaceholder}
          defaultValue="nisa.p@bma.go.th"
          icon={<MailIcon />}
        />
        <Input
          label={t.auth.login.passwordLabel}
          type="password"
          defaultValue="password123"
          icon={<LockIcon />}
          showPasswordToggle
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[13px] text-slate">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 accent-green-700"
            />
            {t.auth.login.rememberMe}
          </label>
          <Link to="/reset-password" className="text-[13px] font-semibold text-green-700">
            {t.auth.login.forgotPassword}
          </Link>
        </div>

        <Button type="submit" variant="primary" fullWidth icon={<ArrowRightIcon />}>
          {t.auth.login.signInButton}
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
