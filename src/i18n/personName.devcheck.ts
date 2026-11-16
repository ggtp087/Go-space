// Dev-only self-check for personName.ts (no test runner in this project yet).
// Imported from main.tsx behind import.meta.env.DEV, so it never ships in a
// production build. Logs one summary line, plus any mismatch as an error.
import { englishInitial, formatDisplayName, getInitials, thaiInitial, type PersonNames } from './personName'

type Case = { label: string; actual: string; expected: string }

function person(first_name_th: string, last_name_th: string, first_name_en: string, last_name_en: string): PersonNames {
  return { first_name_th, last_name_th, first_name_en, last_name_en }
}

export function runPersonNameChecks(): void {
  const nisa = person('นิสา', 'ประเสริฐ', 'Nisa', 'Prasert')
  const cases: Case[] = [
    // Normal names
    { label: 'TH display, normal', actual: formatDisplayName(nisa, 'th'), expected: 'นิสา ป.' },
    { label: 'EN display, normal', actual: formatDisplayName(nisa, 'en'), expected: 'Nisa P.' },
    { label: 'TH initials, normal', actual: getInitials(nisa, 'th'), expected: 'นป' },
    { label: 'EN initials, normal', actual: getInitials(nisa, 'en'), expected: 'NP' },
    // Leading vowels เ แ โ ใ ไ are skipped
    { label: 'เ leading vowel', actual: thaiInitial('เจริญสุข'), expected: 'จ' },
    { label: 'แ leading vowel', actual: thaiInitial('แสงทอง'), expected: 'ส' },
    { label: 'โ leading vowel', actual: thaiInitial('โชติช่วง'), expected: 'ช' },
    { label: 'ใ leading vowel', actual: thaiInitial('ใจดี'), expected: 'จ' },
    { label: 'ไ leading vowel', actual: thaiInitial('ไพศาล'), expected: 'พ' },
    { label: 'TH display, leading-vowel last name', actual: formatDisplayName(person('สมชาย', 'เจริญสุข', 'Somchai', 'Charoensuk'), 'th'), expected: 'สมชาย จ.' },
    { label: 'TH initials, leading-vowel first name', actual: getInitials(person('ไอริณ', 'แก้วมณี', 'Irin', 'Kaewmanee'), 'th'), expected: 'อก' },
    // Tone marks and combining vowels are never part of the initial
    { label: 'tone mark after consonant', actual: thaiInitial('ก้องเกียรติ'), expected: 'ก' },
    { label: 'tone mark + leading vowel', actual: thaiInitial('เก่งกาจ'), expected: 'ก' },
    { label: 'TH display, tone marks', actual: formatDisplayName(person('น้ำฝน', 'ก้องเกียรติ', 'Namfon', 'Kongkiat'), 'th'), expected: 'น้ำฝน ก.' },
    { label: 'TH initials, tone marks', actual: getInitials(person('น้ำฝน', 'ก้องเกียรติ', 'Namfon', 'Kongkiat'), 'th'), expected: 'นก' },
    // Hyphenated / apostrophe English names
    { label: 'EN display, hyphenated', actual: formatDisplayName(person('มารี', 'สมิท', 'Mary-Jane', 'Smith-Jones'), 'en'), expected: 'Mary-Jane S.' },
    { label: 'EN initials, hyphenated', actual: getInitials(person('มารี', 'สมิท', 'Mary-Jane', 'Smith-Jones'), 'en'), expected: 'MS' },
    { label: 'EN apostrophe, lowercase', actual: englishInitial("o'Brien"), expected: 'O' },
    // Surrounding whitespace is ignored
    { label: 'trimmed', actual: formatDisplayName(person('  นิสา ', ' ประเสริฐ ', ' Nisa', 'Prasert  '), 'th'), expected: 'นิสา ป.' },
  ]

  const failures = cases.filter((c) => c.actual !== c.expected)
  for (const f of failures) {
    console.error(`[personName] ${f.label}: expected "${f.expected}", got "${f.actual}"`)
  }
  console.info(`[personName] dev checks: ${cases.length - failures.length}/${cases.length} passed`)
}
