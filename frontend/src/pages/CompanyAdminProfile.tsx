import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { companiesAPI, Company } from '../api/companies'
import CompanySuspendedScreen from '../components/CompanySuspendedScreen'
import toast from 'react-hot-toast'

export default function CompanyAdminProfile() {
  const { user } = useAuthStore()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  if (user?.company?.status === 'suspended') {
    return <CompanySuspendedScreen />
  }

  useEffect(() => {
    loadCompany()
  }, [])

  const loadCompany = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await companiesAPI.getMyCompany()
      setCompany(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load profile')
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              to="/company-admin"
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && !company && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
            <Link to="/company-admin" className="mt-2 inline-block text-blue-600 hover:text-blue-800 text-sm">
              ← Back to Dashboard
            </Link>
          </div>
        )}

        {company && (
          <div className="space-y-6">
            {/* My Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">My Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Name</label>
                  <p className="mt-1 text-gray-900">{user?.full_name || user?.username || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Username</label>
                  <p className="mt-1 text-gray-900">@{user?.username || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-gray-900">{user?.email || '—'}</p>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Company Information</h2>
              <p className="text-sm text-gray-500 mb-4">Details defined by your administrator.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Company Name</label>
                  <p className="mt-1 text-gray-900">{company.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Company Code</label>
                  <p className="mt-1 font-mono text-gray-900">{company.company_code}</p>
                </div>
                {company.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-gray-900">{company.email}</p>
                  </div>
                )}
                {company.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-gray-900">{company.phone}</p>
                  </div>
                )}
                {(company.address || company.address_line1) && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Address</label>
                    <p className="mt-1 text-gray-900">{company.address || company.address_line1}</p>
                  </div>
                )}
                {(company.city || company.state || company.country) && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Location</label>
                    <p className="mt-1 text-gray-900">
                      {[company.city, company.state, company.country].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                )}
                {company.GST_NO && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">GST No / Tax ID</label>
                    <p className="mt-1 font-mono text-gray-900">{company.GST_NO}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      company.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {company.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* License Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">License Information</h2>
              <p className="text-sm text-gray-500 mb-4">License details as configured by Super Admin.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">License Key</label>
                  <p className="mt-1 font-mono text-gray-900">{company.license_key || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Product</label>
                  <p className="mt-1 text-gray-900">{company.license_product_name || 'Minitab'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">User Access</label>
                  <p className="mt-1 text-gray-900">
                    {(company.subscription?.current_users ?? company.active_users_count ?? 0)} / {company.total_user_access ?? company.subscription?.user_limit ?? company.subscription?.max_users ?? '—'}
                    <span className="text-gray-500 text-sm ml-1">(active / licensed)</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">License Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      (company.license_status || company.status) === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {company.license_status || company.status || '—'}
                    </span>
                  </p>
                </div>
                {company.license_expiration_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">License Expiry</label>
                    <p className="mt-1 text-gray-900">
                      {new Date(company.license_expiration_date).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                {company.license_purchase_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Purchase Date</label>
                    <p className="mt-1 text-gray-900">
                      {new Date(company.license_purchase_date).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                {company.license_location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">License Location</label>
                    <p className="mt-1 text-gray-900">{company.license_location}</p>
                  </div>
                )}
                {company.license_role_limits && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Role Allocation</label>
                    <p className="mt-1 text-gray-900">
                      Super Admins: {company.license_role_limits.max_super_admins ?? 0}, Company Admins: {company.license_role_limits.max_company_admins ?? 0}, Users: {company.license_role_limits.max_users ?? 0}
                    </p>
                  </div>
                )}
                {company.license_description && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Description</label>
                    <p className="mt-1 text-gray-900">{company.license_description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription */}
            {company.subscription && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Subscription</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Plan</label>
                    <p className="mt-1 text-gray-900">
                      {typeof company.subscription.plan === 'object' && company.subscription.plan !== null && 'name' in company.subscription.plan
                        ? (company.subscription.plan as { name: string }).name
                        : company.subscription.plan}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <p className="mt-1">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        company.subscription.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {company.subscription.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Licensed Users</label>
                    <p className="mt-1 text-gray-900">
                      {company.subscription.current_users ?? 0} / {company.subscription.user_limit ?? company.subscription.max_users ?? '—'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Expires on</label>
                    <p className="mt-1 text-gray-900 font-medium">
                      {company.subscription.end_date
                        ? new Date(company.subscription.end_date).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Start Date</label>
                    <p className="mt-1 text-gray-500 text-sm">
                      {company.subscription.start_date
                        ? new Date(company.subscription.start_date).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
