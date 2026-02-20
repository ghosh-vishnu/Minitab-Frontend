import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { licensesAPI, SoftwareLicense } from '../api/subscriptions'
import toast from 'react-hot-toast'

function formatDate(iso: string | null) {
  if (!iso) return '-'
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch {
    return iso
  }
}

export default function SuperAdminLicenseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [license, setLicense] = useState<SoftwareLicense | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    licensesAPI.get(Number(id)).then(setLicense).catch(() => toast.error('Failed to load license')).finally(() => setLoading(false))
  }, [id])

  const runAction = async (action: 'activate' | 'disable' | 'extend') => {
    if (!id) return
    setActionLoading(action)
    try {
      if (action === 'activate') await licensesAPI.activate(Number(id))
      else if (action === 'disable') await licensesAPI.disable(Number(id))
      else if (action === 'extend') await licensesAPI.extend(Number(id), { extend_days: 30 })
      toast.success(action === 'extend' ? 'License extended' : `License ${action}d`)
      licensesAPI.get(Number(id)).then(setLicense)
    } catch {
      toast.error(`Action failed: ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-blue-600" />
      </div>
    )
  }
  if (!license) {
    return (
      <div className="p-4">
        <p className="text-red-600">License not found.</p>
        <button type="button" onClick={() => navigate('/super-admin/company/user-license')} className="mt-2 text-blue-600 hover:underline">Back to User License</button>
      </div>
    )
  }

  const activationDisplay = license.activation_limit === 0 || license.activation_limit == null
    ? '0/Unlimited'
    : `${license.activation_limit ?? 0}`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/super-admin/company/user-license')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Software License Details</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-sm font-semibold text-gray-900">License Details</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-500">License ID</p>
            <p className="mt-1 text-gray-900">{license.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">License Key</p>
            <p className="mt-1 text-gray-900 font-mono">{license.license_key || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Company / Customer</p>
            <p className="mt-1 text-gray-900">{license.company_name || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Company ID</p>
            <p className="mt-1 text-gray-900 font-mono">{license.company_id || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Product</p>
            <p className="mt-1 text-gray-900">{license.product_name || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <p className="mt-1 text-gray-900 capitalize">{license.status || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Purchase Date</p>
            <p className="mt-1 text-gray-900">{formatDate(license.purchase_date)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Expiration Date</p>
            <p className="mt-1 text-gray-900">{formatDate(license.expiration_date)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total User Access</p>
            <p className="mt-1 text-gray-900">{license.total_user_access ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Activation Limit</p>
            <p className="mt-1 text-gray-900">{activationDisplay}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Location</p>
            <p className="mt-1 text-gray-900">{license.location || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Created At</p>
            <p className="mt-1 text-gray-900">{license.created_at ? new Date(license.created_at).toLocaleString() : '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Updated At</p>
            <p className="mt-1 text-gray-900">{license.updated_at ? new Date(license.updated_at).toLocaleString() : '-'}</p>
          </div>
        </div>

        {license.description && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
            <p className="text-gray-900 whitespace-pre-wrap">{license.description}</p>
          </div>
        )}

        {license.module_access && Object.keys(license.module_access).length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-500 mb-2">Module Access</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(license.module_access).map(([modId, subIds]) => (
                <div key={modId} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
                  <span className="font-medium text-gray-900">{modId}</span>
                  {Array.isArray(subIds) && subIds.length > 0 && (
                    <span className="text-gray-600">: {subIds.join(', ')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => runAction('activate')}
            disabled={actionLoading !== null || license.status === 'active'}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg"
          >
            {actionLoading === 'activate' ? '...' : 'Activate'}
          </button>
          <button
            type="button"
            onClick={() => runAction('extend')}
            disabled={actionLoading !== null}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg"
          >
            {actionLoading === 'extend' ? '...' : 'Extend'}
          </button>
          <button
            type="button"
            onClick={() => runAction('disable')}
            disabled={actionLoading !== null || license.status === 'disabled'}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white text-sm rounded-lg"
          >
            {actionLoading === 'disable' ? '...' : 'Disable'}
          </button>
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
          >
            Send Renewal Notice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Related License</h2>
        <p className="text-sm text-gray-500">No related licenses.</p>
      </div>
    </div>
  )
}
