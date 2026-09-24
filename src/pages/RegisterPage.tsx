import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useLanguage } from '../i18n/LanguageContext'
import { departmentOptions, roleOptions } from '../mock/organization'

export function RegisterPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [department, setDepartment] = useState(departmentOptions[0].value)
  const [role, setRole] = useState(roleOptions[0].value)
  const [agreedToTerms, setAgreedToTerms] = useState(true)

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">{t.auth.register.title}</h2>
      <p className="mb-7 mt-1.5 text-[13.5px] leading-relaxed text-slate">{t.auth.register.subtitle}</p>

      <form
        className="space-y-[18px]"
        onSubmit={(event) => {
          event.preventDefault()
          navigate('/map')
        }}
      >
        <Input
          label={t.auth.register.fullNameLabel}
          type="text"
          placeholder={t.auth.register.fullNamePlaceholder}
          defaultValue="Nisa Phromsuwan"
          icon={<PersonIcon />}
        />
        <Input
          label={t.auth.register.emailLabel}
          type="text"
          placeholder={t.auth.register.emailPlaceholder}
          defaultValue="nisa.p@bma.go.th"
          icon={<MailIcon />}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t.auth.register.departmentLabel}
            options={departmentOptions}
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          />
          <Select
            label={t.auth.register.roleLabel}
            options={roleOptions}
            value={role}
            onChange={(event) => setRole(event.target.value)}
          />
        </div>

        <Input label={t.auth.register.passwordLabel} type="password" defaultValue="password123" icon={<LockIcon />} showPasswordToggle />
        <Input label={t.auth.register.confirmPasswordLabel} type="password" defaultValue="password123" icon={<LockIcon />} />

        <label className="flex items-start gap-2.5 text-[12.5px] leading-[1.55] text-slate">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(event) => setAgreedToTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 flex-none accent-green-700"
          />
          <span>
            {t.auth.register.termsPrefix} <span className="font-semibold text-green-700">{t.auth.register.termsLink}</span>{' '}
            {t.auth.register.termsSuffix}
          </span>
        </label>

        <Button type="submit" variant="primary" fullWidth disabled={!agreedToTerms} icon={<ArrowRightIcon />}>
          {t.auth.register.createAccountButton}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-mist">
        <span className="h-px flex-1 bg-line" />
        {t.auth.register.registeredDivider}
        <span className="h-px flex-1 bg-line" />
      </div>

      <p className="text-center text-[13.5px] text-slate">
        {t.auth.register.haveAccount}{' '}
        <Link to="/login" className="font-semibold text-green-700">
          {t.auth.register.signIn}
        </Link>
      </p>
    </div>
  )
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" />
    </svg>
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
