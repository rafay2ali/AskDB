import dotenv from 'dotenv'
import { resolve } from 'node:path'
dotenv.config({ path: resolve(__dirname, '../../.env'), quiet: true })
export const env = {
  port: Number(process.env.PORT || 5000),
  host: process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
  frontendOrigin: new URL(process.env.FRONTEND_ORIGIN || 'http://localhost:5173').origin,
  production: process.env.NODE_ENV === 'production',
  testing: process.env.NODE_ENV === 'test',
  appStorePath: process.env.APP_STORE_PATH || resolve(__dirname, '../../.data/accounts.sqlite'),
  encryptionKey: process.env.APP_ENCRYPTION_KEY || '',
  geminiKey: process.env.GEMINI_API_KEY?.trim() || '',
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
}
