import { query } from './db.js'

// spatial.open_public_space_types ids → the front end's stable type keys
// (src/config/opsTypes.ts). Checked against the table's English names at
// startup, so a reordered lookup table fails loudly instead of mislabelling.
export const OPS_TYPE_KEY_BY_ID: Record<number, string> = {
  1: 'public_park',
  2: 'park_15min',
  3: 'sports_ground',
  4: 'open_space',
}

export const OPS_TYPE_KEYS = Object.values(OPS_TYPE_KEY_BY_ID)

export const OPS_TYPE_ID_BY_KEY: Record<string, number> = Object.fromEntries(
  Object.entries(OPS_TYPE_KEY_BY_ID).map(([id, key]) => [key, Number(id)]),
)

const EXPECTED_NAME_EN: Record<number, string> = {
  1: 'Public park',
  2: '15-minute park',
  3: 'Community sports ground',
  4: 'Open space',
}

export async function verifyOpsTypes(): Promise<void> {
  const rows = await query<{ ops_type_id: number; ops_type_name_en: string }>(
    'ops types check',
    'select ops_type_id, ops_type_name_en from spatial.open_public_space_types order by ops_type_id',
  )
  const mismatch = rows.filter((r) => EXPECTED_NAME_EN[r.ops_type_id] !== r.ops_type_name_en)
  if (rows.length !== 4 || mismatch.length > 0) {
    throw new Error(`open_public_space_types no longer matches OPS_TYPE_KEY_BY_ID: ${JSON.stringify(rows)}`)
  }
}

/** SQL fragment: per-type OPS counts (int) from a row source aliased `o`. */
export const OPS_COUNT_COLUMNS = Object.entries(OPS_TYPE_KEY_BY_ID)
  .map(([id, key]) => `count(*) filter (where o.ops_type_id = ${Number(id)})::int as count_${key}`)
  .join(',\n          ')

export function opsCountObject(row: Record<string, unknown>): Record<string, number> {
  return Object.fromEntries(OPS_TYPE_KEYS.map((key) => [key, Number(row[`count_${key}`] ?? 0)]))
}
