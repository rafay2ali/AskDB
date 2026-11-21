import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../types/index'
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent || res.destroyed) return
  if (error instanceof ZodError) { res.status(400).json({ error: error.issues[0]?.code === 'unrecognized_keys' ? 'Request contains unexpected fields.' : (error.issues[0]?.path.join('.') || 'Request') + ': ' + (error.issues[0]?.message || 'Invalid value.'), code: 'INPUT_INVALID' }); return }
  if (error instanceof SyntaxError) { res.status(400).json({ error: 'Request body must contain valid JSON.', code: 'INPUT_INVALID' }); return }
  if (error instanceof AppError) { res.status(error.status).json({ error: error.message, code: error.code }); return }
  if (error?.type === 'entity.too.large') { res.status(413).json({ error: 'Request body is too large.', code: 'INPUT_TOO_LARGE' }); return }
  console.error('Unexpected request failure:', error instanceof Error ? error.name : 'UnknownError')
  res.status(500).json({ error: 'The query could not be completed. Try again.', code: 'INTERNAL_ERROR' })
}
