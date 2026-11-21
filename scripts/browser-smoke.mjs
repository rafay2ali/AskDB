import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createRequire } from 'node:module'
process.env.NODE_ENV = 'test'
const appModule = await import('../Backend/src/app.ts')
const app = appModule.default?.default || appModule.default
const envModule = await import('../Backend/src/config/env.ts')
const env = envModule.env || envModule.default.env
const require = createRequire(import.meta.url)
const dotenv = require('../Backend/node_modules/dotenv')
const privateConfig = dotenv.parse(fs.readFileSync('Backend/.env'))
const dbConfig = { host: privateConfig.PGHOST || 'localhost', port: Number(privateConfig.PGPORT || 5432), database: privateConfig.PGDATABASE || '', username: privateConfig.PGUSER || '', password: privateConfig.PGPASSWORD || '', ssl: 'disable' }
const realFetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  if (String(input).startsWith('https://generativelanguage.googleapis.com/')) {
    const prompt = JSON.parse(init.body).systemInstruction.parts[0].text
    const table = JSON.parse(prompt.split('Selected schema: ')[1])[0]
    const quote = value => '"' + value.replaceAll('"', '""') + '"'
    const sql = 'SELECT COUNT(*)::integer AS record_count FROM ' + quote(table.schema) + '.' + quote(table.name)
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ title: 'Record count', sql, chart: false, explanation: 'Counts rows in your selected table.', refusal: '' }) }] } }] }))
  }
  return realFetch(input, init)
}
import { createServer, request as httpRequest } from 'node:http'

