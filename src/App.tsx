import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AuthLayout } from './components/layout/AuthLayout'
import { LanguageProvider } from './i18n/LanguageProvider'

// Temporary placeholders so the two layouts are visible before real routing
// and pages land (step 3). Replace both `element`s once the actual pages
// (Map/Dashboard/Compare, Login/Register/ResetPassword) exist.
function AppLayoutPreview() {
  return (
    <div className="flex flex-1 items-center justify-center text-slate">
      <p>
        Signed-in layout preview — pages come next.{' '}
        <Link to="/login" className="font-semibold text-green-700">
          View auth layout →
        </Link>
      </p>
    </div>
  )
}

function AuthLayoutPreview() {
  return (
    <div className="text-center text-slate">
      <p>
        Auth layout preview — Login/Register/Reset pages come next.{' '}
        <Link to="/" className="font-semibold text-green-700">
          ← Back
        </Link>
      </p>
    </div>
  )
}

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<AppLayoutPreview />} />
          </Route>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<AuthLayoutPreview />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
