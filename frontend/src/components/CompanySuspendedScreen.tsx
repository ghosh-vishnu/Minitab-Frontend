import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import toast from 'react-hot-toast'

/**
 * Full-screen message when user's company is suspended.
 * They can only log out; no access to any features until company is reactivated.
 */
export default function CompanySuspendedScreen() {
  const navigate = useNavigate()
  const { user, logout, refreshToken } = useAuthStore()

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authAPI.logout(refreshToken)
      }
      logout()
      navigate('/login')
      toast.success('Logged out successfully')
    } catch {
      logout()
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Company suspended</h1>
        <p className="text-gray-600 mb-6">
          Your company <strong>{user?.company?.name || 'account'}</strong> has been suspended.
          You do not have access to any features until your company is reactivated by the administrator.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Please contact your administrator or support for more information.
        </p>
        <button
          onClick={handleLogout}
          className="w-full px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
