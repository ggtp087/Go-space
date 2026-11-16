// Applies server/migrations/*.sql in filename order. Each file is idempotent
// and wraps itself in BEGIN/COMMIT, so re-running is safe; a failing file
// rolls back and stops the run. Migrations may only touch schema app.
//   npm --prefix server run migrate
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const envFile = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

const dir = fileURLToPath(new URL('../migrations/', import.meta.url))
const files = readdirSync(dir)
  .filter((f) => /^\d+_.+\.sql$/.test(f))
  .sort()

// Guard: refuse anything that names schema spatial (the analysis data is read-only).
for (const file of files) {
  if (/\bspatial\./i.test(readFileSync(dir + file, 'utf8'))) {
    console.error(`[migrate] ${file} references schema spatial — refusing to run`)
    process.exit(1)
  }
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  for (const file of files) {
    process.stdout.write(`[migrate] ${file} … `)
    try {
      await client.query(readFileSync(dir + file, 'utf8'))
      console.log('ok')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      console.log('FAILED')
      throw error
    }
  }
} finally {
  await client.end()
}
