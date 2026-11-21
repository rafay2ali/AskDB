import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const jobs = [
  ['Backend', 'node_modules/tsx/dist/cli.mjs', ['watch', 'src/server.ts']],
  ['Frontend', 'node_modules/vite/bin/vite.js', []],
]
const children = []
let stopping = false
function stop(code = 0) { if (stopping) return; stopping = true; for (const child of children) child.kill(); process.exitCode = code }
for (const [folder, executable, args] of jobs) {
  const child = spawn(process.execPath, [path.join(root, folder, executable), ...args], { cwd: path.join(root, folder), stdio: 'inherit' })
  children.push(child)
  child.on('error', error => { console.error(folder + ' could not start: ' + error.message); stop(1) })
  child.on('exit', code => { if (!stopping) stop(code || 0) })
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
