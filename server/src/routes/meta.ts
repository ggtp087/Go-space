import { Router } from 'express'
import { pool, query } from '../db.js'
import { OPS_TYPE_KEY_BY_ID } from '../opsTypes.js'
import { parseSearchQuery } from '../validate.js'
import { loadYears } from '../years.js'

export const metaRouter = Router()

/** GET /api/health — 200 when the database answers, 503 when it doesn't. */
metaRouter.get('/health', async (_req, res) => {
  try {
    const rows = await query<{ postgis: string }>('health', 'select postgis_lib_version() as postgis')
    res.json({ status: 'ok', database: 'up', postgis: rows[0]?.postgis, pool: { total: pool.totalCount, idle: pool.idleCount } })
  } catch (error) {
    console.error('[health]', error)
    res.status(503).json({ status: 'error', database: 'down' })
  }
})

/**
 * GET /api/years — every analysis year. status "pending" = no sub-district
 * results yet (e.g. 2026 before registry data); the year stays selectable.
 * latest_year_with_results is the UI's default year.
 */
metaRouter.get('/years', async (_req, res) => {
  const years = await loadYears()
  const withResults = years.filter((y) => y.status === 'ok')
  res.json({
    years: years.map(({ year, analysis_id, population_year, status }) => ({ year, analysis_id, population_year, status })),
    latest_year_with_results: withResults.length ? withResults[withResults.length - 1].year : null,
  })
})

/** GET /api/departments — app.departments for the register / profile forms. */
metaRouter.get('/departments', async (_req, res) => {
  const rows = await query<{ department_id: number; name_th: string; name_en: string }>(
    'departments',
    'select department_id, name_th, name_en from app.departments order by department_id',
  )
  res.json(rows)
})

/** GET /api/positions — app.positions for the register / profile forms. */
metaRouter.get('/positions', async (_req, res) => {
  const rows = await query<{ position_id: number; name_th: string; name_en: string }>(
    'positions',
    'select position_id, name_th, name_en from app.positions order by position_id',
  )
  res.json(rows)
})

/** GET /api/ops-types — the lookup table with the front end's type keys. */
metaRouter.get('/ops-types', async (_req, res) => {
  const rows = await query<{ ops_type_id: number; ops_type_name_th: string; ops_type_name_en: string }>(
    'ops types',
    'select ops_type_id, ops_type_name_th, ops_type_name_en from spatial.open_public_space_types order by ops_type_id',
  )
  res.json(rows.map((r) => ({ id: r.ops_type_id, key: OPS_TYPE_KEY_BY_ID[r.ops_type_id], name_th: r.ops_type_name_th, name_en: r.ops_type_name_en })))
})

const SEARCH_LIMIT = 8

/** Escapes LIKE wildcards so user input only ever matches literally. */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, '\\$&')}%`
}

/**
 * GET /api/search?q= — districts, sub-districts and OPS whose Thai or
 * English name contains q (parameterized ILIKE, at most 8 of each).
 */
metaRouter.get('/search', async (req, res) => {
  const q = parseSearchQuery(req.query.q)
  const pattern = likePattern(q)
  const [districts, subdistricts, ops] = await Promise.all([
    query<{ id: string; name_th: string; name_en: string | null }>(
      'search districts',
      `select district_code as id, district_name_th as name_th, district_name_en as name_en
         from spatial.districts
        where district_name_th ilike $1 escape '\\' or district_name_en ilike $1 escape '\\'
        order by district_code limit $2`,
      [pattern, SEARCH_LIMIT],
    ),
    query<{ id: string; name_th: string; name_en: string | null; district_id: string }>(
      'search subdistricts',
      `select s.subdistrict_code as id, s.subdistrict_name_th as name_th, s.subdistrict_name_en as name_en, d.district_code as district_id
         from spatial.subdistricts s join spatial.districts d on d.district_id = s.district_id
        where s.subdistrict_name_th ilike $1 escape '\\' or s.subdistrict_name_en ilike $1 escape '\\'
        order by s.subdistrict_code limit $2`,
      [pattern, SEARCH_LIMIT],
    ),
    query<{ ops_id: number; name_th: string; name_en: string | null; ops_type_id: number; opened_year: number; subdistrict_id: string; district_id: string; geometry: unknown }>(
      'search ops',
      `select o.ops_id, o.ops_name_th as name_th, o.ops_name_en as name_en, o.ops_type_id, o.opened_year,
              s.subdistrict_code as subdistrict_id, d.district_code as district_id,
              ST_AsGeoJSON(ST_Transform(ST_PointOnSurface(o.ops_geom), 4326), 6)::json as geometry
         from spatial.open_public_spaces o
         join spatial.subdistricts s on s.subdistrict_id = o.primary_subdistrict_id
         join spatial.districts d on d.district_id = s.district_id
        where o.ops_name_th ilike $1 escape '\\' or o.ops_name_en ilike $1 escape '\\'
        order by o.ops_area_sqm desc, o.ops_id limit $2`,
      [pattern, SEARCH_LIMIT],
    ),
  ])
  res.json({
    q,
    districts,
    subdistricts,
    ops: ops.map(({ ops_type_id, ...row }) => ({ ...row, ops_type: OPS_TYPE_KEY_BY_ID[ops_type_id] })),
  })
})
