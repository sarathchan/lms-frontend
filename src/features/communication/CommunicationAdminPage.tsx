import { Navigate } from 'react-router-dom'

/** @deprecated Use /communication/questions */
export function CommunicationAdminPage() {
  return <Navigate to="/communication/questions" replace />
}
