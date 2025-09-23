import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { hasPermission, isAdmin } from '../utils/permissions'
import { AccessDenied } from './AccessDenied'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requiredPermission?: { resource: string; action: string }
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requiredPermission,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  console.log('[ProtectedRoute] Render - pathname:', location.pathname, 'user:', !!user, 'loading:', loading)

  // Only show loading spinner if still loading and no user info yet
  if (loading && !user) {
    console.log('[ProtectedRoute] Showing loading spinner')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to login')
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Redirect to force-password-change only if user actually needs it and not already on that page
  if (user.needs_password_reset && location.pathname !== '/force-password-change') {
    console.log('[ProtectedRoute] User needs password reset, redirecting')
    return <Navigate to="/force-password-change" replace />
  }

  if (!user.is_active) {
    console.log('[ProtectedRoute] User account is inactive')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Inactive</h2>
          <p className="text-gray-600">Your account has been deactivated. Please contact an administrator.</p>
        </div>
      </div>
    )
  }

  if (requireAdmin && !isAdmin(user)) {
    console.log('[ProtectedRoute] Admin required but user is not admin, redirecting to dashboard')
    return <AccessDenied message="You need administrator privileges to access this page." />
  }

  if (requiredPermission && !hasPermission(user, requiredPermission.resource, requiredPermission.action)) {
    console.log('[ProtectedRoute] Required permission not met:', requiredPermission)
    return <AccessDenied message={`You need permission to ${requiredPermission.action} ${requiredPermission.resource} to access this page.`} />
  }

  console.log('[ProtectedRoute] All checks passed, rendering children')
  return <>{children}</>
}
