import type { PersonNames } from './personName'

export type NameField = keyof PersonNames
export type NameError = 'required' | 'tooLong' | 'invalidThai' | 'invalidEnglish'

export const NAME_FIELDS: readonly NameField[] = ['first_name_th', 'last_name_th', 'first_name_en', 'last_name_en']

/** user_profiles name columns are VARCHAR(100) NOT NULL. */
export const NAME_MAX_LENGTH = 100

/** Character count as the database counts it (code points, not UTF-16 units). */
export function nameLength(value: string): number {
  return Array.from(value).length
}

/** Cuts a value to NAME_MAX_LENGTH characters. Returns the kept value and whether anything was cut. */
export function clampNameLength(value: string): { value: string; clamped: boolean } {
  const chars = Array.from(value)
  if (chars.length <= NAME_MAX_LENGTH) return { value, clamped: false }
  return { value: chars.slice(0, NAME_MAX_LENGTH).join(''), clamped: true }
}

// Thai letters, vowels and tone marks (ก–ฺ, เ–๎ — not ฿ or Thai digits),
// plus spaces and hyphens. At least one Thai consonant is required so a
// bare "-" can't pass.
const THAI_NAME = /^[ก-ฺเ-๎ -]+$/
const HAS_THAI_CONSONANT = /[ก-ฮ]/
// Latin letters, spaces, hyphens, and apostrophes (straight or curly).
const ENGLISH_NAME = /^[A-Za-z '’-]+$/
const HAS_LATIN_LETTER = /[A-Za-z]/

function isThaiField(field: NameField): boolean {
  return field.endsWith('_th')
}

/** Validates one name field on its trimmed value. Returns an error code (translated at render time, so it follows the UI language), or null when valid. */
export function validateNameField(field: NameField, value: string): NameError | null {
  const trimmed = value.trim()
  if (!trimmed) return 'required'
  if (nameLength(trimmed) > NAME_MAX_LENGTH) return 'tooLong'
  if (isThaiField(field)) return THAI_NAME.test(trimmed) && HAS_THAI_CONSONANT.test(trimmed) ? null : 'invalidThai'
  return ENGLISH_NAME.test(trimmed) && HAS_LATIN_LETTER.test(trimmed) ? null : 'invalidEnglish'
}

export function validateNames(values: PersonNames): Record<NameField, NameError | null> {
  return {
    first_name_th: validateNameField('first_name_th', values.first_name_th),
    last_name_th: validateNameField('last_name_th', values.last_name_th),
    first_name_en: validateNameField('first_name_en', values.first_name_en),
    last_name_en: validateNameField('last_name_en', values.last_name_en),
  }
}

export function trimNames(values: PersonNames): PersonNames {
  return {
    first_name_th: values.first_name_th.trim(),
    last_name_th: values.last_name_th.trim(),
    first_name_en: values.first_name_en.trim(),
    last_name_en: values.last_name_en.trim(),
  }
}

/** The DOM id of one name input — NameFields renders these, forms focus them. */
export function nameFieldId(prefix: string, field: NameField): string {
  return `${prefix}-${field}`
}

/** Focuses the first invalid name field, in display order. Returns whether one was found. */
export function focusFirstInvalidName(prefix: string, values: PersonNames): boolean {
  const errors = validateNames(values)
  const first = NAME_FIELDS.find((field) => errors[field])
  if (!first) return false
  document.getElementById(nameFieldId(prefix, first))?.focus()
  return true
}
