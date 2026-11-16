import compression from 'compression'
import cookieParser from 'cookie-parser'
import express, { type ErrorRequestHandler } from 'express'
import { metaRouter } from './routes/meta.js'
import { authRouter } from './routes/auth.js'
import { layersRouter } from './routes/layers.js'
import { opsRouter } from './routes/ops.js'
import { resultsRouter } from './routes/results.js'
import { HttpError } from './validate.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // GeoJSON compresses ~5–10×; the zoomed-in layers are the main beneficiaries.
  app.use(compression())
  app.use(express.json({ limit: '20kb' }))
  app.use(cookieParser())

  app.use('/api', metaRouter, resultsRouter, opsRouter, layersRouter, authRouter)

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof HttpError) {
      if (error.status >= 500) console.error('[api]', error.message)
      res.status(error.status).json({ error: error.message, code: error.code, fields: error.fields })
      return
    }
    console.error('[api] unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
  app.use(errorHandler)

  return app
}
