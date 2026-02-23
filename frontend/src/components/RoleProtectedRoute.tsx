import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, UserType } from '../store/authStore'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: UserType[]
  requireSubscription?: boolean
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  requireSubscription = true 
}) => {
  const location = useLocation()
  const { 
    isAuthenticated, 
    user, 
    isSuperAdmin,
    isCompanyAdmin,
    isCompanyUser 
  } = useAuthStore()

  // Not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Super admins bypass role restrictions (except explicit super admin only routes)
  if (isSuperAdmin() && allowedRoles.includes('SUPER')) {
    return <>{children}</>
  }

  // Check if user type is allowed
  const userType = user.user_type
  if (!userType || !allowedRoles.includes(userType)) {
    // Redirect to appropriate dashboard based on user type
    if (isSuperAdmin()) {
      return <Navigate to="/dashboard" replace />
    } else if (isCompanyAdmin()) {
      return <Navigate to="/company-admin" replace />
    } else if (isCompanyUser()) {
      return <Navigate to="/dashboard" replace />
    }
    return <Navigate to="/login" replace />
  }

  // Check subscription status for company users and admins
  if (requireSubscription && (isCompanyAdmin() || isCompanyUser())) {
    const company = user.company
    
    if (!company) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Company Assigned</h2>
            <p className="text-gray-600 mb-6">
              Your account is not associated with any company. Please contact support.
            </p>
            <button
              onClick={() => window.location.href = '/profile'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Go to Profile
            </button>
          </div>
        </div>
      )
    }

    // Check if company is active
    if (company.status !== 'active' || !company.is_active) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Company {company.status === 'suspended' ? 'Suspended' : 'Inactive'}</h2>
            <p className="text-gray-600 mb-2">
              Your company account is currently {company.status}.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please contact your company administrator or support team for assistance.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <p className="text-sm text-gray-600">Company: <span className="font-semibold text-gray-900">{company.name}</span></p>
              <p className="text-sm text-gray-600">Status: <span className="font-semibold text-gray-900 capitalize">{company.status}</span></p>
            </div>
          </div>
        </div>
      )
    }
  }

  // All checks passed
  return <>{children}</>
}

// Convenience wrapper components
export const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleProtectedRoute allowedRoles={['SUPER']} requireSubscription={false}>
    {children}
  </RoleProtectedRoute>
)

export const CompanyAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleProtectedRoute allowedRoles={['COMPANY_ADMIN', 'CHILD']} requireSubscription={true}>
    {children}
  </RoleProtectedRoute>
)

export const CompanyUserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleProtectedRoute allowedRoles={['COMPANY_USER']} requireSubscription={true}>
    {children}
  </RoleProtectedRoute>
)

// Route for any authenticated company member (admin or user)
export const CompanyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleProtectedRoute allowedRoles={['COMPANY_ADMIN', 'CHILD', 'COMPANY_USER']} requireSubscription={true}>
    {children}
  </RoleProtectedRoute>
)
