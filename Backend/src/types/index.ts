export type User = { id: string; name: string; email: string }
export type TableRef = { schema: string; name: string }
export type SchemaTable = TableRef & { columns: { name: string; type: string }[]; writable: boolean; relationships: string[] }
export type ConnectionConfig = { host: string; port: number; database: string; username: string; password: string; ssl: 'verify-full' | 'disable' }
export type SavedConnection = { id: string; name: string; host: string; port: number; database: string; username: string; ssl: ConnectionConfig['ssl']; tables: TableRef[]; enabled: boolean; verifiedAt: string; createdAt: string }
export type QueryPlan = { title: string; sql: string; chart: boolean; explanation: string; translator: string }
export class AppError extends Error {
  constructor(message: string, public status = 400, public code = 'REQUEST_FAILED') { super(message) }
}
