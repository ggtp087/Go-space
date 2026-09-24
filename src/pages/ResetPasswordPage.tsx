import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useLanguage } from '../i18n/LanguageContext'

export function ResetPasswordPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()

  return (
    <div>
      <Link to="/login" className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 6 9 12 15 18" />
        </svg>
        {t.auth.resetPassword.backToSignIn}
      </Link>

      <h2 className="text-2xl font-bold text-ink">{t.auth.resetPassword.title}</h2>
      <p className="mb-7 mt-1.5 text-[13.5px] leading-relaxed text-slate">{t.auth.resetPassword.subtitle}</p>

      <form
        className="space-y-[18px]"
        onSubmit={(event) => {
          event.preventDefault()
          navigate('/login')
        }}
      >
        <Input
          label={t.auth.resetPassword.emailLabel}
          type="text"
          placeholder={t.auth.resetPassword.emailPlaceholder}
          defaultValue="nisa.p@bma.go.th"
          icon={<MailIcon />}
        />

        <Button type="submit" variant="primary" fullWidth icon={<ArrowRightIcon />}>
          {t.auth.resetPassword.sendResetLinkButton}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-mist">
        <span className="h-px flex-1 bg-line" />
        {t.auth.resetPassword.needHelpDivider}
        <span className="h-px flex-1 bg-line" />
      </div>

      <p className="text-center text-[13.5px] text-slate">
        {t.auth.resetPassword.contactPrefix} <span className="font-semibold text-green-700">{t.auth.resetPassword.contactLink}</span>{' '}
        {t.auth.resetPassword.contactSuffix}
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

function ArrowRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}
