import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadApiStore } from './data/api/store'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')
const root = createRoot(rootElement)

// Dev-only self-checks (no test runner yet) — tree-shaken out of production builds.
if (import.meta.env.DEV) {
  void import('./i18n/personName.devcheck').then(({ runPersonNameChecks }) => runPersonNameChecks())
}

function renderApp() {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// Shown before the language provider exists, so both languages at once.
function renderLoadError(message: string) {
  root.render(
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div role="alert" className="max-w-md rounded-[14px] border border-line bg-card p-6 text-center shadow-card">
        <p className="text-[15px] font-bold text-ink">ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้</p>
        <p className="text-[15px] font-bold text-ink">Couldn't load data from the server</p>
        <p className="mt-2 text-[12.5px] text-slate">ตรวจสอบว่าเซิร์ฟเวอร์ API ทำงานอยู่ แล้วลองอีกครั้ง</p>
        <p className="text-[12.5px] text-slate">Check that the API server is running, then try again.</p>
        <p className="mt-2 text-[11px] text-mist">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex h-10 items-center rounded-[9px] bg-green-700 px-4 text-[13.5px] font-semibold text-white"
        >
          ลองอีกครั้ง / Try again
        </button>
      </div>
    </div>,
  )
}

// Results for every year are loaded once, up front, from the API; the pages
// then read them synchronously (data/api/store.ts). There is no offline or
// fallback data: if the API can't be reached, an error with a retry button
// is shown instead.
root.render(<div className="flex min-h-screen items-center justify-center bg-bg text-[13px] text-slate">กำลังโหลดข้อมูล… / Loading data…</div>)
loadApiStore().then(renderApp, (error: unknown) => {
  console.error('[api] initial load failed', error)
  renderLoadError(error instanceof Error ? error.message : String(error))
})
