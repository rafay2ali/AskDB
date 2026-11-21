import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
const tests = readdirSync('src/tests').filter(name=>name.endsWith('.test.ts')).map(name=>'src/tests/'+name)
const result = spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','--test',...tests],{stdio:'inherit',env:{...process.env,NODE_ENV:'test',APP_STORE_PATH:':memory:'}})
process.exitCode=result.status??1
