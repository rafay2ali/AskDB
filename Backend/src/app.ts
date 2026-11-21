import express from 'express'
import cors from 'cors'
import { env } from './config/env'
import routes from './routes/ask.routes'
import { errorHandler } from './middleware/errorHandler'
const app = express()
app.disable('x-powered-by')
app.use(cors({ origin: (origin, callback) => callback(null, !origin || origin === env.frontendOrigin), credentials: true }))
app.use((req,res,next) => {
  res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Cache-Control','no-store')
  if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin && req.headers.origin !== env.frontendOrigin) { res.status(403).json({ error: 'Request origin is not allowed.', code: 'ORIGIN_REJECTED' }); return }
  next()
})
app.use(express.json({ limit: '80kb' }))
app.get('/', (_req,res) => res.send('AskDB backend is running'))
app.get('/health', (_req,res) => res.json({ status: 'ok', platform: 'PostgreSQL connections' }))
const requests = new Map<string,{count:number;reset:number}>()
app.use('/api', (req,res,next) => {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) { next(); return }
  const now = Date.now(), group = req.path.startsWith('/auth') ? 'auth' : req.path === '/ask' ? 'ask' : 'connections'
  const limit = group === 'auth' ? 15 : group === 'ask' ? 15 : 30
  for (const [key,value] of requests) if (value.reset<=now) requests.delete(key)
  const key = group + ':' + (req.ip || 'local'), bucket = requests.get(key) || {count:0,reset:now+60000}
  requests.set(key,bucket)
  if (++bucket.count>limit) { res.setHeader('Retry-After',Math.ceil((bucket.reset-now)/1000)); res.status(429).json({error:'Too many requests. Wait a minute and try again.',code:'RATE_LIMIT'}); return }
  next()
})
app.use('/api',routes)
app.use((_req,res) => res.status(404).json({error:'Endpoint not found.'}))
app.use(errorHandler)
export default app
