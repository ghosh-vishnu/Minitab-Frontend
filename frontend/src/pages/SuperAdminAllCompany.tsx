import { useState, useEffect } from 'react'
import { companiesAPI, Company, CreateCompanyData } from '../api/companies'
import { plansAPI } from '../api/subscriptions'
import type { SubscriptionPlan } from '../types/subscription'
import { REGIONS, getCountriesByRegionId, getTimeZonesForCountry } from '../data/regionCountry'
import toast from 'react-hot-toast'

const PAGE_SIZE = 100

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function SuperAdminAllCompany() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchRecordType, setSearchRecordType] = useState('Record ID')
  const [searchValue, setSearchValue] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null)
  const [viewCompanyId, setViewCompanyId] = useState<string | null>(null)
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])

  const loadCompanies = async (overrides?: { page?: number; search?: string }) => {
    try {
      setLoading(true)
      setError(null)
      const p = overrides?.page ?? page
      const q = overrides?.search !== undefined ? overrides.search : searchValue
      const params: { page_size: number; page?: number; search?: string } = { page_size: PAGE_SIZE }
      if (p > 1) params.page = p
      if (q.trim()) params.search = q.trim()
      const res = await companiesAPI.listCompanies(params)
      setCompanies(res.results ?? [])
      setTotalCount(res.count ?? res.results?.length ?? 0)
      if (overrides?.page !== undefined) setPage(overrides.page)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadCompanies({ page: 1, search: searchValue })
  }

  const handleCreateCompany = async (data: CreateCompanyData) => {
    try {
      await companiesAPI.createCompany(data)
      setShowCreateModal(false)
      loadCompanies()
      toast.success('Company created successfully')
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        (typeof err.response?.data === 'object'
          ? Object.entries(err.response?.data || {})
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')
          : 'Failed to create company')
      throw new Error(msg)
    }
  }

  const handleAssignSubscription = async (companyId: string, planId: string) => {
    try {
      await companiesAPI.assignSubscription(companyId, { plan_id: planId })
      setShowAssignModal(null)
      loadCompanies()
      toast.success('Plan assigned')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to assign plan')
    }
  }

  const handleToggleStatus = async (company: Company) => {
    try {
      if (company.status === 'active') {
        await companiesAPI.suspendCompany(company.id)
        toast.success('Company suspended')
      } else {
        await companiesAPI.activateCompany(company.id)
        toast.success('Company activated')
      }
      loadCompanies()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Action failed')
    }
  }

  useEffect(() => {
    plansAPI.listPlans().then((res) => setPlans(res.results ?? [])).catch(() => setPlans([]))
  }, [])

  const start = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, totalCount)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">All Company</h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Company
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
        <select
          value={searchRecordType}
          onChange={(e) => setSearchRecordType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700"
        >
          <option>Record ID</option>
        </select>
        <input
          type="text"
          placeholder="Enter search value"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
          aria-label="Search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-blue-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GST_NO
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mobile No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email Id
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {company.company_code || company.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {company.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {company.GST_NO || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {company.phone || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 max-w-[180px] truncate">
                        {company.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {company.country || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {company.created_at ? formatDate(company.created_at) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={company.is_active && company.status === 'active'}
                          onClick={() => handleToggleStatus(company)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            company.is_active && company.status === 'active'
                              ? 'bg-blue-600'
                              : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                              company.is_active && company.status === 'active'
                                ? 'translate-x-5'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewCompanyId(company.id)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="View"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditCompanyId(company.id)}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Delete this company? This cannot be undone.')) {
                                companiesAPI.deleteCompany(company.id).then(() => {
                                  toast.success('Company deleted')
                                  loadCompanies()
                                }).catch(() => toast.error('Delete failed'))
                              }
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
              <span>
                Rows per page:{' '}
                <span className="font-medium">{PAGE_SIZE}</span>
              </span>
              <span>
                {start}-{end} of {totalCount}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={end >= totalCount}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateCompanyModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateCompany}
        />
      )}
      {showAssignModal && (
        <AssignSubscriptionModal
          companyId={showAssignModal}
          plans={plans}
          onClose={() => setShowAssignModal(null)}
          onSubmit={handleAssignSubscription}
        />
      )}
      {viewCompanyId && (
        <ViewCompanyModal
          companyId={viewCompanyId}
          onClose={() => setViewCompanyId(null)}
        />
      )}
      {editCompanyId && (
        <EditCompanyModal
          companyId={editCompanyId}
          onClose={() => setEditCompanyId(null)}
          onSaved={() => {
            setEditCompanyId(null)
            loadCompanies()
          }}
        />
      )}
    </div>
  )
}

// View Company modal – compact two-column layout (Company Id, Name, Country, Location, Mobile | Status, Region, Time Zone, License No, Email)
function ViewCompanyModal({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    companiesAPI.getCompany(companyId, { view: 'minimal' }).then(setCompany).catch(() => setError('Failed to load company')).finally(() => setLoading(false))
  }, [companyId])

  const timeZone = company?.time_zone ?? company?.settings?.time_zone ?? ''
  const location = [company?.city, company?.address_line1 ?? company?.address].filter(Boolean).join(', ') || '-'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">View Company</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-4 overflow-auto">
          {loading && <p className="text-sm text-gray-500">Loading...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && company && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="text-gray-500 font-medium">Company Id</p>
                <p className="mt-0.5 text-gray-900">{company.company_code || company.id.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Status</p>
                <p className="mt-0.5 text-gray-900 uppercase">{company.status || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Company Name</p>
                <p className="mt-0.5 text-gray-900">{company.name}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Region</p>
                <p className="mt-0.5 text-gray-900">{company.state || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Country</p>
                <p className="mt-0.5 text-gray-900">{company.country || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Time Zone</p>
                <p className="mt-0.5 text-gray-900">{timeZone || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Location</p>
                <p className="mt-0.5 text-gray-900">{location}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">GST No</p>
                <p className="mt-0.5 text-gray-900">{company.GST_NO || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Mobile No</p>
                <p className="mt-0.5 text-gray-900">{company.phone || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Email Id</p>
                <p className="mt-0.5 text-gray-900">{company.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export interface EditCompanyFormData {
  name: string
  regionId: string
  country: string
  time_zone: string
  location: string
  licenseNo: string
  phone: string
  email: string
  admin_new_password: string
  admin_confirm_password: string
}

// Edit Company modal – 8 fields (Company Name, Region, Country, Time Zone, Location, License No, Mobile No, Email Id), Reset + Save, PATCH
function EditCompanyModal({
  companyId,
  onClose,
  onSaved,
}: {
  companyId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<EditCompanyFormData>({
    name: '',
    regionId: '',
    country: '',
    time_zone: '',
    location: '',
    licenseNo: '',
    phone: '',
    email: '',
    admin_new_password: '',
    admin_confirm_password: '',
  })

  const countryOptions = formData.regionId ? getCountriesByRegionId(formData.regionId) : []
  const timeZoneOptions = formData.country ? getTimeZonesForCountry(formData.country) : []

  useEffect(() => {
    companiesAPI
      .getCompany(companyId)
      .then((c) => {
        setCompany(c)
        const regionId = REGIONS.find((r) => r.name === (c.state ?? ''))?.id ?? ''
        const country = c.country ?? ''
        const tzOptions = getTimeZonesForCountry(country)
        const time_zone = (c.settings?.time_zone as string) ?? tzOptions[0]?.value ?? ''
        const location = c.address || c.city || c.address_line1 || ''
        setFormData({
          name: c.name,
          regionId,
          country,
          time_zone,
          location,
          licenseNo: c.GST_NO ?? '',
          phone: c.phone ?? '',
          email: c.email,
          admin_new_password: '',
          admin_confirm_password: '',
        })
      })
      .catch(() => setError('Failed to load company'))
      .finally(() => setLoading(false))
  }, [companyId])

  const initialValues = company
    ? {
        name: company.name,
        regionId: REGIONS.find((r) => r.name === (company.state ?? ''))?.id ?? '',
        country: company.country ?? '',
        time_zone: (company.settings?.time_zone as string) ?? '',
        location: company.address || company.city || company.address_line1 || '',
        licenseNo: company.GST_NO ?? '',
        phone: company.phone ?? '',
        email: company.email,
        admin_new_password: '',
        admin_confirm_password: '',
      }
    : null

  const handleReset = () => {
    if (initialValues) setFormData(initialValues)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return
    if (formData.admin_new_password.trim() && formData.admin_new_password !== formData.admin_confirm_password) {
      setError('New password and Confirm password must match.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const regionName = REGIONS.find((r) => r.id === formData.regionId)?.name ?? formData.regionId
      const payload: Parameters<typeof companiesAPI.updateCompany>[1] = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.location,
        state: regionName,
        country: formData.country,
        GST_NO: formData.licenseNo,
        settings: { ...(company.settings || {}), time_zone: formData.time_zone },
      }
      if (formData.admin_new_password.trim()) {
        payload.admin_new_password = formData.admin_new_password
        payload.admin_confirm_password = formData.admin_confirm_password
      }
      await companiesAPI.updateCompany(company.id, payload)
      toast.success('Company updated')
      onSaved()
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        (typeof err.response?.data === 'object'
          ? Object.entries(err.response?.data || {}).map(([k, v]) => `${k}: ${v}`).join(', ')
          : 'Update failed')
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onRegionChange = (regionId: string) => {
    setFormData((prev) => ({ ...prev, regionId, country: '', time_zone: '' }))
  }
  const onCountryChange = (countryName: string) => {
    const zones = getTimeZonesForCountry(countryName)
    setFormData((prev) => ({ ...prev, country: countryName, time_zone: zones[0]?.value ?? '' }))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-8 text-center text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Company</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 overflow-auto space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Company Name <span className="text-red-500">*</span></label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Region <span className="text-red-500">*</span></label>
              <select required value={formData.regionId} onChange={(e) => onRegionChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select region</option>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Country <span className="text-red-500">*</span></label>
              <select required value={formData.country} onChange={(e) => onCountryChange(e.target.value)} disabled={!formData.regionId} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100">
                <option value="">Select country</option>
                {countryOptions.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Time Zone <span className="text-red-500">*</span></label>
            <select required value={formData.time_zone} onChange={(e) => setFormData({ ...formData, time_zone: e.target.value })} disabled={!formData.country} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100">
              <option value="">Select time zone</option>
              {timeZoneOptions.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Location <span className="text-red-500">*</span></label>
            <input type="text" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter GST No <span className="text-red-500">*</span></label>
            <input type="text" required value={formData.licenseNo} onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })} placeholder="e.g. GST No, CIN" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Mobile No <span className="text-red-500">*</span></label>
              <input type="text" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Email Id <span className="text-red-500">*</span></label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Reset Primary Admin Password (optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">New Password</label>
                <input type="password" value={formData.admin_new_password} onChange={(e) => setFormData({ ...formData, admin_new_password: e.target.value })} placeholder="Leave blank to keep current" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" minLength={8} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Confirm Password</label>
                <input type="password" value={formData.admin_confirm_password} onChange={(e) => setFormData({ ...formData, admin_confirm_password: e.target.value })} placeholder="Leave blank to keep current" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" minLength={8} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={handleReset} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Reset
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Create Company Modal – matches design (required fields + confirm password, time_zone, etc.)
function CreateCompanyModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: CreateCompanyData) => Promise<void>
}) {
  const [formData, setFormData] = useState<CreateCompanyData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    state: '',
    country: '',
    time_zone: 'Asia/Kolkata',
    tax_id: '',
    max_users: 10,
    admin_email: '',
    admin_password: '',
    admin_confirm_password: '',
    admin_first_name: '',
    admin_last_name: '',
    subscription_duration_months: 12,
    module_access: {},
  })
  const [regionId, setRegionId] = useState<string>('')
  const countryOptions = regionId ? getCountriesByRegionId(regionId) : []
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onRegionChange = (newRegionId: string) => {
    setRegionId(newRegionId)
    setFormData((prev) => ({ ...prev, country: '', time_zone: '' }))
  }
  const onCountryChange = (countryName: string) => {
    const zones = getTimeZonesForCountry(countryName)
    const firstZone = zones[0]?.value ?? ''
    setFormData((prev) => ({ ...prev, country: countryName, time_zone: firstZone }))
  }
  const timeZoneOptions = formData.country ? getTimeZonesForCountry(formData.country) : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      if (formData.admin_password !== formData.admin_confirm_password) {
        setError('Password and Confirm Password must match.')
        setLoading(false)
        return
      }
      const payload: CreateCompanyData & { GST_NO?: string } = { ...formData }
      payload.module_access = formData.module_access || {}
      if (!payload.admin_email) payload.admin_email = payload.email
      if (payload.tax_id !== undefined) {
        payload.GST_NO = payload.tax_id
        delete payload.tax_id
      }
      await onSubmit(payload)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create Company</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Company Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Region <span className="text-red-500">*</span></label>
              <select
                required
                value={regionId}
                onChange={(e) => onRegionChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select region</option>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Country <span className="text-red-500">*</span></label>
              <select
                required
                value={formData.country}
                onChange={(e) => onCountryChange(e.target.value)}
                disabled={!regionId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Select country</option>
                {countryOptions.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {regionId && !countryOptions.length && (
                <p className="mt-1 text-xs text-gray-500">No countries in this region.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Time Zone <span className="text-red-500">*</span></label>
              <select
                required
                value={formData.time_zone}
                onChange={(e) => setFormData({ ...formData, time_zone: e.target.value })}
                disabled={!formData.country}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Select time zone</option>
                {timeZoneOptions.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              {formData.country && !timeZoneOptions.length && (
                <p className="mt-1 text-xs text-gray-500">No time zones defined for this country.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Location <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter GST No. <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.tax_id ?? ''}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="e.g. GST No, CIN"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Company registration / tax ID (GST No, CIN, etc.). No system license key is generated here.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Mobile No <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Email Id <span className="text-red-500">*</span></label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => {
                  const v = e.target.value
                  setFormData((prev) => ({ ...prev, email: v, admin_email: v }))
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Used as company email and primary admin login.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Password <span className="text-red-500">*</span></label>
              <input
                type="password"
                required
                minLength={8}
                value={formData.admin_password}
                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Confirm Password <span className="text-red-500">*</span></label>
              <input
                type="password"
                required
                value={formData.admin_confirm_password}
                onChange={(e) => setFormData({ ...formData, admin_confirm_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
              Reset
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AssignSubscriptionModal({
  companyId,
  plans,
  onClose,
  onSubmit,
}: {
  companyId: string
  plans: SubscriptionPlan[]
  onClose: () => void
  onSubmit: (companyId: string, planId: string) => Promise<void>
}) {
  const [selectedPlan, setSelectedPlan] = useState('')
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan) return
    setLoading(true)
    try {
      await onSubmit(companyId, selectedPlan)
      onClose()
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Assign Plan</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {plans.map((p) => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="plan" value={p.id} checked={selectedPlan === p.id} onChange={() => setSelectedPlan(p.id)} className="text-blue-600" />
              <span>{p.name}</span>
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" disabled={loading || !selectedPlan} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
