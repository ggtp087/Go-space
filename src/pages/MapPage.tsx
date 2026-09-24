import { PagePlaceholder } from '../components/layout/PagePlaceholder'
import { useLanguage } from '../i18n/LanguageContext'

export function MapPage() {
  const { t } = useLanguage()
  return <PagePlaceholder title={t.nav.map} />
}
