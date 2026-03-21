import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, Lock, Eye, EyeOff, BarChart2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import { setLicenseCheckPassed } from '../utils/licenseCheck'
import toast from 'react-hot-toast'

const REMEMBER_EMAIL_KEY = 'statspro_remember_email'

interface CredentialsForm {
  email: string
  password: string
  rememberMe?: boolean
}

interface LicenseKeyForm {
  license_key: string
}

function AnalyticsBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950" />
      {/* Blurred chart visuals with subtle animation */}
      <div className="absolute inset-0 opacity-20">
        <svg className="absolute w-[80%] h-[60%] top-0 left-0 blur-3xl animate-[float-subtle_8s_ease-in-out_infinite]" viewBox="0 0 400 200" fill="none">
          <path d="M0 150 L50 120 L100 140 L150 80 L200 100 L250 60 L300 90 L350 70 L400 100" stroke="#60a5fa" strokeWidth="2" fill="rgba(96,165,250,0.1)" />
          <path d="M0 160 L50 130 L100 150 L150 90 L200 110 L250 70 L300 100 L350 80 L400 110" stroke="#34d399" strokeWidth="2" fill="rgba(52,211,153,0.08)" />
        </svg>
        <div className="absolute bottom-0 left-1/4 w-48 h-32 bg-indigo-500/20 rounded-t-lg blur-2xl animate-[float-subtle_10s_ease-in-out_infinite]" style={{ animationDelay: '-2s' }} />
        <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl animate-[float-subtle_9s_ease-in-out_infinite]" style={{ animationDelay: '-4s' }} />
        <div className="absolute bottom-1/4 right-0 w-64 h-48 bg-slate-500/10 rounded-lg blur-2xl animate-[float-subtle_11s_ease-in-out_infinite]" style={{ animationDelay: '-6s' }} />
      </div>
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
    </div>
  )
}

