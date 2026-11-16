import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { PoolClient } from 'pg'
import { appPool } from './db.js'
import { HttpError } from './validate.js'

// --- Session (JWT in an httpOnly cookie) ------------------------------------

export const SESSION_COOKIE = 'gospace_session'
const SESSION_HOURS = 8

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new HttpError(500, 'JWT_SECRET is not configured (server/.env, at least 32 characters)')
  return secret
}

export function setSessionCookie(res: Response, userId: number): void {
  const token = jwt.sign({ sub: String(userId) }, jwtSecret(), { algorithm: 'HS256', expiresIn: `${SESSION_HOURS}h` })
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' })
}

/** The signed-in user's id from the session cookie, or null (missing, expired, or tampered). */
export function sessionUserId(req: Request): number | null {
  const token: unknown = req.cookies?.[SESSION_COOKIE]
  if (typeof token !== 'string' || !token) return null
  try {
    const payload = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] })
    const id = typeof payload === 'object' ? Number(payload.sub) : NaN
    return Number.isInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export type AuthedRequest = Request & { userId: number }

/** 401 unless a valid session cookie is present; sets req.userId. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const userId = sessionUserId(req)
  if (userId === null) throw new HttpError(401, 'Not signed in', 'UNAUTHENTICATED')
  ;(req as AuthedRequest).userId = userId
  next()
}

// --- Validation (mirrors the client: src/i18n/nameValidation.ts, the password forms)

export const NAME_FIELDS = ['first_name_th', 'last_name_th', 'first_name_en', 'last_name_en'] as const
export type NameField = (typeof NAME_FIELDS)[number]
const NAME_MAX = 100
const THAI_NAME = /^[ก-ฺเ-๎ -]+$/
const HAS_THAI_CONSONANT = /[ก-ฮ]/
const ENGLISH_NAME = /^[A-Za-z '’-]+$/
const HAS_LATIN_LETTER = /[A-Za-z]/

/** Trimmed names, or a 400 with a code per invalid field (required / tooLong / invalidThai / invalidEnglish). */
export function validateNames(body: Record<string, unknown>): Record<NameField, string> {
  const fields: Record<string, string> = {}
  const out = {} as Record<NameField, string>
  for (const field of NAME_FIELDS) {
    const raw = body[field]
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (!value) fields[field] = 'required'
    else if (Array.from(value).length > NAME_MAX) fields[field] = 'tooLong'
    else if (field.endsWith('_th') ? !(THAI_NAME.test(value) && HAS_THAI_CONSONANT.test(value)) : !(ENGLISH_NAME.test(value) && HAS_LATIN_LETTER.test(value)))
      fields[field] = field.endsWith('_th') ? 'invalidThai' : 'invalidEnglish'
    out[field] = value
  }
  if (Object.keys(fields).length) throw new HttpError(400, 'Invalid name fields', 'VALIDATION', fields)
  return out
}

/** Same rule as the account forms: at least 10 characters, a number, and a symbol. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 10 || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return 'newTooWeak'
  if (password.length > 128) return 'newTooWeak'
  return null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trimmed, lowercased email (stored lowercased; unique on LOWER(email)). */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  return email.length <= 255 && EMAIL.test(email) ? email : null
}

export function parseId(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d{1,9}$/.test(raw) ? Number(raw) : NaN
  return Number.isInteger(n) && n > 0 ? n : null
}

// --- Activity log (app.user_activity_logs) -----------------------------------

export type ActivityAction = 'register' | 'login' | 'login_failed' | 'logout' | 'profile_update' | 'password_change'

/**
 * user_id when the user is known; attempted_email only for a failed sign-in
 * with an email that matches no account (data dictionary). The table's CHECK
 * requires one of the two.
 */
export async function logActivity(
  db: PoolClient | typeof appPool,
  entry: { userId: number | null; attemptedEmail?: string | null; action: ActivityAction },
): Promise<void> {
  await db.query('insert into app.user_activity_logs (user_id, attempted_email, action) values ($1, $2, $3)', [
    entry.userId,
    entry.userId === null ? (entry.attemptedEmail ?? null) : null,
    entry.action,
  ])
}

// --- User shape returned to the client --------------------------------------

export type ApiUser = {
  user_id: number
  email: string
  first_name_th: string
  last_name_th: string
  first_name_en: string
  last_name_en: string
  department_id: number
  position_id: number
}

export const USER_SELECT = `
  select u.user_id, u.email, p.first_name_th, p.last_name_th, p.first_name_en, p.last_name_en, p.department_id, p.position_id
    from app.users u
    join app.user_profiles p on p.user_id = u.user_id`

export async function loadUser(userId: number): Promise<ApiUser | null> {
  const { rows } = await appPool.query<ApiUser>(`${USER_SELECT} where u.user_id = $1`, [userId])
  return rows[0] ?? null
}
