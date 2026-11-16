import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AuthLayout } from './components/layout/AuthLayout'
import { LanguageProvider } from './i18n/LanguageProvider'
import { YearProvider } from './state/YearProvider'
import { AreaProvider } from './state/AreaProvider'
import { AuthProvider } from './state/AuthProvider'
import { RequireAuth } from './components/auth/RequireAuth'
import { ToastProvider } from './state/ToastProvider'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { MapPage } from './pages/MapPage'
import { DashboardPage } from './pages/DashboardPage'
import { ComparePage } from './pages/ComparePage'
import { AccountSettingsPage } from './pages/AccountSettingsPage'

function App() {
  return (
    <LanguageProvider>
      <YearProvider>
        <AreaProvider>
          <AuthProvider>
            <ToastProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Navigate to="/map" replace />} />

                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                  </Route>

                  {/* Every page of the app needs a session; only the sign-in flows above are public. */}
                  <Route
                    element={
                      <RequireAuth>
                        <AppLayout />
                      </RequireAuth>
                    }
                  >
                    <Route path="/map" element={<MapPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/comparison" element={<ComparePage />} />
                    <Route path="/compare" element={<Navigate to="/comparison" replace />} />
                    <Route path="/account" element={<AccountSettingsPage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </ToastProvider>
          </AuthProvider>
        </AreaProvider>
      </YearProvider>
    </LanguageProvider>
  )
}

export default App
