# GO SPAce API (read-only)

Express + `pg` + TypeScript over the local PostGIS database `"GO SPAce"`.
It is the app's only data source: every page reads its areas, results, OPS
and analysis from here. Every database session runs with
`default_transaction_read_only=on`, so the API can never modify data.

## Run

```sh
cp server/.env.example server/.env   # first time only; edit if needed
npm install                          # client dependencies (repo root)
npm --prefix server install          # server dependencies
npm run dev                          # API on :3001 + web app on :5173
```

Open http://localhost:5173. Vite proxies `/api` to `http://localhost:3001`.
`npm run dev:api` / `npm run dev:web` start just one side.

If the API is not reachable the app shows an error (EN + TH) with a retry
button; there is no fallback data.

## Endpoints

| Endpoint | Notes |
|---|---|
| `GET /api/health` | 200 if the database answers, 503 otherwise |
| `GET /api/years` | analysis years; `status: "pending"` = no results yet (2026); `latest_year_with_results` |
| `GET /api/ops-types` | lookup with the front end's type keys |
| `GET /api/results?year=&level=subdistrict\|district\|bangkok[&district=]` | district/Bangkok = SUM of raw sub-district values, then divided |
| `GET /api/results/series?area=` | every year for one area (`bangkok`, district or sub-district code) |
| `GET /api/ops?year=&bbox=[&type=]` | OPS with `opened_year <= year`, as `ST_PointOnSurface` markers |
| `GET /api/ops/:ops_id?year=` | polygon, entrances, network (+ length), service area, population covered (per OPS only) |
| `GET /api/service-areas?year=&bbox=[&type=]` | simplified (~10 m) service areas |
| `GET /api/ops/nearby?area=&year=` | OPS within 400 m of a district/sub-district |
| `GET /api/search?q=` | parameterized `ILIKE` over Thai/English names, 8 per group |
| `GET /api/roads?bbox=&zoom=` | zoom ≥ 14; walkable road network (`road_networks`) in the viewport, simplified by zoom, ≤ 25,000 rows (`truncated`) |
| `GET /api/population-grid?year=&bbox=&zoom=` | zoom ≥ 14; `population_grids.adjusted_population` cells; `status: "pending"` (no cells) for a year without adjusted values (2026), ≤ 20,000 rows |
| `GET /api/ops-polygons?year=&bbox=&zoom=` | zoom ≥ 15; OPS polygons open in the year, simplified by zoom, ≤ 3,000 rows |

Bad parameters (year not an integer or not an analysis year, unknown level
or type, malformed bbox) return 400 with a message. `bbox` is
`minLon,minLat,maxLon,maxLat` in WGS 84; it is transformed to EPSG:32647
(the geometry column is never transformed, so spatial indexes are used).

Queries slower than 1 s are logged as `[slow query]`. Responses are gzip-compressed.
The viewport layers reject a missing or oversized bbox (> 0.25° a side) and a zoom below their minimum with 400.

`PGPASSWORD` is empty for local development only — set it before any
deployment.

## Not from the API yet

Accounts (signed-in user, departments, positions, register/save/password
requests) are still temporary client-side mocks in `src/mock-auth/` until
the auth round.
