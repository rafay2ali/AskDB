import { withPostgres } from '../db/postgres'
import { validateSql } from './sqlGuard'
import { AppError, type ConnectionConfig, type TableRef } from '../types/index'
export type Execution = { sql: string; rows: Record<string, string | number | null>[]; columns: string[] }
export async function runQuery(input: string, config: ConnectionConfig, tables: TableRef[], signal?: AbortSignal): Promise<Execution> {
  const sql = validateSql(input, tables)
  return withPostgres(config, async client => {
    const result = await client.query({ text: sql, types: { getTypeParser: () => (value: string) => value } })
    const columns = result.fields.map(field => field.name)
    if (new Set(columns).size !== columns.length) throw new AppError('Use unique column aliases in the query.', 422, 'QUERY_EXECUTION')
    const numericOids = new Set([20,21,23,700,701,1700])
    const rows = result.rows.map(row => Object.fromEntries(result.fields.map(field => {
      const value = row[field.name]
      if (value === null) return [field.name, null]
      if (field.dataTypeID === 17) return [field.name, '[binary data]']
      if (numericOids.has(field.dataTypeID) && /^-?[0-9]+(?:[.][0-9]+)?$/.test(value) && value.replace(/[^0-9]/g, '').length <= 15) return [field.name, Number(value)]
      return [field.name, String(value)]
    })))
    return { sql, rows, columns }
  }, signal)
}
