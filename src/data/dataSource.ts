// Which data the app reads: 'mock' (the built-in generated data, default)
// or 'api' (the Express/PostGIS server via /api). Set VITE_DATA_SOURCE=api.
export type DataSource = 'api' | 'mock'

export const DATA_SOURCE: DataSource = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock'

export const isApiMode = DATA_SOURCE === 'api'
