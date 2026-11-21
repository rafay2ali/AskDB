import { withPostgres } from '../db/postgres'
import { AppError, type ConnectionConfig, type SchemaTable, type TableRef } from '../types/index'
export const tableKey = (table: TableRef) => JSON.stringify([table.schema, table.name])
export async function inspectDatabase(config: ConnectionConfig): Promise<SchemaTable[]> {
  return withPostgres(config, async client => {
    const result = await client.query("SELECT n.nspname AS schema_name,c.relname AS table_name,a.attname AS column_name,pg_catalog.format_type(a.atttypid,a.atttypmod) AS data_type,pg_catalog.has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE') AS writable FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped WHERE c.relkind IN ('r','p') AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND pg_catalog.has_schema_privilege(current_user,n.oid,'USAGE') AND pg_catalog.has_table_privilege(current_user,c.oid,'SELECT') ORDER BY n.nspname,c.relname,a.attnum LIMIT 10001")
    if (result.rows.length > 10000) throw new AppError('Too many accessible columns. Restrict this database login to the tables needed for analysis.', 422, 'SCHEMA_TOO_LARGE')
    const grouped = new Map<string, SchemaTable>()
    for (const row of result.rows) {
      const key = tableKey({ schema: row.schema_name, name: row.table_name })
      if (!grouped.has(key)) grouped.set(key, { schema: row.schema_name, name: row.table_name, columns: [], writable: row.writable, relationships: [] })
      grouped.get(key)!.columns.push({ name: row.column_name, type: row.data_type })
    }
    const constraints = await client.query("SELECT n.nspname AS schema_name,c.relname AS table_name,pg_catalog.pg_get_constraintdef(k.oid,true) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE k.contype='f' AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND pg_catalog.has_table_privilege(current_user,c.oid,'SELECT') LIMIT 2000")
    for (const row of constraints.rows) grouped.get(tableKey({ schema: row.schema_name, name: row.table_name }))?.relationships.push(row.definition)
    return [...grouped.values()]
  })
}
export function selectedSchema(available: SchemaTable[], selection: TableRef[]): SchemaTable[] {
  if (!selection.length || selection.length > 20 || new Set(selection.map(tableKey)).size !== selection.length) throw new AppError('Select between 1 and 20 distinct tables.', 400, 'TABLE_SELECTION')
  const output = selection.map(ref => {
    const table = available.find(item => tableKey(item) === tableKey(ref))
    if (!table) throw new AppError('A selected table is missing or no longer readable. Review your selection.', 422, 'TABLE_SELECTION')
    if (table.writable) throw new AppError('The database login has write privileges on a selected table. Use SELECT-only permissions.', 422, 'DATABASE_ROLE')
    return table
  })
  if (JSON.stringify(output).length > 60000) throw new AppError('The selected schema is too large. Choose fewer tables.', 422, 'SCHEMA_TOO_LARGE')
  return output
}
