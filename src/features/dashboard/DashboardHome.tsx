import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { SuperAdminDashboard } from './SuperAdminDashboard'
import { AcademicAdminDashboard } from './AcademicAdminDashboard'
import { InstructorDashboard } from './InstructorDashboard'

export function DashboardHome() {
  const role = useAuthStore((s) => s.user?.role)
  if (role === 'STUDENT') {
    return <Navigate to="/learn" replace />
  }
  if (role === 'SUPER_ADMIN') {
    return <SuperAdminDashboard />
  }
  if (role === 'ADMIN') {
    return <AcademicAdminDashboard />
  }
  if (role === 'INSTRUCTOR') {
    return <InstructorDashboard />
  }
  return <Navigate to="/learn" replace />
}
