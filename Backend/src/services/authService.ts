import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { Request, Response } from 'express'
import { store } from '../db/accountStore'
import { env } from '../config/env'
import { AppError, type User } from '../types/index'
const derive = promisify(scrypt)
const lifetime = 7 * 24 * 60 * 60
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = await derive(password, salt, 64) as Buffer
  return salt + ':' + hash.toString('hex')
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [salt, text] = encoded.split(':')
  const actual = await derive(password, salt, 64) as Buffer
  const expected = Buffer.from(text, 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
function token(req: Request): string {
  const value = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('askdb_session='))?.slice('askdb_session='.length) || ''
  return /^[a-f0-9]{64}$/.test(value) ? value : ''
}
const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex')
function setCookie(res: Response, value: string, maxAge: number) {
  res.setHeader('Set-Cookie', 'askdb_session=' + value + '; Path=/api; HttpOnly; SameSite=Strict; Max-Age=' + maxAge + (env.production ? '; Secure' : ''))
}
export function userForRequest(req: Request): User | null {
  const value = token(req)
  if (!value) return null
  const row = store.prepare('SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(tokenHash(value), Date.now())
  return row ? row as User : null
}
export function requireUser(req: Request): User {
  const user = userForRequest(req)
  if (!user) throw new AppError('Please sign in to continue.', 401, 'AUTH_REQUIRED')
  return user
}
export function createSession(user: User, res: Response) {
  store.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now())
  const value = randomBytes(32).toString('hex')
  store.prepare('INSERT INTO sessions VALUES(?,?,?)').run(tokenHash(value), user.id, Date.now() + lifetime * 1000)
  setCookie(res, value, lifetime)
}
export function logout(req: Request, res: Response) {
  store.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token(req)))
  setCookie(res, '', 0)
}
export async function register(name: string, email: string, password: string): Promise<User> {
  const hash = await hashPassword(password)
  const user = { id: randomUUID(), name, email }
  try { store.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(user.id, name, email, hash, new Date().toISOString()) }
  catch (error) {
    if ((error as { code?: string }).code?.includes('CONSTRAINT') || String((error as Error).message).includes('UNIQUE')) throw new AppError('An account with this email already exists. Please sign in.', 409, 'ACCOUNT_EXISTS')
    throw error
  }
  return user
}
export async function login(email: string, password: string): Promise<User> {
  const row = store.prepare('SELECT * FROM users WHERE email=?').get(email) as { id: string; name: string; email: string; password_hash: string } | undefined
  // Also derive a hash for unknown accounts so password checks have similar work.
  const valid = await verifyPassword(password, row?.password_hash || '00000000000000000000000000000000:' + '00'.repeat(64))
  if (!row || !valid) throw new AppError('Email or password is incorrect.', 401, 'AUTH_INVALID')
  return { id: row.id, name: row.name, email: row.email }
}
