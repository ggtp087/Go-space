import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NameFields } from '../components/forms/NameFields'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useLanguage } from '../i18n/LanguageContext'
import { focusFirstInvalidName, trimNames, type NameField } from '../i18n/nameValidation'
import type { PersonNames } from '../i18n/personName'
import { departments, lookupName, lookupOptions, positions } from '../mock-auth/organization'
import { submitRegistration } from '../mock-auth/saves'
import { useToast } from '../state/ToastContext'

const NAME_ID_PREFIX = 'register-name'

export function RegisterPage() {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [names, setNames] = useState<PersonNames>({ first_name_th: 'นิสา', last_name_th: 'ประเสริฐ', first_name_en: 'Nisa', last_name_en: 'Prasert' })
  const [touched, setTouched] = useState<Partial<Record<NameField, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [email, setEmail] = useState('nisa.p@bma.go.th')
  const [department, setDepartment] = useState(departments[0].id)
  const [position, setPosition] = useState(positions[0].id)
  const [agreedToTerms, setAgreedToTerms] = useState(true)
  const [reviewOpen, setReviewOpen] = useState(false)
  const submitButtonRef = useRef<HTMLButtonElement>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitAttempted(true)
    // Not submittable until all four names are valid: show every error and
    // put focus on the first one instead of opening the review.
    if (focusFirstInvalidName(NAME_ID_PREFIX, names)) return
    setReviewOpen(true)
  }

  async function confirmRegistration() {
    await submitRegistration()
    setReviewOpen(false)
    showToast(t.auth.register.successToast)
    navigate('/login')
  }

  const trimmed = trimNames(names)
  const reviewRows = [
    { label: t.auth.register.reviewNameTh, value: `${trimmed.first_name_th} ${trimmed.last_name_th}` },
    { label: t.auth.register.reviewNameEn, value: `${trimmed.first_name_en} ${trimmed.last_name_en}` },
    { label: t.auth.register.emailLabel, value: email.trim() },
    { label: t.auth.register.departmentLabel, value: lookupName(departments, department, language) },
    { label: t.auth.register.positionLabel, value: lookupName(positions, position, language) },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">{t.auth.register.title}</h2>
      <p className="mb-7 mt-1.5 text-[13.5px] leading-relaxed text-slate">{t.auth.register.subtitle}</p>

      {/* noValidate: the name fields use their own inline, translated errors instead of the browser's bubbles. */}
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
          label={t.auth.register.emailLabel}
          type="text"
          placeholder={t.auth.register.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          icon={<MailIcon />}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t.auth.register.departmentLabel}
            options={lookupOptions(departments, language)}
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          />
          <Select
            label={t.auth.register.positionLabel}
            options={lookupOptions(positions, language)}
            value={position}
            onChange={(event) => setPosition(event.target.value)}
          />
        </div>

        <Input label={t.auth.register.passwordLabel} type="password" defaultValue="password123" icon={<LockIcon />} showPasswordToggle />
        <Input label={t.auth.register.confirmPasswordLabel} type="password" defaultValue="password123" icon={<LockIcon />} />

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

        <Button ref={submitButtonRef} type="submit" variant="primary" fullWidth disabled={!agreedToTerms} icon={<ArrowRightIcon />}>
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
