import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { env } from '../config/env'
import { AppError } from '../types/index'
function loadKey(): Buffer {
  if (env.encryptionKey) {
    const key = Buffer.from(env.encryptionKey, 'base64')
    if (key.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.')
    return key
  }
  if (env.production) throw new Error('Set APP_ENCRYPTION_KEY before running in production.')
  if (env.testing) return randomBytes(32)
  const directory = dirname(env.appStorePath)
  mkdirSync(directory, { recursive: true })
  const file = join(directory, 'credentials.key')
  if (!existsSync(file)) writeFileSync(file, randomBytes(32), { mode: 0o600, flag: 'wx' })
  const key = readFileSync(file)
  if (key.length !== 32) throw new Error('The local encryption key is invalid. Restore it from your private backup.')
  return key
}
const key = loadKey()
export function encrypt(value: unknown, owner: string, id: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(owner + ':' + id))
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map(part => part.toString('base64')).join('.')
}
export function decrypt<T>(value: string, owner: string, id: string): T {
  try {
    const [iv, tag, data] = value.split('.').map(part => Buffer.from(part, 'base64'))
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAAD(Buffer.from(owner + ':' + id)); decipher.setAuthTag(tag)
    return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')) as T
  } catch { throw new AppError('Saved credentials could not be opened. Restore the encryption key or recreate this connection.', 503, 'CREDENTIAL_STORAGE') }
}
