import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../api/axios'
import { useAuthStore } from '../store/authStore'
import { setLicenseCheckPassed } from '../utils/licenseCheck'
import { extractAuthError } from '../api/errorUtils'
import toast from 'react-hot-toast'

interface LicenseKeyForm {
  license_key: string
}

const LicenseCheck = () => {
  const navigate = useNavigate()
  const { setCompanyDetail, user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LicenseKeyForm>()

  const onSubmit = async (data: LicenseKeyForm) => {
    const licenseKey = (data.license_key || '').trim()
    if (!licenseKey) {
      toast.error('Please enter your license key.')
      return
    }

    setLoading(true)
    try {
      const response = await api.post<{ company: Record<string, unknown> }>('/auth/attach-license/', {
        license_key: licenseKey,
      })
      if (response.data.company) {
        setCompanyDetail(response.data.company as any)
        setLicenseCheckPassed()
        toast.success('License activated successfully')
        navigate('/company-admin')
      }
    } catch (error) {
      const msg = extractAuthError(error, 'Invalid license key. Please try again.')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            License Required
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Your company account requires a valid license key to access the dashboard. Enter the license key provided by your administrator.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Key *
              </label>
              <input
                {...register('license_key', { required: 'License key is required' })}
                type="text"
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your license key"
                maxLength={500}
              />
              {errors.license_key && (
                <p className="mt-1 text-sm text-red-600">{errors.license_key.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Activate License'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LicenseCheck
