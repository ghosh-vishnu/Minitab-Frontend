import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { licensesAPI, SoftwareLicense, CreateSoftwareLicenseData } from '../api/subscriptions'
import { companiesAPI, Company, type ProductModule } from '../api/companies'
import toast from 'react-hot-toast'

const PAGE_SIZE = 100

function formatDate(iso: string | null) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function SuperAdminUserLicense() {
  const [licenses, setLicenses] = useState<SoftwareLicense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchRecordType, setSearchRecordType] = useState('Record ID')
  const [searchValue, setSearchValue] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const navigate = useNavigate()

  const loadLicenses = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await licensesAPI.list({ page, page_size: PAGE_SIZE })
      setLicenses(res.results ?? [])
      setTotalCount(res.count ?? res.results?.length ?? 0)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to load licenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLicenses()
  }, [page])

  useEffect(() => {
    companiesAPI.listCompanies({ page_size: 500 }).then((r) => setCompanies(r.results ?? [])).catch(() => setCompanies([]))
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadLicenses()
  }

  const handleCreateLicense = async (data: CreateSoftwareLicenseData) => {
    try {
      await licensesAPI.create(data)
      setShowCreateModal(false)
      loadLicenses()
      toast.success('License created')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Create failed'
      throw new Error(msg)
    }
  }

  const start = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, totalCount)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">User License</h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create License
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
        <button type="submit" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600" aria-label="Search">
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Id</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Id</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Key</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Access</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchased Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expire Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {licenses.map((lic) => (
                    <tr key={lic.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{lic.id}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">{lic.company_id || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{lic.company_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">{lic.license_key || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lic.product_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{lic.total_user_access ?? '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(lic.purchase_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(lic.expiration_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/super-admin/company/user-license/view/${lic.id}`)}
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
                            onClick={() => {
                              if (window.confirm('Delete this license?')) {
                                licensesAPI.delete(lic.id).then(() => {
                                  toast.success('License deleted')
                                  loadLicenses()
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
              <span>Rows per page: <span className="font-medium">{PAGE_SIZE}</span></span>
              <span>{start}-{end} of {totalCount}</span>
              <div className="flex gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Previous">‹</button>
                <button type="button" disabled={end >= totalCount} onClick={() => setPage((p) => p + 1)} className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Next">›</button>
              </div>
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateLicenseModal
          companies={companies}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateLicense}
        />
      )}
    </div>
  )
}

function CreateLicenseModal({
  companies,
  onClose,
  onSubmit,
}: {
  companies: Company[]
  onClose: () => void
  onSubmit: (data: CreateSoftwareLicenseData) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [productModules, setProductModules] = useState<ProductModule[]>([])
  const [moduleAccess, setModuleAccess] = useState<Record<string, string[]>>({})
  const [form, setForm] = useState<CreateSoftwareLicenseData & { purchase_date?: string; expiration_date?: string }>({
    company: '',
    product_name: 'Minitab',
    purchase_date: '',
    expiration_date: '',
    location: '',
    total_user_access: 10,
    description: '',
  })

  useEffect(() => {
    companiesAPI.getProductModules().then(setProductModules).catch(() => setProductModules([]))
  }, [])

  const toggleModule = (moduleId: string) => {
    setModuleAccess((prev) => {
      if (prev[moduleId] !== undefined) {
        const next = { ...prev }
        delete next[moduleId]
        return next
      }
      return { ...prev, [moduleId]: [] }
    })
  }

  const toggleSubmodule = (moduleId: string, subId: string) => {
    const current = moduleAccess[moduleId] ?? []
    const next = current.includes(subId) ? current.filter((s) => s !== subId) : [...current, subId]
    setModuleAccess((prev) => ({ ...prev, [moduleId]: next }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company) {
      setErr('Company is required')
      return
    }
    setErr(null)
    setLoading(true)
    try {
      const payload: CreateSoftwareLicenseData = {
        company: form.company,
        product_name: form.product_name || 'Minitab',
        purchase_date: form.purchase_date || undefined,
        expiration_date: form.expiration_date || undefined,
        location: form.location || undefined,
        total_user_access: form.total_user_access ?? 10,
        description: form.description || undefined,
        module_access: Object.keys(moduleAccess).length ? moduleAccess : undefined,
      }
      await onSubmit(payload)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Software License</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 overflow-auto space-y-4">
          <p className="text-sm font-medium text-gray-700">Software License Details</p>
          {err && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{err}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company <span className="text-red-500">*</span></label>
              <select required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.company_code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company ID</label>
              <p className="mt-1 text-sm text-gray-600">{companies.find((c) => c.id === form.company)?.company_code ?? '-'}</p>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Module access (select one or more modules)</label>
              <p className="mb-3 text-xs text-gray-500">Check the modules you want; for each selected module, choose sub-modules via the tabs below it.</p>
              <div className="space-y-4 rounded-lg border border-gray-200 p-3 bg-gray-50/50">
                {productModules.map((m) => {
                  const isChecked = moduleAccess[m.id] !== undefined
                  const submodules = m.submodules ?? []
                  return (
                    <div key={m.id} className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleModule(m.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900">{m.name}</span>
                      </label>
                      {isChecked && submodules.length > 0 && (
                        <div className="ml-6 flex flex-wrap gap-2">
                          {submodules.map((sub) => {
                            const selected = (moduleAccess[m.id] ?? []).includes(sub.id)
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => toggleSubmodule(m.id, sub.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                              >
                                {sub.name}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {isChecked && submodules.length === 0 && (
                        <p className="ml-6 text-xs text-gray-500">No sub-modules.</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input type="text" value={form.product_name ?? ''} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total User Access <span className="text-red-500">*</span></label>
              <input type="number" min={0} required value={form.total_user_access ?? 10} onChange={(e) => setForm({ ...form, total_user_access: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date <span className="text-red-500">*</span></label>
              <input type="date" required value={form.purchase_date ?? ''} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date <span className="text-red-500">*</span></label>
              <input type="date" required value={form.expiration_date ?? ''} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-red-500">*</span></label>
              <input type="text" required value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
            <textarea required value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
