import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { env } from '../config/env'
// This database stores application accounts/settings only. It contains no seeded analytics data.
if (!env.testing) mkdirSync(dirname(env.appStorePath), { recursive: true })
export const store = new DatabaseSync(env.testing ? ':memory:' : env.appStorePath)
store.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;')
store.exec('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS connections (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, encrypted_config TEXT NOT NULL, tables_json TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, verified_at TEXT NOT NULL, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE, question TEXT NOT NULL, title TEXT NOT NULL, sql TEXT NOT NULL, created_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS history_owner ON history(user_id, connection_id, created_at); CREATE INDEX IF NOT EXISTS connections_owner ON connections(user_id);')
