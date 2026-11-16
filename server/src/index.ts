import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// server/.env (gitignored) — loaded before anything reads process.env.
const envFile = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

const { createApp } = await import('./app.js')
const { pool } = await import('./db.js')
const { verifyOpsTypes } = await import('./opsTypes.js')
const { loadYears } = await import('./years.js')

const port = Number(process.env.PORT ?? 3001)

try {
  await verifyOpsTypes()
  const years = await loadYears()
  console.info(`[api] database ok — years ${years.map((y) => `${y.year}${y.status === 'pending' ? ' (pending)' : ''}`).join(', ')}`)
} catch (error) {
  // Still start, so /api/health can report the problem.
  console.error('[api] startup check failed:', error)
}

const server = createApp().listen(port, () => console.info(`[api] listening on http://localhost:${port}`))

function shutdown() {
  server.close(() => void pool.end().then(() => process.exit(0)))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
