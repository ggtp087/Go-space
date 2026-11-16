# GO SPAce API

Express + `pg` + TypeScript over the local PostGIS database `"GO SPAce"`.
It is the app's only data source: every page reads its areas, results, OPS
and analysis from here.

Two connection pools:

- the **read-only pool** (`pool`) serves every spatial endpoint and the
  lookups; its sessions run with `default_transaction_read_only=on`, so they
  can never modify data;
- the **app pool** (`appPool`) is used only by the auth/account routes and
  writes only to schema `app` (users, profiles, activity log). Schema
  `spatial` is never written.

## Run

```sh
cp server/.env.example server/.env   # first time only; set JWT_SECRET (see below)
npm install                          # client dependencies (repo root)
npm --prefix server install          # server dependencies
npm --prefix server run migrate      # schema app migrations (idempotent)
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
| `GET /api/roads?bbox=&zoom=` | zoom ≥ 15; walkable road network (`road_networks`) in the viewport, simplified by zoom, ≤ 25,000 rows (`truncated`) |
| `GET /api/population-grid?year=&bbox=&zoom=` | zoom ≥ 15; `population_grids.adjusted_population` cells; `status: "pending"` (no cells) for a year without adjusted values (2026), ≤ 20,000 rows |
| `GET /api/ops-polygons?year=&bbox=&zoom=` | zoom ≥ 15; OPS polygons open in the year, simplified by zoom, ≤ 3,000 rows |
| `GET /api/departments`, `GET /api/positions` | lookup rows (`app` schema) for the register and account forms |

### Auth and account

| Endpoint | Notes |
|---|---|
| `POST /api/auth/register` | names (TH + EN), email, password, `department_id`, `position_id`; 201, active immediately (no approval); 409 `EMAIL_TAKEN` (case-insensitive) |
| `POST /api/auth/login` | sets the session cookie; any failure is the same 401 `INVALID_CREDENTIALS`; 429 `RATE_LIMITED` after 10 failures per IP per 15 min |
| `POST /api/auth/logout` | clears the cookie |
| `GET /api/auth/me` | the signed-in user, or 401 |
| `PATCH /api/account/profile` | names, `department_id` (session required) |
| `POST /api/account/password` | `current_password`, `new_password`; 400 `WRONG_CURRENT_PASSWORD` |

Sessions are a JWT (HS256, 8 h) in the httpOnly cookie `gospace_session`
(`SameSite=Lax`, `Secure` when `NODE_ENV=production`); the client never
stores a token. Passwords are bcrypt (cost 12): at least 10 characters with
a number and a symbol. Validation errors are 400 with `code` and a `fields`
map of per-field codes, which the client translates (EN + TH). Register,
login, failed login, logout, profile and password changes are written to
`app.user_activity_logs`.

`JWT_SECRET` (server/.env, at least 32 characters, unique per deployment):

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Password reset is not implemented: the "Forgot password?" page is still the
static design and `app.password_reset_tokens` is unused.

Bad parameters (year not an integer or not an analysis year, unknown level
or type, malformed bbox) return 400 with a message. `bbox` is
`minLon,minLat,maxLon,maxLat` in WGS 84; it is transformed to EPSG:32647
(the geometry column is never transformed, so spatial indexes are used).

Queries slower than 1 s are logged as `[slow query]`. Responses are gzip-compressed.
The viewport layers reject a missing or oversized bbox (> 0.25° a side) and a zoom below their minimum with 400.

`PGPASSWORD` is empty for local development only — set it before any
deployment.

## Migrations

`server/migrations/NNN_*.sql`, applied in order by `npm --prefix server run migrate`.
Each file is a transaction and idempotent (safe to re-run); the runner
refuses any file that mentions schema `spatial`.
