import { randomUUID } from 'node:crypto'
import { store } from '../db/accountStore'
import { decrypt, encrypt } from './credentialService'
import { AppError, type ConnectionConfig, type SavedConnection, type TableRef } from '../types/index'
type Row = { id: string; user_id: string; name: string; encrypted_config: string; tables_json: string; enabled: number; verified_at: string; created_at: string }
export function ownedConnection(userId: string, id: string, requireEnabled = true) {
  const row = store.prepare('SELECT * FROM connections WHERE id=? AND user_id=?').get(id, userId) as Row | undefined
  if (!row) throw new AppError('Connection not found.', 404, 'CONNECTION_NOT_FOUND')
  if (requireEnabled && !row.enabled) throw new AppError('This connection is disconnected. Test and reconnect it first.', 409, 'CONNECTION_DISABLED')
  return { row, config: decrypt<ConnectionConfig>(row.encrypted_config, userId, id), tables: JSON.parse(row.tables_json) as TableRef[] }
}
function publicConnection(row: Row): SavedConnection {
  const config = decrypt<ConnectionConfig>(row.encrypted_config, row.user_id, row.id)
  return { id: row.id, name: row.name, host: config.host, port: config.port, database: config.database, username: config.username, ssl: config.ssl, tables: JSON.parse(row.tables_json), enabled: Boolean(row.enabled), verifiedAt: row.verified_at, createdAt: row.created_at }
}
export function listConnections(userId: string): SavedConnection[] {
  return (store.prepare('SELECT * FROM connections WHERE user_id=? ORDER BY created_at DESC').all(userId) as Row[]).map(publicConnection)
}
export function saveConnection(userId: string, name: string, config: ConnectionConfig, tables: TableRef[]): SavedConnection {
  const count = store.prepare('SELECT COUNT(*) AS n FROM connections WHERE user_id=?').get(userId) as { n: number }
  if (count.n >= 10) throw new AppError('Each account can save up to 10 connections.', 400, 'CONNECTION_LIMIT')
  const id = randomUUID(), now = new Date().toISOString()
  store.prepare('INSERT INTO connections VALUES(?,?,?,?,?,1,?,?)').run(id, userId, name, encrypt(config, userId, id), JSON.stringify(tables), now, now)
  return publicConnection(ownedConnection(userId, id).row)
}
export function updateSelection(userId: string, id: string, tables: TableRef[]) {
  ownedConnection(userId, id, false)
  store.prepare('UPDATE connections SET tables_json=?,verified_at=? WHERE id=? AND user_id=?').run(JSON.stringify(tables), new Date().toISOString(), id, userId)
}
export function setEnabled(userId: string, id: string, enabled: boolean) {
  ownedConnection(userId, id, false)
  store.prepare('UPDATE connections SET enabled=?,verified_at=CASE WHEN ?=1 THEN ? ELSE verified_at END WHERE id=? AND user_id=?').run(enabled ? 1 : 0, enabled ? 1 : 0, new Date().toISOString(), id, userId)
}
export function deleteConnection(userId: string, id: string) {
  ownedConnection(userId, id, false)
  store.prepare('DELETE FROM connections WHERE user_id=? AND id=?').run(userId, id)
}
export function addHistory(userId: string, connectionId: string, question: string, title: string, sql: string) {
  store.prepare('INSERT INTO history VALUES(?,?,?,?,?,?,?)').run(randomUUID(), userId, connectionId, question, title, sql, new Date().toISOString())
  store.prepare('DELETE FROM history WHERE user_id=? AND id NOT IN (SELECT id FROM history WHERE user_id=? ORDER BY created_at DESC LIMIT 100)').run(userId, userId)
}
export function history(userId: string, connectionId: string) {
  ownedConnection(userId, connectionId, false)
  return store.prepare('SELECT id,question,title,created_at AS time FROM history WHERE user_id=? AND connection_id=? ORDER BY created_at DESC LIMIT 20').all(userId, connectionId)
}
export function clearHistory(userId: string, connectionId: string) {
  ownedConnection(userId, connectionId, false)
  store.prepare('DELETE FROM history WHERE user_id=? AND connection_id=?').run(userId, connectionId)
}
