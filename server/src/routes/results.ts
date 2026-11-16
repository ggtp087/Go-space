import { Router } from 'express'
import { query } from '../db.js'
import { OPS_COUNT_COLUMNS, OPS_TYPE_KEYS, opsCountObject } from '../opsTypes.js'
import { HttpError, badRequest, parseAreaCode, parseEnum, parseInteger } from '../validate.js'
import { loadYears, resolveYear } from '../years.js'

export const resultsRouter = Router()

const LEVELS = ['subdistrict', 'district', 'bangkok'] as const

type ResultRow = {
  id: string
  name_en: string
  name_th: string
  parent_id: string | null
  total_area_sqm: number
  ops_area_sqm: number
  share_ops_pct: number
  total_population: number
  population_with_access: number
  access_pct: number
} & Record<string, unknown>

// Why OPS counts and OPS area can disagree for the same area:
// - ops_area_sqm / share_ops_pct come from assessment_results, where each OPS
//   polygon is clipped to the sub-district(s) it lies in (43 OPS cross a
//   sub-district boundary, so their area is split between two areas).
// - ops_count comes from open_public_spaces, counting each OPS once in its
//   primary_subdistrict_id, open if opened_year <= the analysis year.
// So a sub-district can show area from an OPS it doesn't "count", and vice
// versa. Both are correct for what they measure; don't derive one from the other.
const OPS_COUNTS_CTE = `
  oc as (
    select o.primary_subdistrict_id as subdistrict_id,
          ${OPS_COUNT_COLUMNS}
      from spatial.open_public_spaces o
     where o.opened_year <= $2
     group by o.primary_subdistrict_id
  )`

const COUNT_SUMS = OPS_TYPE_KEYS.map((key) => `coalesce(sum(oc.count_${key}), 0)::int as count_${key}`)
  .join(', ')

// District and Bangkok: SUM the raw sub-district values first, then divide.
// Never an average of percentages.
const SUMMED_COLUMNS = `
  sum(ar.total_area_sqm) as total_area_sqm,
  sum(ar.ops_area_sqm) as ops_area_sqm,
  sum(ar.ops_area_sqm) / nullif(sum(ar.total_area_sqm), 0) * 100 as share_ops_pct,
  sum(ar.total_population) as total_population,
  sum(ar.population_with_access) as population_with_access,
  sum(ar.population_with_access) / nullif(sum(ar.total_population), 0) * 100 as access_pct,
  ${COUNT_SUMS}`

function sqlFor(level: (typeof LEVELS)[number], hasDistrict: boolean): string {
  const districtFilter = hasDistrict ? 'and d.district_code = $3' : ''
  if (level === 'subdistrict') {
    return `with ${OPS_COUNTS_CTE}
      select s.subdistrict_code as id, s.subdistrict_name_en as name_en, s.subdistrict_name_th as name_th,
             d.district_code as parent_id,
             ar.total_area_sqm, ar.ops_area_sqm, ar.share_ops_pct,
             ar.total_population, ar.population_with_access, ar.access_pct,
             ${OPS_TYPE_KEYS.map((k) => `coalesce(oc.count_${k}, 0) as count_${k}`).join(', ')}
        from spatial.assessment_results ar
        join spatial.subdistricts s on s.subdistrict_id = ar.subdistrict_id
        join spatial.districts d on d.district_id = s.district_id
        left join oc on oc.subdistrict_id = ar.subdistrict_id
       where ar.assessment_id = $1 ${districtFilter}
       order by s.subdistrict_code`
  }
  if (level === 'district') {
    return `with ${OPS_COUNTS_CTE}
      select d.district_code as id, d.district_name_en as name_en, d.district_name_th as name_th, null as parent_id,
             ${SUMMED_COLUMNS}
        from spatial.assessment_results ar
        join spatial.subdistricts s on s.subdistrict_id = ar.subdistrict_id
        join spatial.districts d on d.district_id = s.district_id
        left join oc on oc.subdistrict_id = ar.subdistrict_id
       where ar.assessment_id = $1 ${districtFilter}
       group by d.district_id
       order by d.district_code`
  }
  return `with ${OPS_COUNTS_CTE}
    select 'bangkok' as id, 'Bangkok' as name_en, 'กรุงเทพมหานคร' as name_th, null as parent_id,
           ${SUMMED_COLUMNS}
      from spatial.assessment_results ar
      left join oc on oc.subdistrict_id = ar.subdistrict_id
     where ar.assessment_id = $1`
}

