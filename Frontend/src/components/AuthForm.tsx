import { useState } from 'react'
import * as api from '../services/api'
import type { User } from '../types/workspace'
export default function AuthForm({onUser}:{onUser:(user:User)=>void}) {
  const [registering,setRegistering]=useState(false),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  async function submit(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError('')
    try { const data=registering?await api.register(name,email,password):await api.login(email,password);setPassword('');onUser(data.user) }
    catch(e){setError(e instanceof Error?e.message:'Could not sign in.')}
    finally{setBusy(false)}
  }
  return <section className="auth-panel"><div className="eyebrow">// YOUR_PRIVATE_WORKSPACE</div><h2>{registering?'Create your AskDB account.':'Welcome back.'}</h2><p>Connect your PostgreSQL database and ask questions about your own data.</p><form onSubmit={submit}>
    {registering&&<label>Your name<input name="name" autoFocus value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required maxLength={80} disabled={busy}/></label>}
    <label>Email<input autoFocus={!registering} name="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required maxLength={254} disabled={busy}/></label>
    <label>Password<input name="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={registering?'new-password':'current-password'} minLength={registering?10:1} maxLength={128} required disabled={busy}/>{registering&&<small>Use at least 10 characters. This is your AskDB password, not your database password.</small>}</label>
    {error&&<p className="workspace-error" role="alert">{error}</p>}<button className="button primary" disabled={busy}>{busy?'PLEASE WAIT...':registering?'CREATE ACCOUNT':'SIGN IN'}</button>
  </form><button className="auth-switch" disabled={busy} onClick={()=>{setRegistering(value=>!value);setPassword('');setError('')}}>{registering?'Already have an account? Sign in':'New to AskDB? Create an account'}</button><small>Connections and question history are private to your account.</small></section>
}