const Login = () => {
  const navigate = useNavigate()
  const { setAuth, setCompanyDetail } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [suspendedMessage, setSuspendedMessage] = useState<string | null>(null)
  const [showLicenseKeyModal, setShowLicenseKeyModal] = useState(false)
  const [verifiedCredentials, setVerifiedCredentials] = useState<{ email: string; password: string } | null>(null)

  const {
    register: registerCredentials,
    handleSubmit: handleSubmitCredentials,
    setValue: setCredentialsValue,
    watch: watchCredentials,
    formState: { errors: credentialsErrors },
  } = useForm<CredentialsForm>()

  const {
    register: registerLicense,
    handleSubmit: handleSubmitLicense,
    formState: { errors: licenseErrors },
    reset: resetLicense,
  } = useForm<LicenseKeyForm>()

  const rememberMe = watchCredentials('rememberMe')

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY)
    if (saved) {
      setCredentialsValue('email', saved)
      setCredentialsValue('rememberMe', true)
    }
  }, [setCredentialsValue])

  const performLoginSuccess = (navigateToDashboard: () => void) => {
    setIsTransitioning(true)
    setTimeout(() => {
      navigateToDashboard()
    }, 400)
  }

  const onSubmitCredentials = async (data: CredentialsForm) => {
    setLoading(true)

    try {
      const response = await authAPI.verifyCredentials(data.email.trim(), data.password)

      if (response.valid) {
        if (data.rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, data.email.trim())
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY)
        }

        if (response.requires_license_key === false) {
          try {
            const loginResponse = await authAPI.companyUserLogin(data.email.trim(), data.password)
            setAuth(loginResponse.user, loginResponse.access, loginResponse.refresh)
            if (loginResponse.company) setCompanyDetail(loginResponse.company)
            setLicenseCheckPassed()
            toast.success('Logged in successfully')
            performLoginSuccess(() => navigate('/dashboard'))
          } catch (loginError: any) {
            const errorData = loginError.response?.data
            let msg = 'Login failed'
            if (errorData?.error) msg = errorData.error
            else if (errorData?.detail) msg = errorData.detail
            toast.error(msg)
          }
        } else {
          setVerifiedCredentials({
            email: data.email.trim(),
            password: data.password,
          })
          setShowLicenseKeyModal(true)
          toast.success(response.message || 'Please enter your license key')
        }
      }
    } catch (error: any) {
      console.error('Credentials verification error:', error)

      const errorData = error.response?.data
      let msg = 'Invalid email or password'

      if (typeof errorData === 'string') {
        msg = errorData
      } else if (errorData?.error) {
        msg = errorData.error
      } else if (errorData?.detail) {
        msg = Array.isArray(errorData.detail) ? errorData.detail[0] : errorData.detail
      } else if (errorData?.message) {
        msg = errorData.message
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

  const onSubmitLicenseKey = async (data: LicenseKeyForm) => {
    if (!verifiedCredentials) return

    setLoading(true)

    try {
      const loginData: any = {
        email: verifiedCredentials.email,
        password: verifiedCredentials.password,
        license_key: data.license_key.trim(),
      }

      const response = await authAPI.login(loginData)

      setAuth(response.user, response.access, response.refresh)
      if (response.company) setCompanyDetail(response.company)
      setLicenseCheckPassed()
      toast.success('Logged in successfully')
      performLoginSuccess(() => navigate('/dashboard'))
    } catch (error: any) {
      console.error('License key verification error:', error)

      const errorData = error.response?.data
      let msg = 'Invalid license key'

      if (typeof errorData === 'string') {
        msg = errorData
      } else if (errorData?.non_field_errors?.length) {
        msg = errorData.non_field_errors[0]
      } else if (Array.isArray(errorData?.detail)) {
        msg = errorData.detail[0] || msg
      } else if (typeof errorData?.detail === 'string') {
        msg = errorData.detail
      } else if (errorData?.error) {
        msg = errorData.error
      } else if (errorData?.message) {
        msg = errorData.message
      }

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

  const inputBase =
    'w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white/95 text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 focus:bg-white'

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <AnalyticsBackground />

      {/* Suspended Popup */}
      {suspendedMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
          onClick={() => setSuspendedMessage(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-l-4 border-red-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-xl">
                ⚠️
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Company Suspended</h3>
            </div>

            <p className="text-gray-700 mb-6">{suspendedMessage}</p>

            <p className="text-sm text-gray-500 mb-6">
              You will not be able to access the product until the company is reactivated. Please contact your administrator.
            </p>

            <button
              onClick={() => setSuspendedMessage(null)}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-red-700 transition-colors duration-200 active:scale-[0.98]"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* License Key Modal */}
      {showLicenseKeyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
          onClick={closeLicenseKeyModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Enter License Key</h3>
              <button
                onClick={closeLicenseKeyModal}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Email verified successfully. Please enter your license key to complete login.
            </p>

            <form onSubmit={handleSubmitLicense(onSubmitLicenseKey)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">License Key *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    {...registerLicense('license_key', { required: 'License key is required.' })}
                    type="text"
                    className={inputBase}
                    placeholder="Enter your license key"
                    maxLength={200}
                    autoFocus
                  />
                </div>
                {licenseErrors.license_key && (
                  <p className="mt-1.5 text-sm text-red-600">{licenseErrors.license_key.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeLicenseKeyModal}
                  className="flex-1 py-3 px-4 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
                >
                  {loading ? 'Verifying...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Login Card */}
      <div
        className={`w-full max-w-md relative z-10 transition-all duration-500 ease-out ${
          isTransitioning ? 'opacity-0 -translate-y-8 scale-95' : 'opacity-100 translate-y-0 scale-100'
        }`}
      >
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              Stats<span className="text-indigo-300">Pro</span>
            </span>
          </div>
          <p className="text-sm text-slate-400">Analyze Data. Make Better Decisions.</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-slate-900/20 border border-white/20 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome Back!</h2>
          <p className="text-sm text-gray-500 mb-6">Please sign in to continue to your dashboard.</p>

          <form onSubmit={handleSubmitCredentials(onSubmitCredentials)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-indigo-500" />
                <input
                  {...registerCredentials('email', { required: 'Email is required' })}
                  type="email"
                  className={inputBase}
                  placeholder="Email Address"
                />
              </div>
              {credentialsErrors.email && (
                <p className="mt-1.5 text-sm text-red-600">{credentialsErrors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password *</label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    toast('Contact your administrator to reset password.', { icon: 'ℹ️' })
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...registerCredentials('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  className={inputBase}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {credentialsErrors.password && (
                <p className="mt-1.5 text-sm text-red-600">{credentialsErrors.password.message}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                {...registerCredentials('rememberMe')}
                type="checkbox"
                id="rememberMe"
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-600">
                Remember Me
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3.5 rounded-xl font-semibold hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/30 active:scale-[0.98]"
            >
              {loading ? 'Verifying...' : 'Log In'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            Only companies created in License Server can access the product.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
