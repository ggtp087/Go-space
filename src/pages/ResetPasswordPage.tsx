import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

export function ResetPasswordPage() {
  const { t } = useLanguage()
  return (
    <div>
      <Link to="/login" className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 6 9 12 15 18" />
        </svg>
        {t.auth.resetPassword.backToSignIn}
      </Link>
      <h2 className="text-2xl font-bold text-ink">{t.auth.resetPassword.title}</h2>
    </div>
  )
}
