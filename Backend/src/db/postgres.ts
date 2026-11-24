import { Client } from 'pg'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { env } from '../config/env'
import { AppError, type ConnectionConfig } from '../types/index'
let active = 0
export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase()
  if (ip.startsWith('::ffff:')) return isPrivateAddress(ip.slice(7))
  if (isIP(ip) === 6) return ip === '::' || ip === '::1' || /^(fc|fd|fe[89ab]|ff)/.test(ip) || ip.startsWith('2001:db8:')
  const [a,b] = ip.split('.').map(Number)
  return !isIP(ip) || a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19))
}
export async function resolveHost(config: ConnectionConfig): Promise<string> {
  if (env.production && config.ssl !== 'verify-full') throw new AppError('Hosted connections require TLS with certificate verification.', 400, 'DATABASE_TLS')
  let addresses: { address: string; family: number }[]
  try { addresses = await lookup(config.host, { all: true }) } catch { throw new AppError('Database hostname could not be resolved.', 422, 'DATABASE_HOST') }
  if (!addresses.length || addresses.some(({ address }) => address.startsWith('169.254.') || address.startsWith('fe80:') || (env.production && isPrivateAddress(address)))) throw new AppError('Database address is not allowed. Hosted accounts need a public PostgreSQL endpoint; local development supports localhost.', 400, 'DATABASE_HOST')
  return addresses[0].address
}
export function databaseError(error: unknown, signal?: AbortSignal): AppError {
  if (signal?.aborted) return new AppError('Request cancelled.', 499, 'CANCELLED')
  if (error instanceof AppError) return error
  const code = (error as { code?: string })?.code || ''
  if (code === '28P01' || code === '28000') return new AppError('PostgreSQL rejected the database login. Check the read-only username and its password.', 422, 'DATABASE_AUTH')
  if (code === '3D000') return new AppError('Database not found. Check its exact name and capitalization.', 422, 'DATABASE_NAME')
  if (code === '57014' || code === '55P03') return new AppError('PostgreSQL stopped the query at its execution or lock timeout.', 408, 'QUERY_TIMEOUT')
  if (code === '42501') return new AppError('Grant schema USAGE and SELECT on the tables you want to query.', 422, 'DATABASE_PERMISSIONS')
  if (code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
    return new AppError('TLS hostname mismatch. Use the exact database hostname from your provider. The database login was not checked.', 422, 'DATABASE_TLS_HOSTNAME')
  }
  if (code === 'CERT_HAS_EXPIRED' || code === 'CERT_NOT_YET_VALID') {
    return new AppError('The database TLS certificate is expired or not yet valid. The database login was not checked.', 422, 'DATABASE_TLS_CERTIFICATE_DATE')
  }
  if (['DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_GET_ISSUER_CERT', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_UNTRUSTED'].includes(code)) {
    return new AppError('AskDB does not trust the database TLS certificate chain. Check the CA certificate configured on the backend. The database login was not checked.', 422, 'DATABASE_TLS_CA')
  }
  if (/CERT|TLS|SSL|SELF_SIGNED/.test(code)) {
    return new AppError('The database TLS handshake failed. The database login was not checked.', 422, 'DATABASE_TLS')
  }
  if (code.startsWith('42') || code.startsWith('22')) return new AppError('The query does not match the selected PostgreSQL schema or data types. Rephrase your question.', 422, 'QUERY_EXECUTION')
  return new AppError('Cannot connect to PostgreSQL. Check host, port, firewall, TLS settings, and that the server is running.', 503, 'DATABASE_UNAVAILABLE')
}
export async function withPostgres<T>(config: ConnectionConfig, work: (client: Client) => Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw new AppError('Request cancelled.', 499, 'CANCELLED')
  if (active >= 8) throw new AppError('Database connections are busy. Try again shortly.', 429, 'DATABASE_BUSY')
  active++
  let client: Client | undefined
  const cancel = () => { void client?.end().catch(() => {}) }
  try {
    const address = await resolveHost(config)
    client = new Client({ host: address, port: config.port, database: config.database, user: config.username, password: config.password, ssl: config.ssl === 'disable' ? false : { rejectUnauthorized: true, ...(!isIP(config.host) ? { servername: config.host } : {}) }, connectionTimeoutMillis: 4000, query_timeout: 5000, application_name: 'AskDB', options: '-c default_transaction_read_only=on -c statement_timeout=3000 -c lock_timeout=1000 -c search_path=pg_catalog' })
    client.on('error', () => {})
    signal?.addEventListener('abort', cancel, { once: true })
    await client.connect()
    if (signal?.aborted) throw new AppError('Request cancelled.', 499, 'CANCELLED')
    await client.query('BEGIN READ ONLY')
    const role = await client.query('SELECT rolsuper, rolcreaterole, rolcreatedb, rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=current_user')
    if (!role.rows.length || Object.values(role.rows[0]).some(Boolean)) throw new AppError('Use a dedicated read-only login, not postgres or an administrator role.', 422, 'DATABASE_ROLE')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) { throw databaseError(error, signal) }
  finally { signal?.removeEventListener('abort', cancel); await client?.end().catch(() => {}); active-- }
}
