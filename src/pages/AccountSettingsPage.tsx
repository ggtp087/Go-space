import { PagePlaceholder } from '../components/layout/PagePlaceholder'
import { useLanguage } from '../i18n/LanguageContext'

export function AccountSettingsPage() {
  const { t } = useLanguage()
  return <PagePlaceholder title={t.pages.accountSettingsTitle} />
}
