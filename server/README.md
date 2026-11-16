# GO SPAce API (read-only)

Express + `pg` + TypeScript over the local PostGIS database `"GO SPAce"`.
Every session runs with `default_transaction_read_only=on`, so the API can
never modify data.

## Run

```sh
cp server/.env.example server/.env   # then edit if needed
npm --prefix server install
npm run dev:api                      # API on :3001 + web app in api mode
```

`npm run dev` (root) still runs the web app on the built-in mock data.
The data source is chosen by `VITE_DATA_SOURCE=api|mock` (default `mock`);
`npm run dev:api` uses `vite --mode api` (`.env.api`). Vite proxies `/api` to
`http://localhost:3001`.

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

Bad parameters (year not an integer or not an analysis year, unknown level
or type, malformed bbox) return 400 with a message. `bbox` is
`minLon,minLat,maxLon,maxLat` in WGS 84; it is transformed to EPSG:32647
(the geometry column is never transformed, so spatial indexes are used).

Queries slower than 1 s are logged as `[slow query]`.

`PGPASSWORD` is empty for local development only — set it before any
deployment.
