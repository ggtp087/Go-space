import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { NameFields } from '../components/forms/NameFields'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { UserAvatar } from '../components/ui/UserAvatar'
import { ApiError, apiSend } from '../data/api/client'
import { lookupName, lookupOptions, useDepartments, usePositions } from '../data/lookups'
import { useLanguage } from '../i18n/LanguageContext'
import { focusFirstInvalidName, NAME_FIELDS, trimNames, type NameField } from '../i18n/nameValidation'
import { formatDisplayName, type PersonNames } from '../i18n/personName'
import type { Strings } from '../i18n/strings'
import { useAuth, useSignedInUser, type AuthUser } from '../state/AuthContext'
import { useToast } from '../state/ToastContext'

const NAME_ID_PREFIX = 'profile-name'

/** A 401 on an account request means the session ended (expired or signed out elsewhere). */
function isSessionEnded(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

function pickNames(names: PersonNames): PersonNames {
  return { first_name_th: names.first_name_th, last_name_th: names.last_name_th, first_name_en: names.first_name_en, last_name_en: names.last_name_en }
}

function nameLabel(field: NameField, t: Strings): string {
  const labels: Record<NameField, string> = {
    first_name_th: t.personName.firstNameTh,
    last_name_th: t.personName.lastNameTh,
    first_name_en: t.personName.firstNameEn,
    last_name_en: t.personName.lastNameEn,
  }
  return labels[field]
}

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
  const { t, language } = useLanguage()
  const user = useSignedInUser()
  const { setUser, sessionEnded } = useAuth()
  const { showToast } = useToast()
  const departments = useDepartments()
  const positions = usePositions()
  const departmentRows = departments.status === 'ready' ? departments.data : []
  const [names, setNames] = useState<PersonNames>(() => pickNames(user))
  const [department, setDepartment] = useState(user.department_id)
  const [saveError, setSaveError] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<NameField, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const saveButtonRef = useRef<HTMLButtonElement>(null)

  const trimmed = trimNames(names)
  const departmentLabel = (id: number) => lookupName(departmentRows, id, language)
  // Only what actually differs from the saved profile (names compared trimmed).
  const changes: { label: string; before: string; after: string }[] = [
    ...NAME_FIELDS.filter((field) => trimmed[field] !== user[field]).map((field) => ({
      label: nameLabel(field, t),
      before: user[field],
      after: trimmed[field],
    })),
    ...(department !== user.department_id
      ? [{ label: t.account.profileCard.departmentLabel, before: departmentLabel(user.department_id), after: departmentLabel(department) }]
      : []),
  ]
  const hasChanges = changes.length > 0

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!hasChanges) return
    setSubmitAttempted(true)
    setSaveError(false)
    if (focusFirstInvalidName(NAME_ID_PREFIX, names)) return
    setConfirmOpen(true)
  }

  async function confirmSave() {
    let saved: AuthUser
    try {
      ;({ user: saved } = await apiSend<{ user: AuthUser }>('PATCH', 'account/profile', { ...trimmed, department_id: department }))
    } catch (error) {
      setConfirmOpen(false)
      if (isSessionEnded(error)) return sessionEnded()
      console.error('[account] profile', error)
      setSaveError(true)
      return
    }
    setUser(saved)
    setNames(pickNames(saved))
    setDepartment(saved.department_id)
    setSubmitAttempted(false)
    setTouched({})
    setConfirmOpen(false)
    showToast(t.account.profileCard.successToast)
  }

  return (
    <Card>
      <h3 className="mb-1 text-[15px] font-bold text-ink">{t.account.profileCard.title}</h3>
      <p className="mb-[18px] text-[12.5px] text-slate">{t.account.profileCard.subtitle}</p>

      {/* The saved profile as it appears across the app — same helper as the navbar. */}
      <div className="mb-[22px] flex items-center gap-3 rounded-[10px] bg-bg px-3.5 py-3">
        <UserAvatar names={user} size={40} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-bold text-ink">{formatDisplayName(user, language)}</p>
          <p className="truncate text-[12px] text-slate">{user.email}</p>
        </div>
      </div>

      {saveError && (
        <p role="alert" className="mb-4 rounded-[9px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-semibold text-red-600">
          {t.account.profileCard.saveError}
        </p>
      )}

      {/* Field names match the user_profiles columns (PATCH /api/account/profile). */}
      <form noValidate onSubmit={handleSubmit}>
        <NameFields
          idPrefix={NAME_ID_PREFIX}
          values={names}
          onChange={(field, value) => setNames((current) => ({ ...current, [field]: value }))}
          touched={touched}
          onBlur={(field) => setTouched((current) => ({ ...current, [field]: true }))}
          showAllErrors={submitAttempted}
        />
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Input label={t.account.profileCard.emailLabel} name="email" type="text" value={user.email} disabled />
          <Select
            label={t.account.profileCard.departmentLabel}
            name="department"
            options={lookupOptions(departmentRows, language)}
            value={String(department)}
            onChange={(event) => setDepartment(Number(event.target.value))}
            disabled={departmentRows.length === 0}
          />
          <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t.account.profileCard.positionLabel}</span>
            <span className="inline-flex items-center rounded-[9px] bg-green-100 px-3.5 py-[9px] text-[12.5px] font-bold text-green-800">
              {lookupName(positions.status === 'ready' ? positions.data : undefined, user.position_id, language) || '—'}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 border-t border-line pt-[18px]">
          {!hasChanges && <span className="text-[12px] text-mist">{t.account.profileCard.noChangesHint}</span>}
          {/* aria-disabled, not disabled: after a save the button is "disabled"
              again, and focus must still be able to return to it from the dialog.
              handleSubmit ignores it while there's nothing to save. */}
          <Button ref={saveButtonRef} type="submit" variant="primary" aria-disabled={!hasChanges}>
            {t.account.profileCard.saveChanges}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title={t.account.profileCard.confirmTitle}
        description={t.account.profileCard.confirmDescription}
        confirmLabel={t.account.profileCard.saveChanges}
        busyLabel={t.account.profileCard.saving}
        cancelLabel={t.account.profileCard.cancel}
        onConfirm={confirmSave}
        onCancel={() => setConfirmOpen(false)}
        returnFocusRef={saveButtonRef}
      >
        <p className="mb-1.5 text-right text-[11.5px] font-semibold text-mist">{t.account.profileCard.beforeAfter}</p>
        <dl className="divide-y divide-line rounded-[10px] border border-line text-[13px]">
          {changes.map((change) => (
            <div key={change.label} className="px-3.5 py-2.5">
              <dt className="text-[12px] text-slate">{change.label}</dt>
              <dd className="mt-0.5 flex flex-wrap items-center gap-x-2 break-words">
                <span className="text-slate line-through decoration-mist">{change.before}</span>
                <span aria-hidden="true" className="text-mist">→</span>
                <span className="font-semibold text-ink">{change.after}</span>
              </dd>
            </div>
          ))}
        </dl>
      </ConfirmDialog>
    </Card>
  )
}

