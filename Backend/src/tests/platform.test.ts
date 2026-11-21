import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { generateQuery } from '../services/aiService'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Client } from 'pg'
import app from '../app'
import { store } from '../db/accountStore'
import { env } from '../config/env'
import { encrypt,decrypt } from '../services/credentialService'
import { hashPassword,verifyPassword } from '../services/authService'
import { validateSql } from '../services/sqlGuard'
import { selectedSchema } from '../services/schemaService'
import { isPrivateAddress,resolveHost } from '../db/postgres'
import type { ConnectionConfig,SchemaTable } from '../types/index'
const selected=[{schema:'analytics',name:'events'}]
const tables:SchemaTable[]=[{...selected[0],columns:[{name:'name',type:'text'},{name:'amount',type:'numeric'}],writable:false,relationships:[]}]
const config:ConnectionConfig={host:'127.0.0.1',port:5432,database:'private_analytics',username:'reader',password:'private-database-secret',ssl:'disable'}
test('passwords are salted and encrypted credentials are bound to account and connection',async()=>{
  const a=await hashPassword('long-private-password'),b=await hashPassword('long-private-password')
  assert.notEqual(a,b);assert.equal(await verifyPassword('long-private-password',a),true);assert.equal(await verifyPassword('wrong',a),false)
  const encrypted=encrypt(config,'alice','connection-a');assert.ok(!encrypted.includes(config.password));assert.deepEqual(decrypt(encrypted,'alice','connection-a'),config)
  assert.throws(()=>decrypt(encrypted,'bob','connection-a'));assert.throws(()=>decrypt(encrypted,'alice','connection-b'))
})
test('dynamic SQL guard accepts only selected schema-qualified tables and analytics',()=>{
  for(const sql of ['SELECT name FROM analytics.events','SELECT ROUND(SUM(amount)::numeric,2) AS revenue FROM analytics.events','SELECT name FROM analytics.events WHERE amount>(SELECT AVG(amount) FROM analytics.events)'])assert.match(validateSql(sql,selected),/LIMIT 1000$/)
  for(const sql of ['SELECT * FROM events','SELECT * FROM public.events','SELECT * FROM analytics.accounts','SELECT * FROM pg_catalog.pg_authid','SELECT pg_sleep(3) FROM analytics.events','SELECT evil.lower(name) FROM analytics.events','SELECT name INTO stolen FROM analytics.events','DELETE FROM analytics.events','SELECT * FROM analytics.events; DROP TABLE analytics.events','SELECT name::evil_type FROM analytics.events','WITH x AS (SELECT * FROM analytics.events) SELECT * FROM x'])assert.throws(()=>validateSql(sql,selected),sql)
  assert.throws(()=>validateSql('SELECT * FROM analytics.events',[]))
  assert.deepEqual(selectedSchema(tables,selected),tables);assert.throws(()=>selectedSchema([{...tables[0],writable:true}],selected));assert.throws(()=>selectedSchema(tables,[{schema:'elsewhere',name:'events'}]))
})
test('production connection policy blocks private addresses and TLS bypass',async()=>{
  for(const ip of ['127.0.0.1','10.1.2.3','192.168.1.1','169.254.169.254','::1','::ffff:127.0.0.1','fc00::1'])assert.equal(isPrivateAddress(ip),true)
  assert.equal(isPrivateAddress('8.8.8.8'),false)
  const previous=env.production;env.production=true
  try{await assert.rejects(resolveHost(config),/TLS/);await assert.rejects(resolveHost({...config,ssl:'verify-full'}),/not allowed/)}finally{env.production=previous}
})
test('accounts, sessions, connection onboarding, tenant isolation and real query pipeline',async t=>{
  const statements:string[]=[];let writable=false;let sql='SELECT name,amount FROM analytics.events';let connectError=false
  t.mock.method(Client.prototype,'connect',async()=>{if(connectError)throw Object.assign(new Error('hidden secret'),{code:'28P01'})})
  t.mock.method(Client.prototype,'end',async()=>{})
  t.mock.method(Client.prototype,'query',async(query: string|{text:string})=>{
    const text=typeof query==='string'?query:query.text;statements.push(text)
    if(text.includes('rolsuper'))return{rows:[{rolsuper:false,rolcreaterole:false,rolcreatedb:false,rolbypassrls:false}],fields:[]}
    if(text.includes('format_type'))return{rows:[{schema_name:'analytics',table_name:'events',column_name:'name',data_type:'text',writable},{schema_name:'analytics',table_name:'events',column_name:'amount',data_type:'numeric',writable},{schema_name:'analytics',table_name:'accounts',column_name:'id',data_type:'integer',writable:false}],fields:[]}
    if(text.includes('pg_get_constraintdef'))return{rows:[],fields:[]}
    if(text.startsWith('SELECT * FROM ('))return{rows:[{name:'Live record',amount:'123.45'}],fields:[{name:'name',dataTypeID:25},{name:'amount',dataTypeID:1700}]}
    return{rows:[],fields:[]}
  })
  const nativeFetch=globalThis.fetch;const previousKey=env.geminiKey;env.geminiKey='test-only-provider-key'
  t.mock.method(globalThis,'fetch',async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
    if(String(input).startsWith('https://generativelanguage.googleapis.com/')){
      const body=String(init?.body);assert.ok(body.includes('analytics'));assert.ok(!body.includes(config.password));assert.ok(!body.includes('Live record'))
      return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({title:'Events',sql,chart:true,explanation:'Reads the selected events table.',refusal:''})}]}}]}))
    }
    return nativeFetch(input,init)
  })
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();assert.ok(address&&typeof address==='object');const base='http://127.0.0.1:'+address.port
  const request=(path:string,method='GET',body?:unknown,cookie?:string,origin?:string)=>fetch(base+'/api'+path,{method,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})})
  try{
    assert.equal((await request('/connections')).status,401)
    assert.equal((await request('/ask','POST',{question:'anything'})).status,401)
    const register=await request('/auth/register','POST',{name:'Alice',email:'alice@example.test',password:'alice-private-password'});assert.equal(register.status,201);const cookie=register.headers.get('set-cookie')!.split(';')[0];assert.match(register.headers.get('set-cookie')!,/HttpOnly; SameSite=Strict/);const alice=(await register.json()).user
    assert.ok(!(JSON.stringify(store.prepare('SELECT * FROM users').all())).includes('alice-private-password'))
    assert.equal((await request('/auth/me','GET',undefined,cookie)).status,200)
    assert.equal((await request('/connections/test','POST',{name:'Analytics',config},cookie,'https://untrusted.example')).status,403)
    const tested=await request('/connections/test','POST',{name:'Analytics',config},cookie);assert.equal(tested.status,200);assert.equal((await tested.json()).tables.length,2)
    writable=true;assert.equal((await request('/connections','POST',{name:'Analytics',config,tables:selected},cookie)).status,422);writable=false
    const saved=await request('/connections','POST',{name:'Analytics',config,tables:selected},cookie);assert.equal(saved.status,201);const connection=(await saved.json()).connection;assert.ok(!('password'in connection));assert.ok(!JSON.stringify(connection).includes(config.password))
    assert.ok(!JSON.stringify(store.prepare('SELECT * FROM connections').all()).includes(config.password))
    const id=connection.id
    assert.equal((await (await request('/connections/'+id+'/schema','GET',undefined,cookie)).json()).tables.length,1)
    const bobResponse=await request('/auth/register','POST',{name:'Bob',email:'bob@example.test',password:'bob-private-password'});const bob=bobResponse.headers.get('set-cookie')!.split(';')[0]
    assert.equal((await (await request('/connections','GET',undefined,bob)).json()).connections.length,0)
    for(const[path,method,body]of [[ '/connections/'+id+'/schema','GET',undefined],['/connections/'+id+'/test','POST',undefined],['/connections/'+id+'/tables','PUT',{tables:selected}],['/connections/'+id,'DELETE',undefined],['/ask','POST',{connectionId:id,question:'Show events'}],['/validate','POST',{connectionId:id,sql}],['/history?connectionId='+id,'GET',undefined]]as const)assert.equal((await request(path,method,body,bob)).status,404,path)
    const answer=await request('/ask','POST',{connectionId:id,question:'Show all events'},cookie);assert.equal(answer.status,200);const data=await answer.json();assert.equal(data.rows[0].amount,123.45);assert.equal(data.engine,'PostgreSQL / private_analytics');assert.equal(data.columns[0],'name')
    assert.equal((await (await request('/history?connectionId='+id,'GET',undefined,cookie)).json()).history.length,1)
    sql='SELECT * FROM analytics.accounts';assert.equal((await request('/ask','POST',{connectionId:id,question:'Show accounts'},cookie)).status,400)
    assert.equal((await request('/connections/'+id+'/tables','PUT',{tables:[{schema:'analytics',name:'accounts'}]},cookie)).status,200)
    assert.equal((await (await request('/validate','POST',{connectionId:id,sql:'SELECT name FROM analytics.events'},cookie)).json()).allowed,false)
    assert.equal((await request('/connections/'+id+'/tables','PUT',{tables:selected},cookie)).status,200)
    const verdict=await(await request('/validate','POST',{connectionId:id,sql:'DROP TABLE analytics.events'},cookie)).json();assert.equal(verdict.allowed,false)
    await request('/connections/'+id+'/disconnect','POST',undefined,cookie);assert.equal((await request('/ask','POST',{connectionId:id,question:'Show events'},cookie)).status,409)
    connectError=true;const failed=await request('/connections/'+id+'/test','POST',undefined,cookie);assert.equal(failed.status,422);assert.ok(!(await failed.text()).includes('hidden secret'));connectError=false
    assert.equal((await request('/connections/'+id+'/test','POST',undefined,cookie)).status,200)
    assert.equal((await request('/connections/'+id,'DELETE',undefined,cookie)).status,200);assert.equal(store.prepare('SELECT * FROM history WHERE user_id=?').all(alice.id).length,0)
    await request('/auth/logout','POST',undefined,cookie);assert.equal((await request('/connections','GET',undefined,cookie)).status,401)
    assert.equal((await request('/auth/login','POST',{email:'alice@example.test',password:'wrong'})).status,401)
    const again=await request('/auth/login','POST',{email:'alice@example.test',password:'alice-private-password'});assert.equal(again.status,200)
    const renewed=again.headers.get('set-cookie')!.split(';')[0];store.prepare('UPDATE sessions SET expires_at=? WHERE user_id=?').run(Date.now()-1,alice.id);assert.equal((await request('/connections','GET',undefined,renewed)).status,401)
    assert.ok(statements.includes('BEGIN READ ONLY'));assert.ok(statements.every(statement=>!/^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i.test(statement)))
  }finally{env.geminiKey=previousKey;await new Promise<void>(resolve=>server.close(()=>resolve()))}
})

