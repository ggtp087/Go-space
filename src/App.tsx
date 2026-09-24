import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AuthLayout } from './components/layout/AuthLayout'
import { LanguageProvider } from './i18n/LanguageProvider'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { MapPage } from './pages/MapPage'
import { DashboardPage } from './pages/DashboardPage'
import { ComparePage } from './pages/ComparePage'
import { AccountSettingsPage } from './pages/AccountSettingsPage'
import { ComponentsPreviewPage } from './pages/ComponentsPreviewPage'

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          <Route element={<AppLayout />}>
            <Route path="/map" element={<MapPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/account" element={<AccountSettingsPage />} />
          </Route>

          {/* Temporary — remove once real pages are assembled from these components. */}
          <Route path="/components" element={<ComponentsPreviewPage />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
