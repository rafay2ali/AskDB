import { Router, type Request } from 'express'
import { z } from 'zod'
import { env } from '../config/env'
import { AppError } from '../types/index'
import { registrationSchema, loginSchema, connectionInputSchema, saveConnectionSchema, selectionSchema, validateSchema } from '../schemas/validation'
import { userForRequest, requireUser, register, login, createSession, logout } from '../services/authService'
import { listConnections, ownedConnection, saveConnection, updateSelection, setEnabled, deleteConnection, history, clearHistory } from '../services/connectionService'
import { inspectDatabase, selectedSchema } from '../services/schemaService'
import { validateSql } from '../services/sqlGuard'
import { ask } from '../controllers/ask.controller'
const router = Router()
const id = (req: Request) => z.uuid().parse(req.params.id)
router.get('/status', (_req,res) => res.json({ status: 'ok', aiConfigured: Boolean(env.geminiKey), model: env.geminiModel }))
router.get('/auth/me', (req,res) => res.json({ user: userForRequest(req) }))
router.post('/auth/register', async (req,res) => { const data = registrationSchema.parse(req.body); const user = await register(data.name,data.email,data.password); createSession(user,res); res.status(201).json({ user }) })
router.post('/auth/login', async (req,res) => { const data = loginSchema.parse(req.body); const user = await login(data.email,data.password); createSession(user,res); res.json({ user }) })
router.post('/auth/logout', (req,res) => { logout(req,res); res.json({ success: true }) })
router.use((req,_res,next) => { requireUser(req); next() })
router.get('/connections', (req,res) => res.json({ connections: listConnections(requireUser(req).id) }))
router.post('/connections/test', async (req,res) => { const { config } = connectionInputSchema.parse(req.body); const tables = await inspectDatabase(config); res.json({ success: true, tables, message: tables.length ? 'Connected. Select the tables this account may query.' : 'Connected, but this login cannot read any user tables. Grant schema USAGE and table SELECT.' }) })
router.post('/connections', async (req,res) => { const user = requireUser(req); const data = saveConnectionSchema.parse(req.body); selectedSchema(await inspectDatabase(data.config),data.tables); res.status(201).json({ connection: saveConnection(user.id,data.name,data.config,data.tables) }) })
router.get('/connections/:id/schema', async (req,res) => { const connection = ownedConnection(requireUser(req).id,id(req)); const tables = selectedSchema(await inspectDatabase(connection.config),connection.tables); res.json({ tables, engine: 'PostgreSQL / ' + connection.config.database, aiConfigured: Boolean(env.geminiKey), model: env.geminiModel }) })
router.get('/connections/:id/tables', async (req,res) => { const connection = ownedConnection(requireUser(req).id,id(req),false); res.json({ tables: await inspectDatabase(connection.config), selected: connection.tables }) })
router.put('/connections/:id/tables', async (req,res) => { const user = requireUser(req), connectionId = id(req); const data = selectionSchema.parse(req.body); const connection = ownedConnection(user.id,connectionId,false); selectedSchema(await inspectDatabase(connection.config),data.tables); updateSelection(user.id,connectionId,data.tables); res.json({ success: true }) })
router.post('/connections/:id/test', async (req,res) => { const user = requireUser(req), connectionId = id(req); const connection = ownedConnection(user.id,connectionId,false); selectedSchema(await inspectDatabase(connection.config),connection.tables); setEnabled(user.id,connectionId,true); res.json({ success: true, message: 'Read-only connection verified.' }) })
router.post('/connections/:id/disconnect', (req,res) => { setEnabled(requireUser(req).id,id(req),false); res.json({ success: true }) })
router.delete('/connections/:id', (req,res) => { deleteConnection(requireUser(req).id,id(req)); res.json({ success: true }) })
router.get('/history', (req,res) => res.json({ history: history(requireUser(req).id,z.uuid().parse(req.query.connectionId)) }))
router.delete('/history', (req,res) => { clearHistory(requireUser(req).id,z.uuid().parse(req.query.connectionId)); res.json({ success: true }) })
router.post('/validate', (req,res) => {
  const data = validateSchema.parse(req.body), connection = ownedConnection(requireUser(req).id,data.connectionId)
  try { validateSql(data.sql,connection.tables); res.json({ allowed: true, message: 'Passed the SQL parser and selected-table/function allowlists. No SQL was executed. Column validity is checked when a query runs.' }) }
  catch (error) { if (error instanceof AppError && error.code === 'SQL_BLOCKED') { res.json({ allowed: false, message: error.message }); return } throw error }
})
router.post('/ask', ask)
export default router
