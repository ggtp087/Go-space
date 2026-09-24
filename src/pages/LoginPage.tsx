import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

export function LoginPage() {
  const { t } = useLanguage()
  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">{t.auth.login.title}</h2>
      <div className="mt-4">
        <Link to="/reset-password" className="text-[13px] font-semibold text-green-700">
          {t.auth.login.forgotPassword}
        </Link>
      </div>
      <p className="mt-6 text-center text-[13.5px] text-slate">
        {t.auth.login.noAccount}{' '}
        <Link to="/register" className="font-semibold text-green-700">
          {t.auth.login.registerHere}
        </Link>
      </p>
    </div>
  )
}
