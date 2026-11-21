import type { Request, Response } from 'express'
import { askSchema } from '../schemas/validation'
import { generateQuery } from '../services/aiService'
import { runQuery } from '../services/queryRunner'
import { requireUser } from '../services/authService'
import { ownedConnection, addHistory } from '../services/connectionService'
import { inspectDatabase, selectedSchema } from '../services/schemaService'
import { AppError } from '../types/index'
let activeQueries = 0
export async function ask(req: Request, res: Response) {
  const user = requireUser(req)
  const { connectionId, question } = askSchema.parse(req.body)
  const connection = ownedConnection(user.id, connectionId)
  if (activeQueries >= 4) throw new AppError('All query slots are busy. Try again shortly.', 429, 'QUERY_BUSY')
  activeQueries++
  const abort = new AbortController()
  const onClose = () => { if (!res.writableEnded) abort.abort() }
  res.on('close', onClose)
  const start = performance.now()
  try {
    const schema = selectedSchema(await inspectDatabase(connection.config), connection.tables)
    const plan = await generateQuery(question, schema, { signal: abort.signal })
    const result = await runQuery(plan.sql, connection.config, connection.tables, abort.signal)
    if (abort.signal.aborted) return
    const numeric = result.columns.some(column => result.rows.some(row => typeof row[column] === 'number'))
    const labels = result.columns.some(column => result.rows.some(row => typeof row[column] === 'string'))
    addHistory(user.id, connectionId, question, plan.title, result.sql)
    res.json({ question, title: plan.title, ...result, explanation: plan.explanation, connectionId, rowCount: result.rows.length, durationMs: Math.round((performance.now()-start)*100)/100, chart: plan.chart && numeric && labels, engine: 'PostgreSQL / ' + connection.config.database, translator: plan.translator, safety: 'Selected-table and function allowlists, READ ONLY transaction, 1000-row cap, 3-second execution limit' })
  } finally { activeQueries--; res.off('close', onClose) }
}
