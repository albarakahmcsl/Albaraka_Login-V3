import React, { Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginForm } from './components/LoginForm'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ForcePasswordChangePage } from './pages/ForcePasswordChangePage'

// Lazy load page components
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminUsers = React.lazy(() => import('./pages/AdminUsers').then(m => ({ default: m.AdminUsers })))
const AdminRoles = React.lazy(() => import('./pages/AdminRoles').then(m => ({ default: m.AdminRoles })))
const AdminPermissions = React.lazy(() => import('./pages/AdminPermissions').then(m => ({ default: m.AdminPermissions })))
const AdminBankAccounts = React.lazy(() => import('./pages/AdminBankAccounts').then(m => ({ default: m.AdminBankAccounts })))
const AdminAccountTypes = React.lazy(() => import('./pages/AdminAccountTypes').then(m => ({ default: m.AdminAccountTypes })))
const ProfilePage = React.lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const MembersPage = React.lazy(() =>
  import('./pages/members/NewMemberPage').then(module => ({ default: module.NewMembersPage }))
)



// Loading fallback components
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
  </div>
)

const AppLoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
  </div>
)

// ---------------- ROUTER CONFIG ----------------
const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginForm /> },
    { path: '/forgot-password', element: <ForgotPasswordPage /> },
    { path: '/reset-password', element: <ResetPasswordPage /> },
    { path: '/force-password-change', element: <ForcePasswordChangePage /> },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      hydrateFallbackElement: <AppLoadingFallback />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        {
          path: 'dashboard',
          element: (
            <ProtectedRoute requiredPermission={{ resource: 'dashboard', action: 'access' }}>
              <Suspense fallback={<PageLoadingFallback />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          ),
        },
        {
          path: 'admin/dashboard',
          element: (
            <ProtectedRoute requireAdmin>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminDashboard />
              </Suspense>
            </ProtectedRoute>
          ),
        },
        {
          path: 'admin/users',
          element: (
            <ProtectedRoute requiredPermission={{ resource: 'users', action: 'view' }}>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminUsers />
              </Suspense>
            </ProtectedRoute>
          ),
        },
        {
          path: 'admin/roles',
          element: (
            <ProtectedRoute requiredPermission={{ resource: 'roles', action: 'manage' }}>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminRoles />
              </Suspense>
            </ProtectedRoute>
          ),
        },
        {
          path: 'admin/permissions',
          element: (
            <ProtectedRoute requiredPermission={{ resource: 'permissions', action: 'manage' }}>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminPermissions />
              </Suspense>
            </ProtectedRoute>
          ),
        },
        {
          path: 'admin/bank-accounts',
          element: (
            <ProtectedRoute requiredPermission={{ resource: 'bank_accounts', action: 'manage' }}>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminBankAccounts />
              </Suspense>
            </ProtectedRoute>
          ),
        },
        {
          path: 'admin/account-types',
          element: (
            <ProtectedRoute requiredPermission={{ resource: 'account_types', action: 'manage' }}>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminAccountTypes />
              </Suspense>
            </ProtectedRoute>
          ),
        },
        {
          path: 'profile',
          element: (
            <ProtectedRoute>
              <Suspense fallback={<PageLoadingFallback />}>
                <ProfilePage />
              </Suspense>
            </ProtectedRoute>
          ),
        },
        {
          path: 'members',
          element: (
            <ProtectedRoute requiredPermission={{ resource: 'members', action: 'view' }}>
              <Suspense fallback={<PageLoadingFallback />}>
                <MembersPage />
              </Suspense>
            </ProtectedRoute>
          ),
        },
        {
          path: '*',
          element: <Navigate to="/dashboard" replace />,
        },
      ],
    },
  ],
  { future: { v7_partialHydration: true } }
)

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
