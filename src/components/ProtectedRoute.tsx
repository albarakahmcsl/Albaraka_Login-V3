import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { hasPermission, isAdmin, hasMenuAccess, hasSubMenuAccess, hasComponentAccess } from '../utils/permissions'
import { AccessDenied } from './AccessDenied'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requiredPermission?: { resource: string; action: string }
  menuId?: string
  subMenuId?: string
  componentId?: string
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requiredPermission,
  menuId,
  subMenuId,
  componentId,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Show loading spinner while auth state is initializing
  if (loading && !user) {
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
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  if (user.needs_password_reset && location.pathname !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />
  }

  if (!user.is_active) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Inactive</h2>
          <p className="text-gray-600">Your account has been deactivated. Please contact an administrator.</p>
        </div>
      </div>
    )
  }

  // Admin-only route
  if (requireAdmin && !isAdmin(user)) {
    return <AccessDenied message="You need administrator privileges to access this page." />
  }

  // Permission-based route
  if (requiredPermission && !hasPermission(user, requiredPermission.resource, requiredPermission.action)) {
    return (
      <AccessDenied
        message={`You need permission to ${requiredPermission.action} ${requiredPermission.resource} to access this page.`}
      />
    )
  }

  // Menu/sub-menu access
  if (menuId && !hasMenuAccess(user, menuId)) {
    return <AccessDenied message="You do not have access to this menu." />
  }

  if (menuId && subMenuId && !hasSubMenuAccess(user, menuId, subMenuId)) {
    return <AccessDenied message="You do not have access to this sub-menu." />
  }

  // Component access
  if (componentId && !hasComponentAccess(user, componentId)) {
    return <AccessDenied message="You do not have access to this component." />
  }

  return <>{children}</>
}
