import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function StaffRoute() {
  const user = useAuthStore((s) => s.user)
  if (!user || user.role === 'STUDENT') {
    return <Navigate to="/learn" replace />
  }
  return <Outlet />
}