test('Gemini has no template fallback and handles provider refusal and invalid responses safely',async()=>{
  await assert.rejects(generateQuery('Count events',tables,{key:''}),/configure GEMINI_API_KEY/)
  for(const status of [400,403,404,429,500]){
    const fetcher=(async()=>new Response(JSON.stringify({error:'private-provider-key'}),{status})) as typeof fetch
    await assert.rejects(generateQuery('Count events',tables,{key:'private-provider-key',fetcher}),(error:unknown)=>{assert.ok(error instanceof Error);assert.ok(!error.message.includes('private-provider-key'));return true})
  }
  const response=(output:unknown)=>(async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]}))) as typeof fetch
  await assert.rejects(generateQuery('Delete events',tables,{key:'fake',fetcher:response({title:'Refused',sql:'',chart:false,explanation:'',refusal:'Read-only questions only.'})}),/Read-only/)
  await assert.rejects(generateQuery('Count events',tables,{key:'fake',fetcher:response({sql:12})}),/invalid query response/)
})

test('account and encrypted connection settings survive process restarts',()=>{
  const folder=resolve('../.qa/store-persistence-'+randomUUID());mkdirSync(folder,{recursive:true})
  const childEnv={...process.env,NODE_ENV:'development',APP_STORE_PATH:resolve(folder,'accounts.sqlite'),APP_ENCRYPTION_KEY:''}
  const seed="const {register}=require('./src/services/authService');const {saveConnection}=require('./src/services/connectionService');(async()=>{const user=await register('Persistence','persist@example.test','persistent-account-password');saveConnection(user.id,'Saved database',{host:'localhost',port:5432,database:'own_database',username:'reader',password:'persistent-private-password',ssl:'disable'},[{schema:'app',name:'records'}]);console.log('saved')})().catch(()=>process.exitCode=1)"
  const first=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','-e',seed],{env:childEnv,encoding:'utf8'});assert.equal(first.status,0,'first store process failed')
  const read="const {store}=require('./src/db/accountStore');const {ownedConnection}=require('./src/services/connectionService');const row=store.prepare('SELECT * FROM connections').get();const saved=ownedConnection(row.user_id,row.id);console.log(JSON.stringify({ok:saved.config.password==='persistent-private-password',encrypted:!row.encrypted_config.includes('persistent-private-password')}))"
  const second=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','-e',read],{env:childEnv,encoding:'utf8'});assert.equal(second.status,0,'restarted store process failed');assert.deepEqual(JSON.parse(second.stdout.trim()),{ok:true,encrypted:true})
})
