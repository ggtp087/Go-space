import type { Language } from './LanguageContext'

/** The four name columns of user_profiles — Thai and English first/last names, all required. */
export type PersonNames = {
  first_name_th: string
  last_name_th: string
  first_name_en: string
  last_name_en: string
}

// Thai consonants ก (U+0E01) – ฮ (U+0E2E). Anything else in the Thai block is
// a vowel, tone mark, or symbol, none of which can stand as an initial.
const THAI_CONSONANT = /[ก-ฮ]/
// Leading vowels เ แ โ ใ ไ (U+0E40–U+0E44) are written before the consonant
// they follow in speech, so "เจริญสุข" starts with the consonant จ, not เ.
const THAI_LEADING_VOWEL = /[เ-ไ]/
const LATIN_LETTER = /[A-Za-z]/

/**
 * The initial of one Thai name: its first consonant, skipping leading vowels
 * (เ แ โ ใ ไ). Tone marks and above/below vowels are combining characters
 * that always follow a consonant, so taking the consonant alone never
 * includes them. Empty string when the name has no Thai consonant.
 */
export function thaiInitial(name: string): string {
  for (const char of name.trim()) {
    if (THAI_LEADING_VOWEL.test(char)) continue
    if (THAI_CONSONANT.test(char)) return char
    // Any other character before the first consonant (shouldn't happen for a
    // validated name) is skipped too — never returned as an initial.
  }
  return ''
}

/** The initial of one English name: its first Latin letter, uppercased ("o'Brien" → "O"). */
export function englishInitial(name: string): string {
  for (const char of name.trim()) {
    if (LATIN_LETTER.test(char)) return char.toUpperCase()
  }
  return ''
}

function namesFor(names: PersonNames, language: Language): { first: string; last: string; initial: (name: string) => string } {
  const th = { first: names.first_name_th.trim(), last: names.last_name_th.trim(), initial: thaiInitial }
  const en = { first: names.first_name_en.trim(), last: names.last_name_en.trim(), initial: englishInitial }
  // Thai mode falls back to the English names if the Thai ones are missing
  // (they're required, so this only guards bad data), and vice versa.
  if (language === 'th') return th.first ? th : en
  return en.first ? en : th
}

/**
 * The short name shown wherever the signed-in user appears: first name plus
 * the last name's initial and a period — "นิสา ป." in Thai, "Nisa P." in
 * English. The one place this is built, so every surface agrees.
 */
export function formatDisplayName(names: PersonNames, language: Language): string {
  const { first, last, initial } = namesFor(names, language)
  const lastInitial = initial(last)
  return lastInitial ? `${first} ${lastInitial}.` : first
}

/** Two-letter avatar initials, same rule as formatDisplayName: "นป" in Thai, "NP" in English. */
export function getInitials(names: PersonNames, language: Language): string {
  const { first, last, initial } = namesFor(names, language)
  return `${initial(first)}${initial(last)}`
}
