import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

/** Legacy NEET hub (analytics, PYQ, daily, etc.) — not part of the student course-centric flow. */
export function NeetStaffOnlyRoute() {
  const role = useAuthStore((s) => s.user?.role)
  if (role === 'STUDENT') {
    return <Navigate to="/learn" replace />
  }
  return <Outlet />
}
