import app from './app'
import { env } from './config/env'
app.listen(env.port, '127.0.0.1', () => console.log('AskDB platform running on http://localhost:' + env.port))
