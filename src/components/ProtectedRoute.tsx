import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  const loc = useLocation()
  if (!token) {
    return <Navigate to="/login" state={{ from: loc }} replace />
  }
  return <>{children}</>
}
