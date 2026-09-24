import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { currentUser } from '../../mock/currentUser'

/** Shell for the signed-in app: navbar on top, routed page fills the rest. */
export function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg">
      <Navbar user={currentUser} />
      <main className="flex min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