type PasswordField = 'current' | 'next' | 'confirm'
type PasswordError = 'currentRequired' | 'newTooWeak' | 'newSameAsCurrent' | 'confirmMismatch'

// Matches the card's own rule: at least 10 characters, a number, and a symbol.
function validatePasswords(values: Record<PasswordField, string>): Record<PasswordField, PasswordError | null> {
  const strong = values.next.length >= 10 && /\d/.test(values.next) && /[^A-Za-z0-9]/.test(values.next)
  return {
    current: values.current ? null : 'currentRequired',
    next: !strong ? 'newTooWeak' : values.next === values.current ? 'newSameAsCurrent' : null,
    confirm: values.confirm === values.next ? null : 'confirmMismatch',
  }
}

const PASSWORD_FIELD_IDS: Record<PasswordField, string> = {
  current: 'password-current',
  next: 'password-new',
  confirm: 'password-confirm',
}

function SecurityTab() {
  const { t } = useLanguage()
  const { sessionEnded } = useAuth()
  const { showToast } = useToast()
  const [values, setValues] = useState<Record<PasswordField, string>>({ current: '', next: '', confirm: '' })
  const [submitAttempted, setSubmitAttempted] = useState(false)
  // The current password the server rejected; cleared as soon as it's edited.
  const [wrongCurrent, setWrongCurrent] = useState<string | null>(null)
  const [saveError, setSaveError] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const submitButtonRef = useRef<HTMLButtonElement>(null)

  const errors = validatePasswords(values)
  const errorText = (field: PasswordField) => {
    if (field === 'current' && wrongCurrent !== null && values.current === wrongCurrent) return t.account.securityCard.currentWrong
    const error = errors[field]
    return submitAttempted && error ? t.account.securityCard[error] : undefined
  }
  const setField = (field: PasswordField) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitAttempted(true)
    setSaveError(false)
    const firstInvalid = (['current', 'next', 'confirm'] as const).find((field) => errors[field])
    if (firstInvalid) {
      document.getElementById(PASSWORD_FIELD_IDS[firstInvalid])?.focus()
      return
    }
    setConfirmOpen(true)
  }

  async function confirmChange() {
    try {
      await apiSend('POST', 'account/password', { current_password: values.current, new_password: values.next })
    } catch (error) {
      setConfirmOpen(false)
      if (isSessionEnded(error)) return sessionEnded()
      if (error instanceof ApiError && error.code === 'WRONG_CURRENT_PASSWORD') {
        setWrongCurrent(values.current)
        window.setTimeout(() => document.getElementById(PASSWORD_FIELD_IDS.current)?.focus())
      } else {
        console.error('[account] password', error)
        setSaveError(true)
      }
      return
    }
    setWrongCurrent(null)
    setValues({ current: '', next: '', confirm: '' })
    setSubmitAttempted(false)
    setConfirmOpen(false)
    showToast(t.account.securityCard.successToast)
  }

  return (
    <Card>
      <h3 className="mb-1 text-[15px] font-bold text-ink">{t.account.securityCard.title}</h3>
      <p className="mb-[22px] text-[12.5px] text-slate">{t.account.securityCard.subtitle}</p>

      {saveError && (
        <p role="alert" className="mb-4 rounded-[9px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-semibold text-red-600">
          {t.account.securityCard.saveError}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit}>
        <Input
          id={PASSWORD_FIELD_IDS.current}
          label={t.account.securityCard.currentPasswordLabel}
          type="password"
          autoComplete="current-password"
          value={values.current}
          onChange={setField('current')}
          error={errorText('current')}
          className="mb-4"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            id={PASSWORD_FIELD_IDS.next}
            label={t.account.securityCard.newPasswordLabel}
            type="password"
            autoComplete="new-password"
            placeholder={t.account.securityCard.newPasswordPlaceholder}
            value={values.next}
            onChange={setField('next')}
            error={errorText('next')}
          />
          <Input
            id={PASSWORD_FIELD_IDS.confirm}
            label={t.account.securityCard.confirmNewPasswordLabel}
            type="password"
            autoComplete="new-password"
            placeholder={t.account.securityCard.confirmNewPasswordPlaceholder}
            value={values.confirm}
            onChange={setField('confirm')}
            error={errorText('confirm')}
          />
        </div>

        <div className="mt-4 flex justify-end border-t border-line pt-[18px]">
          <Button ref={submitButtonRef} type="submit" variant="primary">
            {t.account.securityCard.updatePassword}
          </Button>
        </div>
      </form>

      {/* Never shows the password itself. */}
      <ConfirmDialog
        open={confirmOpen}
        title={t.account.securityCard.confirmTitle}
        description={t.account.securityCard.confirmDescription}
        confirmLabel={t.account.securityCard.confirmButton}
        busyLabel={t.account.securityCard.changing}
        cancelLabel={t.account.securityCard.cancel}
        onConfirm={confirmChange}
        onCancel={() => setConfirmOpen(false)}
        returnFocusRef={submitButtonRef}
      />
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

