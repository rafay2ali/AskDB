export type Cell = string | number | null
export type User = { id: string; name: string; email: string }
export type TableRef = { schema: string; name: string }
export type SchemaTable = TableRef & { columns: { name: string; type: string }[]; writable: boolean; relationships: string[] }
export type ConnectionConfig = { host: string; port: number; database: string; username: string; password: string; ssl: 'verify-full' | 'disable' }
export type SavedConnection = Omit<ConnectionConfig,'password'> & { id: string; name: string; tables: TableRef[]; enabled: boolean; verifiedAt: string; createdAt: string }
export type QueryResult = { question: string; title: string; sql: string; rows: Record<string,Cell>[]; columns: string[]; rowCount: number; durationMs: number; chart: boolean; explanation: string; connectionId: string; engine: string; translator: string; safety: string }
export type SchemaResponse = { tables: SchemaTable[]; engine: string; aiConfigured: boolean; model: string }
export type HistoryEntry = { id: string; question: string; title: string; time: string }
export const tableKey = (table: TableRef) => JSON.stringify([table.schema,table.name])
