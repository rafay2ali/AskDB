import app from './app'
import { env } from './config/env'
app.listen(env.port, env.host, () => console.log('AskDB platform listening on ' + env.host + ':' + env.port))
