import type { User,ConnectionConfig,SavedConnection,SchemaTable,TableRef,SchemaResponse,QueryResult,HistoryEntry } from '../types/workspace'
export class ApiError extends Error { status: number; constructor(message: string,status: number) { super(message); this.status=status } }
async function request<T>(path: string,init?: RequestInit): Promise<T> {
  try {
    const timeout = AbortSignal.timeout(45000)
    const response = await fetch('/api'+path,{...init,credentials:'include',signal:init?.signal?AbortSignal.any([init.signal,timeout]):timeout})
    const data = await response.json().catch(()=>null)
    if (!response.ok) {
      if (response.status===401&&!path.startsWith('/auth/')) window.dispatchEvent(new Event('askdb:session-expired'))
      throw new ApiError(data?.error || 'The request could not be completed.',response.status)
    }
    if (!data) throw new Error('Unexpected response. Make sure the backend is running.')
    return data as T
  } catch(error) {
    if (error instanceof TypeError) throw new Error('Cannot reach AskDB. Start the app with npm run dev and try again.')
    if (error instanceof DOMException&&error.name==='TimeoutError') throw new Error('The request timed out. Please try again.')
    throw error
  }
}
const json=(method:string,body?:unknown):RequestInit=>({method,headers:{'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})})
export const platformStatus=()=>request<{status:string;aiConfigured:boolean;model:string}>('/status')
export const me=()=>request<{user:User|null}>('/auth/me')
export const register=(name:string,email:string,password:string)=>request<{user:User}>('/auth/register',json('POST',{name,email,password}))
export const login=(email:string,password:string)=>request<{user:User}>('/auth/login',json('POST',{email,password}))
export const logout=()=>request<{success:boolean}>('/auth/logout',json('POST'))
export const connections=()=>request<{connections:SavedConnection[]}>('/connections')
export const testConnection=(name:string,config:ConnectionConfig)=>request<{success:boolean;tables:SchemaTable[];message:string}>('/connections/test',json('POST',{name,config}))
export const saveConnection=(name:string,config:ConnectionConfig,tables:TableRef[])=>request<{connection:SavedConnection}>('/connections',json('POST',{name,config,tables}))
export const connectionTables=(id:string)=>request<{tables:SchemaTable[];selected:TableRef[]}>('/connections/'+id+'/tables')
export const saveSelection=(id:string,tables:TableRef[])=>request('/connections/'+id+'/tables',json('PUT',{tables}))
export const reconnect=(id:string)=>request<{success:boolean;message:string}>('/connections/'+id+'/test',json('POST'))
export const disconnect=(id:string)=>request('/connections/'+id+'/disconnect',json('POST'))
export const removeConnection=(id:string)=>request('/connections/'+id,json('DELETE'))
export const fetchSchema=(id:string)=>request<SchemaResponse>('/connections/'+id+'/schema')
export const askQuestion=(connectionId:string,question:string,signal?:AbortSignal)=>request<QueryResult>('/ask',{...json('POST',{connectionId,question}),signal})
export const validateQuery=(connectionId:string,sql:string)=>request<{allowed:boolean;message:string}>('/validate',json('POST',{connectionId,sql}))
export const fetchHistory=(id:string)=>request<{history:HistoryEntry[]}>('/history?connectionId='+encodeURIComponent(id))
export const clearHistory=(id:string)=>request('/history?connectionId='+encodeURIComponent(id),json('DELETE'))
