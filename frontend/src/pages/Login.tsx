import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import toast from 'react-hot-toast'

interface LoginForm {
  email: string
  password: string
  license_key: string
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
      const loginData: any = {
        email: data.email.trim(),
        password: data.password,
        license_key: data.license_key.trim(),
      }

      const response = await authAPI.login(loginData)

      setAuth(response.user, response.access, response.refresh)
      if (response.company) setCompanyDetail(response.company)
      toast.success('Logged in successfully')
      navigate('/dashboard')

    } catch (error: any) {
      console.error('Login error:', error)

      const data = error.response?.data
      let msg = 'Login failed'

      if (typeof data === 'string') {
        msg = data
      } else if (data?.non_field_errors?.length) {
        msg = data.non_field_errors[0]
      } else if (Array.isArray(data?.detail)) {
        msg = data.detail[0] || msg
      } else if (typeof data?.detail === 'string') {
        msg = data.detail
      } else if (data?.error) {
        msg = data.error
      } else if (data?.message) {
        msg = data.message
      }

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

            <p className="text-sm text-gray-500 mb-6">
              Aap product tab tak access nahi kar paayenge jab tak company dubara
              activate na ho jaye. Apne administrator se sampark karein.
            </p>

            <button
              onClick={() => setSuspendedMessage(null)}
              className="w-full bg-red-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-red-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Sign In
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Only companies created in License Server can access the product. Use the email, password and license key provided to your company.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                })}
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="company@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                {...register('password', {
                  required: 'Password is required',
                })}
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Licence Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Licence Key *
              </label>
              <input
                {...register('license_key', {
                  required: 'License key is required. It is provided when your company is created in License Server.',
                })}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Enter licence key from License Server"
                maxLength={200}
              />
              {errors.license_key && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.license_key.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Next'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
