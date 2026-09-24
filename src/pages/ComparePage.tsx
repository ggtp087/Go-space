import { PagePlaceholder } from '../components/layout/PagePlaceholder'
import { useLanguage } from '../i18n/LanguageContext'

export function ComparePage() {
  const { t } = useLanguage()
  return <PagePlaceholder title={t.nav.compare} />
}
