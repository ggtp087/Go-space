/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'api' reads from the backend via /api; anything else (default) uses the built-in mock data. */
  readonly VITE_DATA_SOURCE?: 'api' | 'mock'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