const root = process.cwd()
const out = path.join(root, '.qa')
fs.mkdirSync(out, { recursive: true })
const backend = app.listen(0, '127.0.0.1')
await once(backend, 'listening')
const address = backend.address()
const frontend = createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const proxy = httpRequest({ hostname: '127.0.0.1', port: address.port, path: req.url, method: req.method, headers: req.headers }, upstream => { res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res) })
    proxy.on('error', () => { res.statusCode = 502; res.end('{}') }); req.pipe(proxy); return
  }
  const pathname = new URL(req.url, 'http://localhost').pathname
  const dist = path.join(root, 'Frontend/dist')
  const file = path.resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname))
  if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; res.end('Not found'); return }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream')
  fs.createReadStream(file).pipe(res)
})
frontend.listen(0, '127.0.0.1')
await once(frontend, 'listening')
const front = frontend.address()
env.frontendOrigin = 'http://127.0.0.1:' + front.port
let browser, socket
const pending = new Map()
let counter = 0, session
const browserErrors = []
function command(method, params = {}, sessionId) {
  const id = ++counter
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Browser command timed out: ' + method)) }, 15000)
    pending.set(id, { resolve, reject, timer })
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
}
async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, session)
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text + ' / ' + response.exceptionDetails.exception?.description)
  return response.result?.value
}
async function waitFor(expression) {
  const result = await evaluate('(async()=>{for(let i=0;i<100;i++){if(' + expression + ')return true;await new Promise(r=>setTimeout(r,100))}return false})()')
  assert.equal(result, true, expression)
}
async function screenshot(name) {
  const result = await command('Page.captureScreenshot', { format: 'png' }, session)
  fs.writeFileSync(path.join(out, name), Buffer.from(result.data, 'base64'))
}
async function fill(selector, value) {
  await evaluate('(()=>{const input=document.querySelector(' + JSON.stringify(selector) + ');input.focus();const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input),"value").set;setter.call(input,'+JSON.stringify(String(value))+');input.dispatchEvent(new Event("input",{bubbles:true}));return true})()')
}
try {
  browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + path.join(out, 'browser-profile'), 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Browser did not start')), 20000)
    let output = ''
    browser.stderr.on('data', chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); resolve(match[1]) } })
    browser.on('error', error => { clearTimeout(timer); reject(error) })
  })
  socket = new WebSocket(endpoint)
  await once(socket, 'open')
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
    if (!message.id) return
    const job = pending.get(message.id)
    if (!job) return
    clearTimeout(job.timer); pending.delete(message.id)
    if (message.error) job.reject(new Error(message.error.message)); else job.resolve(message.result)
  })
  const target = await command('Target.createTarget', { url: 'about:blank' })
  session = (await command('Target.attachToTarget', { targetId: target.targetId, flatten: true })).sessionId
  await command('Page.enable', {}, session)
  await command('Runtime.enable', {}, session)
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false }, session)
  await command('Page.navigate', { url: 'http://127.0.0.1:' + front.port }, session)
  await waitFor("document.querySelector('#hero-title')")
  await waitFor("document.querySelector('.status-badge')?.textContent.includes('SYSTEM ONLINE')")
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'desktop overflow')
  await screenshot('landing-desktop.png')
  await evaluate("document.querySelector('.avatar').click()")
  await waitFor("document.querySelector('.header-dropdown')")
  await evaluate("[...document.querySelectorAll('.header-dropdown button')].find(b=>b.textContent.includes('Pause animations')).click()")
  await waitFor("document.querySelector('.motion-paused')")
  await evaluate("[...document.querySelectorAll('.header-dropdown button')].find(b=>b.textContent.includes('Resume animations')).click(); document.querySelector('.avatar').click()")
  await evaluate("document.querySelector('.hero-buttons .secondary').click()")
  await waitFor("document.querySelector('.stage-explanation').textContent.includes('WALKTHROUGH / 01')")
  await evaluate("document.querySelectorAll('.stage-button')[3].click()")
  assert.equal(await evaluate("document.querySelector('.stage-explanation h3').textContent"), 'ANSWER')

  await evaluate("document.querySelector('.hero-buttons .primary').click()")
  await waitFor("document.querySelector('.auth-panel .auth-switch')")
  await evaluate("document.querySelector('.auth-switch').click()")
  await waitFor("document.querySelector('.auth-panel input[name=name]')")
  const accountEmail='browser-'+Date.now()+'@example.test',accountPassword='Browser-private-password-2026'
  await fill('.auth-panel input[name=name]','Browser Check')
  await fill('.auth-panel input[name=email]',accountEmail)
  await fill('.auth-panel input[name=password]',accountPassword)
  await evaluate("document.querySelector('.auth-panel form').requestSubmit()")
  await waitFor("document.querySelector('.connections-dashboard')")
  await screenshot('platform-connections-empty.png')
  await evaluate("document.querySelector('.connections-dashboard .primary').click()")
  await waitFor("document.querySelector('.connection-form input[name=database]')")
  await screenshot('platform-connection-form.png')
  if(dbConfig.database&&dbConfig.username&&dbConfig.password){
    await fill('input[name=connectionName]','Private browser verification')
    for(const name of ['host','port','database','username','password'])await fill('.connection-form input[name='+name+']',dbConfig[name])
    await evaluate("document.querySelector('.connection-form form').requestSubmit()")
    await waitFor("document.querySelector('.table-picker') || document.querySelector('.connection-form .workspace-error')")
    assert.equal(await evaluate("!!document.querySelector('.table-picker')"),true,'live connection test failed')
    await evaluate("document.querySelector('.table-picker input[type=checkbox]:not(:disabled)').click()")
    await evaluate("[...document.querySelectorAll('.connection-form>button')].find(button=>button.textContent.includes('SAVE & OPEN')).click()")
    await waitFor("document.querySelector('.live-query-workspace .workspace-mode')?.textContent.includes('LIVE DATABASE VERIFIED')")
    await fill('#workspace-question','Count records in the selected table.')
    await evaluate("document.querySelector('.workspace-question').requestSubmit()")
    await waitFor("document.querySelector('.workspace-results tbody tr') || document.querySelector('.workspace-main>.workspace-error')")
    assert.equal(await evaluate("!!document.querySelector('.workspace-results tbody tr')"),true,'live query result missing')
    assert.equal(await evaluate("document.querySelector('.workspace-result-meta').textContent.includes('PostgreSQL')"),true)
    await screenshot('platform-live-query.png')
    await evaluate("[...document.querySelectorAll('.workspace-connection-bar button')].find(button=>button.textContent.includes('Manage')).click()")
    await waitFor("document.querySelector('.connection-card')")
    await evaluate("[...document.querySelectorAll('.connection-card-actions button')].find(button=>button.textContent==='Disconnect').click()")
    await waitFor("document.querySelector('.connection-disabled')")
    await evaluate("[...document.querySelectorAll('.connection-card-actions button')].find(button=>button.textContent.includes('Test & reconnect')).click()")
    await waitFor("document.querySelector('.connection-enabled')")
    await evaluate("document.querySelector('.connection-card-actions .danger-button').click()")
    await waitFor("document.querySelector('.delete-confirm')")
    await evaluate("document.querySelector('.delete-confirm .danger-button').click()")
    await waitFor("!document.querySelector('.connection-card')")
  }else{
    await evaluate("[...document.querySelectorAll('.connection-form button')].find(button=>button.textContent==='Cancel').click()")
  }
  await evaluate("[...document.querySelectorAll('.account-actions button')].find(button=>button.textContent==='Sign out').click()")
  await waitFor("document.querySelector('.auth-panel')")
  await fill('.auth-panel input[name=email]',accountEmail)
  await fill('.auth-panel input[name=password]',accountPassword)
  await evaluate("document.querySelector('.auth-panel form').requestSubmit()")
  await waitFor("document.querySelector('.connections-dashboard')")
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false }, session)
  await evaluate("document.querySelector('.workspace-overlay').scrollTo({top:0,behavior:'instant'})")
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'mobile overflow')
  await screenshot('platform-mobile.png')
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'},session)
  await waitFor("!document.querySelector('.workspace-overlay')")
  await evaluate("window.scrollTo({top:0,behavior:'instant'})")
  await screenshot('landing-mobile.png')
  assert.deepEqual(browserErrors, [], 'browser runtime errors')
  console.log(JSON.stringify({ success: true, checks: ['landing controls', 'account registration/login/logout', 'connection form', 'desktop/mobile overflow', 'Escape closes platform'], liveDatabaseFlow: Boolean(dbConfig.password && dbConfig.database), screenshots: ['.qa/landing-desktop.png', '.qa/landing-mobile.png'] }))
} catch (error) {
  console.log(JSON.stringify({ browserErrors, page: await evaluate('({url:location.href,text:document.body.innerText.slice(0,500)})').catch(()=>null) }));
  await screenshot('landing-failure.png').catch(()=>{});
  throw error
} finally {
  if (socket?.readyState === 1) { await command('Browser.close').catch(() => {}); socket.close() }
  else browser?.kill()
  for (const job of pending.values()) clearTimeout(job.timer)
  await new Promise(resolve => frontend.close(resolve))
  await new Promise(resolve => backend.close(resolve))
}
