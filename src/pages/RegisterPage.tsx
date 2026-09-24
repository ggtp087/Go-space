import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'

export function RegisterPage() {
  const { t } = useLanguage()
  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">{t.auth.register.title}</h2>
      <p className="mt-6 text-center text-[13.5px] text-slate">
        {t.auth.register.haveAccount}{' '}
        <Link to="/login" className="font-semibold text-green-700">
          {t.auth.register.signIn}
        </Link>
      </p>
    </div>
  )
}
