import { z } from 'zod'
import { env } from '../config/env'
import { AppError } from '../types/index'
import type { QueryPlan, SchemaTable } from '../types/index'
import { buildSqlPrompt } from '../prompts/sqlPrompt'

const outputSchema = z.object({ title: z.string().min(1).max(160), sql: z.string().max(12000), chart: z.boolean(), explanation: z.string().max(2000), refusal: z.string().max(1000) })
const responseSchema = { type: 'object', properties: { title: { type: 'string' }, sql: { type: 'string' }, chart: { type: 'boolean' }, explanation: { type: 'string' }, refusal: { type: 'string' } }, required: ['title', 'sql', 'chart', 'explanation', 'refusal'], additionalProperties: false }
export type AiOptions = { key?: string; model?: string; fetcher?: typeof fetch; signal?: AbortSignal }
export async function generateQuery(question: string, schema: SchemaTable[], options: AiOptions = {}): Promise<QueryPlan> {
  const key = options.key ?? env.geminiKey
  if (!key) throw new AppError('The app owner must configure GEMINI_API_KEY on the backend.', 503, 'AI_CONFIGURATION')
  const model = options.model || env.geminiModel
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000)
  let response: Response
  try {
    response = await (options.fetcher || fetch)('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, signal,
      body: JSON.stringify({ systemInstruction: { parts: [{ text: buildSqlPrompt(schema) }] }, contents: [{ role: 'user', parts: [{ text: question }] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: responseSchema, maxOutputTokens: 4096 } }),
    })
  } catch (error) {
    if (options.signal?.aborted) throw new AppError('Request cancelled.', 499, 'CANCELLED')
    if (error instanceof DOMException && error.name === 'TimeoutError') throw new AppError('Gemini took too long. Please try again.', 504, 'AI_TIMEOUT')
    throw new AppError('Cannot reach Gemini. Check your internet connection.', 503, 'AI_UNAVAILABLE')
  }
  if (!response.ok) {
    // Never forward the provider body or request headers; they can contain credentials.
    if (response.status === 400 || response.status === 401 || response.status === 403) throw new AppError('Gemini rejected the configuration. Check GEMINI_API_KEY, model access, and API restrictions in Google AI Studio; restart the backend after changes.', 503, 'AI_CONFIGURATION')
    if (response.status === 429) throw new AppError('Gemini quota or rate limit reached. Check your Google AI Studio quota, wait,.', 429, 'AI_QUOTA')
    if (response.status === 404) throw new AppError('Gemini model unavailable. Set GEMINI_MODEL to a model enabled for your API key and restart the backend.', 503, 'AI_MODEL')
    throw new AppError('Gemini is temporarily unavailable. Try again later.', 503, 'AI_UNAVAILABLE')
  }
  try {
    const data = await response.json() as { candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[] }
    const candidate = data.candidates?.[0]
    if (candidate?.finishReason !== 'STOP') throw new Error('Incomplete model response')
    const text = candidate.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('') || ''
    const output = outputSchema.parse(JSON.parse(text))
    if (output.refusal || !output.sql.trim()) throw new AppError(output.refusal || 'Please ask a read-only question about the selected tables.', 422, 'QUESTION_UNSUPPORTED')
    return { title: output.title, sql: output.sql, chart: output.chart, explanation: output.explanation, translator: 'Gemini / ' + model }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Gemini returned an incomplete or invalid query response. Please rephrase your question and try again.', 502, 'AI_RESPONSE')
  }
}
