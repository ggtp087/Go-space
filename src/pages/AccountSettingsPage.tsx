import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useLanguage } from '../i18n/LanguageContext'
import { currentUser } from '../mock/currentUser'
import { departmentOptions } from '../mock/organization'

type Tab = 'profile' | 'security'

export function AccountSettingsPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  return (
    <div className="flex-1 overflow-auto p-10">
      <div className="mx-auto max-w-[900px]">
        <h1 className="text-2xl font-bold text-ink">{t.pages.accountSettingsTitle}</h1>
        <p className="mb-7 mt-0.5 text-[13.5px] text-slate">{t.account.subtitle}</p>

        <div className="grid grid-cols-[200px_1fr] gap-8">
          <nav className="flex flex-col gap-0.5">
            <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<PersonIcon />} label={t.account.tabs.profile} />
            <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<LockIcon />} label={t.account.tabs.security} />
          </nav>

          <div>{activeTab === 'profile' ? <ProfileTab /> : <SecurityTab />}</div>
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-[9px] px-3.5 py-2.5 text-left text-[13.5px] font-semibold ${
        active ? 'bg-green-100 text-green-800' : 'text-slate'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function ProfileTab() {
  const { t } = useLanguage()
  const [department, setDepartment] = useState(
    departmentOptions.find((option) => option.label === currentUser.department)?.value ?? departmentOptions[0].value,
  )

  return (
    <Card>
      <h3 className="mb-1 text-[15px] font-bold text-ink">{t.account.profileCard.title}</h3>
      <p className="mb-[22px] text-[12.5px] text-slate">{t.account.profileCard.subtitle}</p>

      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-accent-500 text-[22px] font-bold text-white">
          {currentUser.initials}
        </span>
        <div className="flex gap-2">
          <button type="button" className="h-[34px] rounded-lg border border-line-2 bg-white px-3.5 text-[12.5px] font-semibold text-ink">
            {t.account.profileCard.uploadPhoto}
          </button>
          <button type="button" className="h-[34px] rounded-lg border border-transparent px-3.5 text-[12.5px] font-semibold text-slate">
            {t.account.profileCard.removePhoto}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <Input label={t.account.profileCard.fullNameLabel} type="text" defaultValue={currentUser.fullName} />
        <Input label={t.account.profileCard.emailLabel} type="text" defaultValue={currentUser.email} disabled />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t.account.profileCard.departmentLabel}
          options={departmentOptions}
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        />
        <div>
          <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t.account.profileCard.roleLabel}</span>
          <span className="inline-flex items-center gap-1.5 rounded-[9px] bg-green-100 px-3.5 py-[9px] text-[12.5px] font-bold text-green-800">
            <ShieldIcon />
            {currentUser.roleTitle} — {t.account.profileCard.roleBadgeSuffix}
          </span>
        </div>
      </div>

      <div className="mt-1.5 flex justify-end border-t border-line pt-[18px]">
        <Button variant="primary">{t.account.profileCard.saveChanges}</Button>
      </div>
    </Card>
  )
}

function SecurityTab() {
  const { t } = useLanguage()

  return (
    <Card>
      <h3 className="mb-1 text-[15px] font-bold text-ink">{t.account.securityCard.title}</h3>
      <p className="mb-[22px] text-[12.5px] text-slate">{t.account.securityCard.subtitle}</p>

      <Input label={t.account.securityCard.currentPasswordLabel} type="password" defaultValue="password123" className="mb-4" />
      <div className="grid grid-cols-2 gap-4">
        <Input label={t.account.securityCard.newPasswordLabel} type="password" placeholder={t.account.securityCard.newPasswordPlaceholder} />
        <Input
          label={t.account.securityCard.confirmNewPasswordLabel}
          type="password"
          placeholder={t.account.securityCard.confirmNewPasswordPlaceholder}
        />
      </div>

      <div className="mt-4 flex justify-end border-t border-line pt-[18px]">
        <Button variant="primary">{t.account.securityCard.updatePassword}</Button>
      </div>
    </Card>
  )
}

function PersonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4z" />
    </svg>
  )
}
