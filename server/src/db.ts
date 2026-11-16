import pg from 'pg'

// NUMERIC (oid 1700) comes back from pg as a string by default; the API
// keeps full precision as a JS number and leaves rounding to the UI.
pg.types.setTypeParser(1700, parseFloat)

/** Queries slower than this are logged, so slow endpoints are visible during development. */
const SLOW_QUERY_MS = 1000

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // PGPASSWORD (if set) is picked up by pg from the environment.
  max: 10,
  // This API is read-only: the database itself rejects any write from these
  // sessions, so a bug can never modify data. statement_timeout stops a
  // runaway query instead of letting it hold a connection.
  options: '-c default_transaction_read_only=on -c statement_timeout=15000',
})

export async function query<Row extends pg.QueryResultRow>(label: string, text: string, params: unknown[] = []): Promise<Row[]> {
  const started = performance.now()
  const result = await pool.query<Row>(text, params)
  const ms = performance.now() - started
  if (ms > SLOW_QUERY_MS) console.warn(`[slow query] ${label}: ${ms.toFixed(0)} ms (${result.rowCount} rows)`)
  return result.rows
}
