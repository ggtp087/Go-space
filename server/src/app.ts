import express, { type ErrorRequestHandler } from 'express'
import { metaRouter } from './routes/meta.js'
import { opsRouter } from './routes/ops.js'
import { resultsRouter } from './routes/results.js'
import { HttpError } from './validate.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')

  app.use('/api', metaRouter, resultsRouter, opsRouter)

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof HttpError) {
      if (error.status >= 500) console.error('[api]', error.message)
      res.status(error.status).json({ error: error.message })
      return
    }
    console.error('[api] unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
  app.use(errorHandler)

  return app
}
