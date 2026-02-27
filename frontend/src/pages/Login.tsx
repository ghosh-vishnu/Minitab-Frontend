import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import { extractAuthError } from '../api/errorUtils'
import toast from 'react-hot-toast'

interface LoginForm {
  email: string
  password: string
}

const Login = () => {
  const navigate = useNavigate()
  const { setAuth, setCompanyDetail } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [suspendedMessage, setSuspendedMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const response = await authAPI.unifiedLogin(data.email.trim(), data.password)
      setAuth(response.user, response.access, response.refresh)
      if (response.company) setCompanyDetail(response.company as any)
      toast.success('Logged in successfully')
      const user = response.user as any
      const role = response.role || user?.user_type
      const isPlatformSuperAdmin = user?.is_super_admin || user?.is_superuser || user?.is_staff
      const hasCompany = Boolean(response.company || user?.company)
      const isCompanyUser = role === 'COMPANY_USER'
      const isCompanyAdmin = hasCompany && !isPlatformSuperAdmin && !isCompanyUser
      if (isCompanyAdmin) {
        navigate('/license-check')
      } else {
        navigate('/dashboard')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      const msg = extractAuthError(error, 'Invalid email or password')
      if (msg.toLowerCase().includes('suspended')) {
        setSuspendedMessage(msg)
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Suspended Popup */}
      {suspendedMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSuspendedMessage(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border-l-4 border-red-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                ⚠️
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Company Suspended
              </h3>
            </div>
            <p className="text-gray-700 mb-6">{suspendedMessage}</p>
            <button
              onClick={() => setSuspendedMessage(null)}
              className="w-full bg-red-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-red-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Login Form */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Sign In
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your email and password to continue.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                {...register('email', { required: 'Email is required' })}
                type="email"
                autoComplete="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="company@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                {...register('password', { required: 'Password is required' })}
                type="password"
                autoComplete="current-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
