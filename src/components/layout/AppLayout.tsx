import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { useSignedInUser } from '../../state/AuthContext'

/** Shell for the signed-in app: navbar on top, routed page fills the rest. */
export function AppLayout() {
  const user = useSignedInUser()
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg">
      <Navbar user={user} />
      <main className="flex min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
