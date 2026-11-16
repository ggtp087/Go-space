import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import {
  clearSessionCookie,
  loadUser,
  logActivity,
  normalizeEmail,
  parseId,
  passwordProblem,
  requireAuth,
  sessionUserId,
  setSessionCookie,
  USER_SELECT,
  validateNames,
  type ApiUser,
  type AuthedRequest,
} from '../auth.js'
import { appPool } from '../db.js'
import { HttpError } from '../validate.js'

export const authRouter = Router()

const BCRYPT_COST = 12
// Compared against when the email is unknown, so a failed sign-in takes about
// as long whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-0!', BCRYPT_COST)

async function lookupExists(table: 'departments' | 'positions', id: number): Promise<boolean> {
  const column = table === 'departments' ? 'department_id' : 'position_id'
  const { rows } = await appPool.query(`select 1 from app.${table} where ${column} = $1`, [id])
  return rows.length > 0
}

/**
 * POST /api/auth/register — creates the account and profile; active
 * immediately (no approval step). Does not sign in: the client goes to the
 * login page.
 */
authRouter.post('/auth/register', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const fields: Record<string, string> = {}
  const email = normalizeEmail(body.email)
  if (!email) fields.email = 'invalidEmail'
  const pwProblem = passwordProblem(body.password)
  if (pwProblem) fields.password = pwProblem
  let names: ReturnType<typeof validateNames> | null = null
  try {
    names = validateNames(body)
  } catch (error) {
    if (error instanceof HttpError && error.fields) Object.assign(fields, error.fields)
    else throw error
  }
  const departmentId = parseId(body.department_id)
  const positionId = parseId(body.position_id)
  if (departmentId === null || !(await lookupExists('departments', departmentId))) fields.department_id = 'invalid'
  if (positionId === null || !(await lookupExists('positions', positionId))) fields.position_id = 'invalid'
  if (Object.keys(fields).length || !email || !names || departmentId === null || positionId === null) {
    throw new HttpError(400, 'Invalid registration', 'VALIDATION', fields)
  }

  const hash = await bcrypt.hash(body.password as string, BCRYPT_COST)
  const client = await appPool.connect()
  try {
    await client.query('begin')
    const { rows } = await client.query<{ user_id: number }>(
      'insert into app.users (email, password_hash) values ($1, $2) returning user_id',
      [email, hash],
    )
    const userId = rows[0].user_id
    await client.query(
      `insert into app.user_profiles (user_id, first_name_th, last_name_th, first_name_en, last_name_en, department_id, position_id)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, names.first_name_th, names.last_name_th, names.first_name_en, names.last_name_en, departmentId, positionId],
    )
    await logActivity(client, { userId, action: 'register' })
    await client.query('commit')
    res.status(201).json({ ok: true })
  } catch (error) {
    await client.query('rollback')
    // 23505 = unique_violation (users_email_key / users_email_lower_key).
    if ((error as { code?: string }).code === '23505') {
      throw new HttpError(409, 'An account with this email already exists', 'EMAIL_TAKEN', { email: 'taken' })
    }
    throw error
  } finally {
    client.release()
  }
})

// Simple brute-force brake on sign-in: 10 failed attempts per IP per 15
// minutes (successful sign-ins don't count). Behind the Vite dev proxy every
// request comes from 127.0.0.1, so locally this is effectively one shared budget.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many sign-in attempts. Try again later.', code: 'RATE_LIMITED' })
  },
})

/** POST /api/auth/login — sets the session cookie. Any failure is the same generic 401. */
authRouter.post('/auth/login', loginLimiter, async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const email = normalizeEmail(body.email)
  const password = typeof body.password === 'string' ? body.password : ''
  const invalid = () => new HttpError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS')

  const found = email
    ? (await appPool.query<ApiUser & { password_hash: string }>(`${USER_SELECT.replace('select u.user_id,', 'select u.user_id, u.password_hash,')} where lower(u.email) = $1`, [email])).rows[0]
    : undefined

  if (!found) {
    await bcrypt.compare(password, DUMMY_HASH)
    if (email || typeof body.email === 'string') {
      const attempted = (email ?? String(body.email).trim().toLowerCase()).slice(0, 255)
      if (attempted) await logActivity(appPool, { userId: null, attemptedEmail: attempted, action: 'login_failed' })
    }
    throw invalid()
  }
  if (!(await bcrypt.compare(password, found.password_hash))) {
    await logActivity(appPool, { userId: found.user_id, action: 'login_failed' })
    throw invalid()
  }

  await appPool.query('update app.users set last_login_at = now() where user_id = $1', [found.user_id])
  await logActivity(appPool, { userId: found.user_id, action: 'login' })
  setSessionCookie(res, found.user_id)
  const user: ApiUser = {
    user_id: found.user_id,
    email: found.email,
    first_name_th: found.first_name_th,
    last_name_th: found.last_name_th,
    first_name_en: found.first_name_en,
    last_name_en: found.last_name_en,
    department_id: found.department_id,
    position_id: found.position_id,
  }
  res.json({ user })
})

/** POST /api/auth/logout — clears the session cookie (logged when the session was valid). */
authRouter.post('/auth/logout', async (req, res) => {
  const userId = sessionUserId(req)
  if (userId !== null) await logActivity(appPool, { userId, action: 'logout' })
  clearSessionCookie(res)
  res.json({ ok: true })
})

/** GET /api/auth/me — the signed-in user, or 401. */
authRouter.get('/auth/me', requireAuth, async (req, res) => {
  const user = await loadUser((req as AuthedRequest).userId)
  if (!user) {
    clearSessionCookie(res)
    throw new HttpError(401, 'Not signed in', 'UNAUTHENTICATED')
  }
  res.json({ user })
})

/** PATCH /api/account/profile — names, department (and position if given). */
authRouter.patch('/account/profile', requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId
  const body = (req.body ?? {}) as Record<string, unknown>
  // Collect every invalid field (names, department, position) in one response.
  const fields: Record<string, string> = {}
  let names: ReturnType<typeof validateNames> | null = null
  try {
    names = validateNames(body)
  } catch (error) {
    if (error instanceof HttpError && error.fields) Object.assign(fields, error.fields)
    else throw error
  }
  const departmentId = parseId(body.department_id)
  if (departmentId === null || !(await lookupExists('departments', departmentId))) fields.department_id = 'invalid'
  let positionId: number | null = null
  if (body.position_id !== undefined) {
    positionId = parseId(body.position_id)
    if (positionId === null || !(await lookupExists('positions', positionId))) fields.position_id = 'invalid'
  }
  if (Object.keys(fields).length || !names || departmentId === null) throw new HttpError(400, 'Invalid profile', 'VALIDATION', fields)
  const client = await appPool.connect()
  try {
    await client.query('begin')
    await client.query(
      `update app.user_profiles
          set first_name_th = $2, last_name_th = $3, first_name_en = $4, last_name_en = $5,
              department_id = $6, position_id = coalesce($7, position_id), updated_at = now()
        where user_id = $1`,
      [userId, names.first_name_th, names.last_name_th, names.first_name_en, names.last_name_en, departmentId, positionId],
    )
    await logActivity(client, { userId, action: 'profile_update' })
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
  res.json({ user: await loadUser(userId) })
})

/** POST /api/account/password — verifies the current password first. The session stays valid. */
authRouter.post('/account/password', requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId
  const body = (req.body ?? {}) as Record<string, unknown>
  const current = typeof body.current_password === 'string' ? body.current_password : ''
  const next = body.new_password
  const problem = passwordProblem(next)
  if (problem) throw new HttpError(400, 'Weak password', 'VALIDATION', { new_password: problem })
  if (next === current) throw new HttpError(400, 'New password must differ', 'VALIDATION', { new_password: 'newSameAsCurrent' })

  const { rows } = await appPool.query<{ password_hash: string }>('select password_hash from app.users where user_id = $1', [userId])
  if (!rows[0]) throw new HttpError(401, 'Not signed in', 'UNAUTHENTICATED')
  if (!(await bcrypt.compare(current, rows[0].password_hash))) {
    throw new HttpError(400, 'Current password is incorrect', 'WRONG_CURRENT_PASSWORD', { current_password: 'wrong' })
  }
  const hash = await bcrypt.hash(next as string, BCRYPT_COST)
  const client = await appPool.connect()
  try {
    await client.query('begin')
    await client.query('update app.users set password_hash = $2, updated_at = now() where user_id = $1', [userId, hash])
    await logActivity(client, { userId, action: 'password_change' })
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
  res.json({ ok: true })
})
