import { PagePlaceholder } from '../components/layout/PagePlaceholder'
import { useLanguage } from '../i18n/LanguageContext'

export function DashboardPage() {
  const { t } = useLanguage()
  return <PagePlaceholder title={t.nav.dashboard} />
}
