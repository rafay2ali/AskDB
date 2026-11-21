
// Optional read-only smoke test; creates no persistent application account.
process.env.NODE_ENV='test'
const {readFileSync}=await import('node:fs')
const {createRequire}=await import('node:module')
const require=createRequire(import.meta.url)
const dotenv=require('dotenv')
const values=dotenv.parse(readFileSync('.env'))
if(!values.PGPASSWORD||!values.PGDATABASE||!values.PGUSER)throw new Error('This optional check needs PGDATABASE, PGUSER, and PGPASSWORD in the local .env. Normal users connect through the website.')
const module=await import('../src/app.ts'),app=module.default?.default||module.default
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port+'/api'
let cookie=''
async function post(path,body){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Check failed.');if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return data}
try{
  await post('/auth/register',{name:'Private verification',email:'verify-'+Date.now()+'@example.test',password:'private-check-'+crypto.randomUUID()})
  const config={host:values.PGHOST||'localhost',port:Number(values.PGPORT||5432),database:values.PGDATABASE,username:values.PGUSER,password:values.PGPASSWORD,ssl:'disable'}
  const tested=await post('/connections/test',{name:'Verification',config})
  const table=tested.tables.find(table=>!table.writable)
  if(!table)throw new Error('No SELECT-only table available for verification.')
  const saved=await post('/connections',{name:'Verification',config,tables:[{schema:table.schema,name:table.name}]})
  const quote=value=>'"'+value.replaceAll('"','""')+'"'
  const result=await post('/ask',{connectionId:saved.connection.id,question:'How many records are in '+quote(table.schema)+'.'+quote(table.name)+'? Return the count.'})
  console.log(JSON.stringify({success:true,engine:result.engine,returnedRows:result.rowCount,columns:result.columns,credentialsHidden:!('password' in saved.connection)}))
}catch(error){console.log(JSON.stringify({success:false,message:error instanceof Error?error.message:'Check failed.'}));process.exitCode=1}
finally{await new Promise(resolve=>server.close(resolve))}
