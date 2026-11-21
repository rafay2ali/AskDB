import { Parser } from 'node-sql-parser'
import { tableKey } from './schemaService'
import { AppError, type TableRef } from '../types/index'
const parser = new Parser()
const functions = new Set('TO_CHAR DATE_TRUNC DATE_PART EXTRACT CEIL CEILING FLOOR COUNT SUM AVG MIN MAX ROUND ABS COALESCE NULLIF LOWER UPPER LENGTH SUBSTR SUBSTRING TRIM LTRIM RTRIM'.split(' '))
const reject = (message: string): never => { throw new AppError('SQL blocked: ' + message, 400, 'SQL_BLOCKED') }
export function validateSql(input: string, selection: TableRef[]) {
  const tables = new Set(selection.map(tableKey))
  if (!tables.size) reject('select tables before running SQL.')
  if (input.length > 12000) reject('query is too long.')
  const sql = input.trim().replace(/;$/, '').trim()
  if (!/^SELECT\b/i.test(sql)) reject('only SELECT queries are allowed.')
  if (/--|\/\*|\*\//.test(sql)) reject('SQL comments are not permitted.')
  let parsed: ReturnType<Parser['parse']>
  try { parsed = parser.parse(sql, { database: 'Postgresql' }) } catch { return reject('the statement could not be parsed safely. Try rephrasing the question.') }
  const asts = Array.isArray(parsed.ast) ? parsed.ast : [parsed.ast]
  if (asts.length !== 1 || asts[0].type !== 'select') reject('exactly one SELECT is required.')
  for (const table of parsed.tableList) {
    const [operation, database, name] = table.split('::')
    if (operation !== 'select' || !tables.has(tableKey({ schema: database, name }))) reject('query references a table outside the allowed schema.')
  }
  if (!parsed.tableList.length) reject('query must read an allowed table.')
  let nodes = 0
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return
    if (++nodes > 600) reject('query is too complex.')
    if (Array.isArray(value)) { value.forEach(visit); return }
    const node = value as Record<string, unknown>
    if (node.type === 'select' && (node.with || (node.into && Object.values(node.into as Record<string, unknown>).some(Boolean)) || node.for_update || node.locking_read)) reject('CTEs, output destinations, and locking clauses are not permitted.')
    if (node.type === 'function' || node.type === 'aggr_func') {
      const namespace = typeof node.name === 'object' ? (node.name as { schema?: { value?: string } })?.schema?.value : undefined
      if (namespace && namespace.toLowerCase() !== 'pg_catalog') reject('functions in custom schemas are not permitted.')
      const name = typeof node.name === 'string' ? node.name : ((node.name as { name?: { value?: string }[] })?.name || []).map(part => part.value).join('.')
      if (!functions.has(name.toUpperCase())) reject('query uses a function outside the analytics allowlist.')
    }
    if (node.type === 'cast') {
      const targets = (node.target || []) as { dataType?: string }[]
      const safe = new Set(['NUMERIC', 'DECIMAL', 'INTEGER', 'INT', 'BIGINT', 'SMALLINT', 'REAL', 'FLOAT', 'DOUBLE PRECISION', 'TEXT', 'VARCHAR', 'CHAR', 'DATE', 'TIMESTAMP', 'TIMESTAMPTZ', 'BOOLEAN'])
      if (targets.some(target => !safe.has(String(target.dataType).toUpperCase()))) reject('custom cast types are not permitted.')
    }
    if (node.type === 'param' || node.type === 'var' || node.type === 'origin') reject('parameters and variables are not permitted.')
    Object.values(node).forEach(visit)
  }
  visit(asts[0])
  // An outer bound applies even when the model omits or exceeds LIMIT.
  return 'SELECT * FROM (' + sql + ') AS askdb_result LIMIT 1000'
}
