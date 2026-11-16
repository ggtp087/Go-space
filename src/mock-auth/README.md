# Temporary account mocks

Everything in this folder is a placeholder for the auth round and will be
replaced by real API calls (`app.users`, `app.user_profiles`,
`app.departments`, `app.positions`). It is the only mock data left in the
client — all spatial data (areas, results, OPS, analysis) comes from the API.

- `currentUser.ts` — the signed-in user shown in the navbar and account page.
- `organization.ts` — department and position lookup rows (the DB tables are
  still empty).
- `saves.ts` — simulated register / save-profile / change-password requests.
