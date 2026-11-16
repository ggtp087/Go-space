import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

// Dev-only self-checks (no test runner yet) — tree-shaken out of production builds.
if (import.meta.env.DEV) {
  void import('./i18n/personName.devcheck').then(({ runPersonNameChecks }) => runPersonNameChecks())
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