function toApiRow(row: ResultRow) {
  return {
    id: row.id,
    name_en: row.name_en,
    name_th: row.name_th,
    parent_id: row.parent_id,
    total_area_sqm: row.total_area_sqm,
    ops_area_sqm: row.ops_area_sqm,
    share_ops_pct: row.share_ops_pct,
    total_population: row.total_population,
    population_with_access: row.population_with_access,
    access_pct: row.access_pct,
    ops_count: opsCountObject(row),
  }
}

/**
 * GET /api/results?year=&level=subdistrict|district|bangkok[&district=1001]
 * One row per area for the year. A year whose analysis has no results yet
 * (2026 before registry data) returns status "pending" and no rows — never zeros.
 */
resultsRouter.get('/results', async (req, res) => {
  const year = parseInteger(req.query.year, 'year')
  const level = parseEnum(req.query.level, 'level', LEVELS)
  let district: string | undefined
  if (req.query.district !== undefined) {
    if (level === 'bangkok') throw badRequest('district cannot be combined with level=bangkok')
    district = parseAreaCode(req.query.district, 'district')
    if (!/^\d{4}$/.test(district)) throw badRequest('district must be a 4-digit district code')
  }

  const info = await resolveYear(year)
  if (info.status === 'pending' || info.assessment_id === null) {
    res.json({ year, status: 'pending', level, rows: [] })
    return
  }

  const params: unknown[] = [info.assessment_id, year]
  if (district) params.push(district)
  const rows = await query<ResultRow>(`results ${level}`, sqlFor(level, Boolean(district)), params)
  if (district && rows.length === 0) throw new HttpError(404, `Unknown district ${district}`)
  res.json({ year, status: 'ok', level, rows: rows.map(toApiRow) })
})

/**
 * GET /api/results/series?area=<bangkok|district code|sub-district code>
 * The area's figures for every analysis year (summed, then divided). Years
 * without results come back with null values and status "pending".
 */
resultsRouter.get('/results/series', async (req, res) => {
  const area = parseAreaCode(req.query.area)
  const exists = await query<{ ok: boolean }>(
    'series area check',
    `select $1 = 'bangkok'
         or exists (select 1 from spatial.districts where district_code = $1)
         or exists (select 1 from spatial.subdistricts where subdistrict_code = $1) as ok`,
    [area],
  )
  if (!exists[0]?.ok) throw new HttpError(404, `Unknown area ${area}`)

  await loadYears() // integrity guard (one analysis per year, one assessment per analysis)
  const rows = await query<{
    year: number
    result_count: number
    total_area_sqm: number | null
    ops_area_sqm: number | null
    total_population: number | null
    population_with_access: number | null
    share_ops_pct: number | null
    access_pct: number | null
  }>(
    'results series',
    `with area_subdistricts as (
       select s.subdistrict_id
         from spatial.subdistricts s
         join spatial.districts d on d.district_id = s.district_id
        where $1 = 'bangkok' or d.district_code = $1 or s.subdistrict_code = $1
     )
     select an.analysis_year as year,
            count(ar.result_id)::int as result_count,
            sum(ar.total_area_sqm) as total_area_sqm,
            sum(ar.ops_area_sqm) as ops_area_sqm,
            sum(ar.total_population) as total_population,
            sum(ar.population_with_access) as population_with_access,
            sum(ar.ops_area_sqm) / nullif(sum(ar.total_area_sqm), 0) * 100 as share_ops_pct,
            sum(ar.population_with_access) / nullif(sum(ar.total_population), 0) * 100 as access_pct
       from spatial.analysis an
       left join spatial.assessments a on a.analysis_id = an.analysis_id
       left join spatial.assessment_results ar
              on ar.assessment_id = a.assessment_id
             and ar.subdistrict_id in (select subdistrict_id from area_subdistricts)
      group by an.analysis_year
      order by an.analysis_year`,
    [area],
  )

  res.json({
    area,
    points: rows.map(({ result_count, ...row }) => ({ ...row, status: result_count > 0 ? 'ok' : 'pending' })),
  })
})
