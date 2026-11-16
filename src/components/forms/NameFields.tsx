import { useState } from 'react'
import { Input } from '../ui/Input'
import { useLanguage } from '../../i18n/LanguageContext'
import type { PersonNames } from '../../i18n/personName'
import { clampNameLength, NAME_MAX_LENGTH, nameFieldId, validateNames, type NameField } from '../../i18n/nameValidation'

type NameFieldsProps = {
  values: PersonNames
  onChange: (field: NameField, value: string) => void
  /** Fields the user has left (blurred) — their errors show inline. */
  touched: Partial<Record<NameField, boolean>>
  onBlur: (field: NameField) => void
  /** After a submit attempt every field shows its error, touched or not. */
  showAllErrors: boolean
  /** Prefix for the inputs' ids, so a form can focus the first invalid field (focusFirstInvalidName). */
  idPrefix: string
}

/**
 * The four required user_profiles name fields — Thai first/last on one row,
 * English first/last on the next — shared by Register and Account settings so
 * both use the same labels, validation, and error messages. Errors are kept
 * as codes and translated here, so they follow a language switch at once.
 */
export function NameFields({ values, onChange, touched, onBlur, showAllErrors, idPrefix }: NameFieldsProps) {
  const { t } = useLanguage()
  const errors = validateNames(values)
  // Fields where the last edit tried to go past NAME_MAX_LENGTH. Typing or
  // pasting beyond the limit is cut off (not the browser's silent maxLength),
  // and the field says why until it's edited back under the limit.
  const [overLimit, setOverLimit] = useState<Partial<Record<NameField, boolean>>>({})
  const limitMessage = t.personName.errors.tooLong.replace('{max}', String(NAME_MAX_LENGTH))

  function handleChange(field: NameField, raw: string) {
    const { value, clamped } = clampNameLength(raw)
    setOverLimit((current) => (current[field] === clamped ? current : { ...current, [field]: clamped }))
    onChange(field, value)
  }

  const fields: { field: NameField; label: string; placeholder: string; lang: string }[] = [
    { field: 'first_name_th', label: t.personName.firstNameTh, placeholder: t.personName.firstNameThPlaceholder, lang: 'th' },
    { field: 'last_name_th', label: t.personName.lastNameTh, placeholder: t.personName.lastNameThPlaceholder, lang: 'th' },
    { field: 'first_name_en', label: t.personName.firstNameEn, placeholder: t.personName.firstNameEnPlaceholder, lang: 'en' },
    { field: 'last_name_en', label: t.personName.lastNameEn, placeholder: t.personName.lastNameEnPlaceholder, lang: 'en' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {fields.map(({ field, label, placeholder, lang }) => {
        const error = errors[field]
        const visibleError = overLimit[field]
          ? limitMessage
          : error && (showAllErrors || touched[field])
            ? error === 'tooLong'
              ? limitMessage
              : t.personName.errors[error]
            : undefined
        return (
          <Input
            key={field}
            id={nameFieldId(idPrefix, field)}
            name={field}
            label={label}
            type="text"
            lang={lang}
            autoComplete={field.startsWith('first') ? 'given-name' : 'family-name'}
            placeholder={placeholder}
            value={values[field]}
            onChange={(event) => handleChange(field, event.target.value)}
            onBlur={() => onBlur(field)}
            aria-required="true"
            error={visibleError}
          />
        )
      })}
    </div>
  )
}
