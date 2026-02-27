import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import { extractAuthError } from '../api/errorUtils'
import toast from 'react-hot-toast'

interface CredentialsForm {
  email: string
  password: string
}

interface LicenseKeyForm {
  license_key: string
}

const Login = () => {
  const navigate = useNavigate()
  const { setAuth, setCompanyDetail } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [suspendedMessage, setSuspendedMessage] = useState<string | null>(null)
  const [showLicenseKeyModal, setShowLicenseKeyModal] = useState(false)
  const [verifiedCredentials, setVerifiedCredentials] = useState<{
    email: string
    password: string
    user_type: string
  } | null>(null)

  const {
    register: registerCredentials,
    handleSubmit: handleSubmitCredentials,
    formState: { errors: credentialsErrors },
  } = useForm<CredentialsForm>()

  const {
    register: registerLicense,
    handleSubmit: handleSubmitLicense,
    formState: { errors: licenseErrors },
    reset: resetLicense,
  } = useForm<LicenseKeyForm>()

  const onSubmitCredentials = async (data: CredentialsForm) => {
    setLoading(true)

    try {
      const response = await authAPI.verifyCredentials(data.email.trim(), data.password)
      
      if (response.valid) {
        setVerifiedCredentials({
          email: data.email.trim(),
          password: data.password,
          user_type: response.user_type || 'license_server',
        })
        setShowLicenseKeyModal(true)
        toast.success(response.message || 'Credentials verified')
      }
    } catch (error: any) {
      console.error('Credentials verification error:', error)

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

  const onSubmitLicenseKey = async (data: LicenseKeyForm) => {
    if (!verifiedCredentials) return

    const licenseKey = data.license_key?.trim() || ''
    const isBackendUser = verifiedCredentials.user_type === 'backend'
    if (isBackendUser && !licenseKey) {
      toast.error('License key is required for company users.')
      return
    }

    setLoading(true)

    try {
      const loginData: any = {
        email: verifiedCredentials.email,
        password: verifiedCredentials.password,
        ...(licenseKey && { license_key: licenseKey }),
      }

      const response = await authAPI.login(loginData, verifiedCredentials.user_type)

      setAuth(response.user, response.access, response.refresh)
      if (response.company) setCompanyDetail(response.company)
      toast.success('Logged in successfully')
      if (response.company?.license_required) {
        navigate('/license-check')
      } else {
        navigate('/dashboard')
      }

    } catch (error: any) {
      console.error('License key verification error:', error)

      const msg = extractAuthError(error, 'Invalid license key or credentials')

      if (msg.toLowerCase().includes('suspended')) {
        setSuspendedMessage(msg)
        setShowLicenseKeyModal(false)
      } else {
        toast.error(msg)
      }

    } finally {
      setLoading(false)
    }
  }


  const closeLicenseKeyModal = () => {
    setShowLicenseKeyModal(false)
    setVerifiedCredentials(null)
    resetLicense()
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

      {/* License Key Modal */}
      {showLicenseKeyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeLicenseKeyModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Enter License Key
              </h3>
              <button
                onClick={closeLicenseKeyModal}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Email verified successfully. Enter your license key to complete login, or continue if you need to add one later.
            </p>

            <form onSubmit={handleSubmitLicense(onSubmitLicenseKey)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Key
                </label>
                <input
                  {...registerLicense('license_key')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your license key"
                  maxLength={200}
                  autoFocus
                />
                {licenseErrors.license_key && (
                  <p className="mt-1 text-sm text-red-600">
                    {licenseErrors.license_key.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeLicenseKeyModal}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 px-4 rounded-md font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Login Form */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Sign In
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your email and password to continue. Only companies created in License Server can access the product.
          </p>

          <form onSubmit={handleSubmitCredentials(onSubmitCredentials)} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                {...registerCredentials('email', {
                  required: 'Email is required',
                })}
                type="email"
                autoComplete="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="company@example.com"
              />
              {credentialsErrors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {credentialsErrors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                {...registerCredentials('password', {
                  required: 'Password is required',
                })}
                type="password"
                autoComplete="current-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              />
              {credentialsErrors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {credentialsErrors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Verifying...' : 'Next'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
