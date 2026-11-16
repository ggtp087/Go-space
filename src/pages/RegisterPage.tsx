import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NameFields } from '../components/forms/NameFields'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { ApiError, apiSend } from '../data/api/client'
import { lookupName, lookupOptions, useDepartments, usePositions } from '../data/lookups'
import { useLanguage } from '../i18n/LanguageContext'
import { focusFirstInvalidName, trimNames, type NameField } from '../i18n/nameValidation'
import type { PersonNames } from '../i18n/personName'
import type { LoginLocationState } from './LoginPage'

const NAME_ID_PREFIX = 'register-name'
const FIELD_IDS = { email: 'register-email', password: 'register-password', confirm: 'register-confirm-password' } as const
const EMPTY_NAMES: PersonNames = { first_name_th: '', last_name_th: '', first_name_en: '', last_name_en: '' }

// Same rules as the server (server/src/auth.ts).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function isStrongPassword(password: string): boolean {
  return password.length >= 10 && password.length <= 128 && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
}

type FieldError = 'emailInvalid' | 'emailTaken' | 'passwordTooWeak' | 'passwordMismatch'

export function RegisterPage() {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const departments = useDepartments()
  const positions = usePositions()
  const [names, setNames] = useState<PersonNames>(EMPTY_NAMES)
  const [touched, setTouched] = useState<Partial<Record<NameField, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [email, setEmail] = useState('')
  // The email the server said is taken (compared case-insensitively, like the server).
  const [takenEmail, setTakenEmail] = useState<string | null>(null)
  // '' = not chosen yet: the first lookup row is used.
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const submitButtonRef = useRef<HTMLButtonElement>(null)

  const departmentRows = departments.status === 'ready' ? departments.data : []
  const positionRows = positions.status === 'ready' ? positions.data : []
  const lookupsReady = departmentRows.length > 0 && positionRows.length > 0
  const lookupsFailed = departments.status === 'error' || positions.status === 'error'
  const departmentId = Number(department || departmentRows[0]?.id)
  const positionId = Number(position || positionRows[0]?.id)

  const normalizedEmail = email.trim().toLowerCase()
  const fieldErrors: Record<keyof typeof FIELD_IDS, FieldError | null> = {
    email: !EMAIL.test(normalizedEmail) ? 'emailInvalid' : takenEmail === normalizedEmail ? 'emailTaken' : null,
    password: isStrongPassword(password) ? null : 'passwordTooWeak',
    confirm: confirmPassword === password ? null : 'passwordMismatch',
  }
  const errorText = (field: keyof typeof FIELD_IDS) => {
    const error = fieldErrors[field]
    // "Taken" comes from the server, so it shows as soon as it's known.
    return error && (submitAttempted || error === 'emailTaken') ? t.auth.register[error] : undefined
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!agreedToTerms || !lookupsReady) return
    setSubmitAttempted(true)
    setSubmitError(false)
    // Not submittable until every field is valid: show every error and put
    // focus on the first one instead of opening the review.
    if (focusFirstInvalidName(NAME_ID_PREFIX, names)) return
    const firstInvalid = (['email', 'password', 'confirm'] as const).find((field) => fieldErrors[field])
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus()
      return
    }
    setReviewOpen(true)
  }

  async function confirmRegistration() {
    try {
      await apiSend('POST', 'auth/register', {
        ...trimNames(names),
        email: normalizedEmail,
        password,
        department_id: departmentId,
        position_id: positionId,
      })
    } catch (error) {
      setReviewOpen(false)
      if (error instanceof ApiError && error.code === 'EMAIL_TAKEN') {
        setTakenEmail(normalizedEmail)
        window.setTimeout(() => document.getElementById(FIELD_IDS.email)?.focus())
      } else {
        console.error('[auth] register', error)
        setSubmitError(true)
      }
      return
    }
    // Active straight away (no approval step): sign in on the login page.
    const state: LoginLocationState = { registered: true }
    navigate('/login', { state })
  }

  const trimmed = trimNames(names)
  const reviewRows = [
    { label: t.auth.register.reviewNameTh, value: `${trimmed.first_name_th} ${trimmed.last_name_th}` },
    { label: t.auth.register.reviewNameEn, value: `${trimmed.first_name_en} ${trimmed.last_name_en}` },
    { label: t.auth.register.emailLabel, value: normalizedEmail },
    { label: t.auth.register.departmentLabel, value: lookupName(departmentRows, departmentId, language) },
    { label: t.auth.register.positionLabel, value: lookupName(positionRows, positionId, language) },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">{t.auth.register.title}</h2>
      <p className="mb-7 mt-1.5 text-[13.5px] leading-relaxed text-slate">{t.auth.register.subtitle}</p>

      {submitError && (
        <p role="alert" className="mb-5 rounded-[9px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-semibold text-red-600">
          {t.auth.register.submitError}
        </p>
      )}

      {/* noValidate: fields use their own inline, translated errors instead of the browser's bubbles. */}
      <form className="space-y-[18px]" noValidate onSubmit={handleSubmit}>
        <NameFields
          idPrefix={NAME_ID_PREFIX}
          values={names}
          onChange={(field, value) => setNames((current) => ({ ...current, [field]: value }))}
          touched={touched}
          onBlur={(field) => setTouched((current) => ({ ...current, [field]: true }))}
          showAllErrors={submitAttempted}
        />
        <Input
          id={FIELD_IDS.email}
          label={t.auth.register.emailLabel}
          type="email"
          autoComplete="email"
          placeholder={t.auth.register.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errorText('email')}
          icon={<MailIcon />}
        />

        {lookupsReady ? (
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t.auth.register.departmentLabel}
              options={lookupOptions(departmentRows, language)}
              value={String(departmentId)}
              onChange={(event) => setDepartment(event.target.value)}
            />
            <Select
              label={t.auth.register.positionLabel}
              options={lookupOptions(positionRows, language)}
              value={String(positionId)}
              onChange={(event) => setPosition(event.target.value)}
            />
          </div>
        ) : (
          <p role={lookupsFailed ? 'alert' : 'status'} className={`text-[13px] ${lookupsFailed ? 'font-semibold text-red-600' : 'text-slate'}`}>
            {lookupsFailed ? t.auth.register.lookupsError : t.auth.register.lookupsLoading}
          </p>
        )}

        <Input
          id={FIELD_IDS.password}
          label={t.auth.register.passwordLabel}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errorText('password')}
          icon={<LockIcon />}
          showPasswordToggle
        />
        <Input
          id={FIELD_IDS.confirm}
          label={t.auth.register.confirmPasswordLabel}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errorText('confirm')}
          icon={<LockIcon />}
        />

        <label className="flex items-start gap-2.5 text-[12.5px] leading-[1.55] text-slate">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(event) => setAgreedToTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 flex-none accent-green-700"
          />
          <span>
            {t.auth.register.termsPrefix} <span className="font-semibold text-green-700">{t.auth.register.termsLink}</span>{' '}
            {t.auth.register.termsSuffix}
          </span>
        </label>

        <Button ref={submitButtonRef} type="submit" variant="primary" fullWidth disabled={!agreedToTerms || !lookupsReady} icon={<ArrowRightIcon />}>
          {t.auth.register.createAccountButton}
        </Button>
      </form>

      <ConfirmDialog
        open={reviewOpen}
        title={t.auth.register.reviewTitle}
        description={t.auth.register.reviewDescription}
        confirmLabel={t.auth.register.confirmRegistration}
        busyLabel={t.auth.register.submitting}
        cancelLabel={t.auth.register.goBackAndEdit}
        onConfirm={confirmRegistration}
        onCancel={() => setReviewOpen(false)}
        returnFocusRef={submitButtonRef}
      >
        {/* Never the password. */}
        <dl className="divide-y divide-line rounded-[10px] border border-line text-[13px]">
          {reviewRows.map((row) => (
            <div key={row.label} className="grid grid-cols-[150px_1fr] gap-3 px-3.5 py-2.5">
              <dt className="text-slate">{row.label}</dt>
              <dd className="font-semibold break-words text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </ConfirmDialog>

      <div className="my-6 flex items-center gap-3 text-xs text-mist">
        <span className="h-px flex-1 bg-line" />
        {t.auth.register.registeredDivider}
        <span className="h-px flex-1 bg-line" />
      </div>

      <p className="text-center text-[13.5px] text-slate">
        {t.auth.register.haveAccount}{' '}
        <Link to="/login" className="font-semibold text-green-700">
          {t.auth.register.signIn}
        </Link>
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

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
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
