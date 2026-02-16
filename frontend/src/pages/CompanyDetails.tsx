import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { companiesAPI, Company, UpdateCompanyData, ProductModule } from '../api/companies'
import { subscriptionsAPI, plansAPI } from '../api/subscriptions'
import type { SubscriptionPlan } from '../types/subscription'
import toast from 'react-hot-toast'

export default function CompanyDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<UpdateCompanyData>({})
  const [featuresMaxUsers, setFeaturesMaxUsers] = useState<number>(1)
  const [savingFeatures, setSavingFeatures] = useState(false)
  const [isEditingSubscription, setIsEditingSubscription] = useState(false)
  const [subscriptionFormData, setSubscriptionFormData] = useState<{
    plan: string
    status: string
    start_date: string
    end_date: string
  }>({ plan: '', status: 'active', start_date: '', end_date: '' })
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [savingSubscription, setSavingSubscription] = useState(false)
  const [productModules, setProductModules] = useState<ProductModule[]>([])
  const [isEditingModuleAccess, setIsEditingModuleAccess] = useState(false)
  const [moduleAccessForm, setModuleAccessForm] = useState<Record<string, string[]>>({})
  const [savingModuleAccess, setSavingModuleAccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    companiesAPI.getProductModules().then((data) => {
      if (!cancelled) setProductModules(data)
    }).catch(() => { if (!cancelled) setProductModules([]) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (id) {
      loadCompany()
    }
  }, [id])

  const loadCompany = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const data = await companiesAPI.getCompany(id)
      setCompany(data)
      setFormData({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        address: data.address_line1 || data.address || '',
        website: data.website || '',
        module_access: data.module_access ?? {},
      })
      if (data.subscription) {
        const limit = data.subscription.user_limit ?? data.subscription.max_users ?? 1
        setFeaturesMaxUsers(typeof limit === 'number' ? limit : 1)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load company details')
      toast.error('Failed to load company details')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    try {
      setLoading(true)
      await companiesAPI.updateCompany(id, formData)
      toast.success('Company updated successfully')
      setIsEditing(false)
      loadCompany()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update company')
      toast.error('Failed to update company')
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async () => {
    if (!id || !company) return
    if (!confirm('Are you sure you want to suspend this company?')) return

    try {
      await companiesAPI.suspendCompany(id)
      toast.success('Company suspended successfully')
      loadCompany()
    } catch (err: any) {
      toast.error('Failed to suspend company')
    }
  }

  const handleActivate = async () => {
    if (!id) return

    try {
      await companiesAPI.activateCompany(id)
      toast.success('Company activated successfully')
      loadCompany()
    } catch (err: any) {
      toast.error('Failed to activate company')
    }
  }

  const handleUpdateFeatures = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !company?.subscription) return

    const currentUsers = company.subscription.current_users ?? 0
    if (featuresMaxUsers < currentUsers) {
      toast.error(`Licensed users cannot be less than current users (${currentUsers})`)
      return
    }

    try {
      setSavingFeatures(true)
      await companiesAPI.updateSubscriptionFeatures(id, { max_users: featuresMaxUsers })
      toast.success('Features updated successfully')
      loadCompany()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update features'
      toast.error(msg)
    } finally {
      setSavingFeatures(false)
    }
  }

  const loadPlans = async () => {
    try {
      setLoadingPlans(true)
      const res = await plansAPI.listPlans({ page_size: 100 })
      setPlans(res.results || [])
    } catch {
      toast.error('Failed to load plans')
    } finally {
      setLoadingPlans(false)
    }
  }

  const openSubscriptionEdit = () => {
    if (!company?.subscription) return
    const sub = company.subscription
    const planId = typeof sub.plan === 'object' && sub.plan !== null && 'id' in sub.plan
      ? (sub.plan as { id: string }).id
      : (sub.plan as string)
    setSubscriptionFormData({
      plan: planId,
      status: sub.status || 'active',
      start_date: sub.start_date ? sub.start_date.slice(0, 10) : '',
      end_date: sub.end_date ? sub.end_date.slice(0, 10) : '',
    })
    if (plans.length === 0) loadPlans()
    setIsEditingSubscription(true)
  }

  const startEditModuleAccess = () => {
    setModuleAccessForm({ ...(company?.module_access ?? {}) })
    setIsEditingModuleAccess(true)
  }

  const cancelEditModuleAccess = () => {
    setIsEditingModuleAccess(false)
    setModuleAccessForm({})
  }

  const handleSaveModuleAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      setSavingModuleAccess(true)
      await companiesAPI.updateCompany(id, { module_access: moduleAccessForm })
      toast.success('Module access updated')
      await loadCompany()
      setIsEditingModuleAccess(false)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update module access')
    } finally {
      setSavingModuleAccess(false)
    }
  }

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company?.subscription?.id) return
    const { plan, status, start_date, end_date } = subscriptionFormData
    if (!start_date || !end_date) {
      toast.error('Start date and end date are required')
      return
    }
    if (new Date(end_date) <= new Date(start_date)) {
      toast.error('End date must be after start date')
      return
    }

    try {
      setSavingSubscription(true)
      await subscriptionsAPI.patchSubscription(company.subscription.id, {
        plan,
        status: status as 'active' | 'expired' | 'cancelled' | 'suspended' | 'trial',
        start_date: start_date + 'T00:00:00Z',
        end_date: end_date + 'T23:59:59Z',
      })
      toast.success('Subscription updated successfully')
      setIsEditingSubscription(false)
      loadCompany()
    } catch (err: any) {
      const msg =
        err.response?.data?.end_date?.[0] ||
        err.response?.data?.detail ||
        'Failed to update subscription'
      toast.error(typeof msg === 'string' ? msg : 'Failed to update subscription')
    } finally {
      setSavingSubscription(false)
    }
  }

  if (loading && !company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !company) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => navigate('/super-admin')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!company) return null

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    }
    return colors[status as keyof typeof colors] || colors.inactive
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/super-admin"
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                <p className="mt-1 text-sm text-gray-600">Licence Key: {company.company_code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadge(company.status)}`}>
                {company.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Company Details</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name*</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Email*</label>
                    <input
                      type="email"
                      required
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={formData.website || ''}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false)
                        setFormData({
                          name: company.name,
                          email: company.email,
                          phone: company.phone || '',
                          address: company.address || '',
                          website: company.website || '',
                          module_access: company.module_access ?? {},
                        })
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{company.email}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Phone</label>
                      <p className="mt-1 text-sm text-gray-900">{company.phone || '-'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500">Website</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {company.website ? (
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            {company.website}
                          </a>
                        ) : '-'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Address</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{company.address_line1 || company.address || '-'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Created</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(company.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Subscription Info */}
            {company.subscription && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Subscription</h2>
                  {!isEditingSubscription && (
                    <button
                      type="button"
                      onClick={openSubscriptionEdit}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditingSubscription ? (
                  <form onSubmit={handleSaveSubscription} className="space-y-4">
                    <div>
                      <label htmlFor="sub-plan" className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                      <select
                        id="sub-plan"
                        value={subscriptionFormData.plan}
                        onChange={(e) => setSubscriptionFormData((s) => ({ ...s, plan: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {loadingPlans ? (
                          <option>Loading plans...</option>
                        ) : (
                          plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="sub-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        id="sub-status"
                        value={subscriptionFormData.status}
                        onChange={(e) => setSubscriptionFormData((s) => ({ ...s, status: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="trial">Trial</option>
                        <option value="suspended">Suspended</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="sub-start" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          id="sub-start"
                          type="date"
                          value={subscriptionFormData.start_date}
                          onChange={(e) => setSubscriptionFormData((s) => ({ ...s, start_date: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="sub-end" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          id="sub-end"
                          type="date"
                          value={subscriptionFormData.end_date}
                          onChange={(e) => setSubscriptionFormData((s) => ({ ...s, end_date: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingSubscription(false)}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingSubscription || loadingPlans}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingSubscription ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Plan</label>
                      <p className="mt-1 text-sm text-gray-900 font-medium">
                        {typeof company.subscription.plan === 'object' && company.subscription.plan !== null && 'name' in company.subscription.plan
                          ? (company.subscription.plan as { name: string }).name
                          : company.subscription.plan}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Status</label>
                        <p className="mt-1">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            company.subscription.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {company.subscription.status}
                          </span>
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Tier</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {typeof company.subscription.plan === 'object' && company.subscription.plan !== null && 'tier' in company.subscription.plan
                            ? (company.subscription.plan as { tier?: string }).tier ?? '—'
                            : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Licensed Users</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {company.subscription.current_users ?? 0} / {company.subscription.user_limit ?? company.subscription.max_users ?? '—'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Start Date</label>
                        <p className="mt-1 text-sm text-gray-900">{new Date(company.subscription.start_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">End Date</label>
                        <p className="mt-1 text-sm text-gray-900">{new Date(company.subscription.end_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Module Access */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Module Access</h2>
                {!isEditingModuleAccess && (
                  <button
                    type="button"
                    onClick={startEditModuleAccess}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditingModuleAccess ? (
                <form onSubmit={handleSaveModuleAccess} className="space-y-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Select which product modules and submodules this company can access.
                  </p>
                  {productModules.map((mod) => {
                    const selectedSubs = moduleAccessForm[mod.id] ?? []
                    const isModuleChecked = selectedSubs.length > 0 ||
                      (mod.submodules.length === 0 && mod.id in moduleAccessForm)
                    const toggleModule = () => {
                      const next = { ...moduleAccessForm }
                      if (isModuleChecked) delete next[mod.id]
                      else next[mod.id] = mod.submodules.length === 0 ? [] : mod.submodules.map((s) => s.id)
                      setModuleAccessForm(next)
                    }
                    const toggleSub = (subId: string) => {
                      const next = { ...moduleAccessForm }
                      const list = [...(next[mod.id] ?? [])]
                      const idx = list.indexOf(subId)
                      if (idx === -1) list.push(subId)
                      else list.splice(idx, 1)
                      next[mod.id] = list
                      setModuleAccessForm(next)
                    }
                    const selectAllSubs = () => {
                      setModuleAccessForm((prev) => ({ ...prev, [mod.id]: mod.submodules.map((s) => s.id) }))
                    }
                    const clearSubs = () => {
                      setModuleAccessForm((prev) => ({ ...prev, [mod.id]: [] }))
                    }
                    return (
                      <div key={mod.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isModuleChecked}
                            onChange={toggleModule}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium text-gray-900">{mod.name}</span>
                          {mod.description && (
                            <span className="text-sm text-gray-500">— {mod.description}</span>
                          )}
                        </label>
                        {mod.submodules.length > 0 && (
                          <div className="ml-6 mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={selectAllSubs} className="text-xs text-blue-600 hover:text-blue-800">
                                Select all
                              </button>
                              <span className="text-gray-400">|</span>
                              <button type="button" onClick={clearSubs} className="text-xs text-gray-500 hover:text-gray-700">
                                Clear
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {mod.submodules.map((sub) => (
                                <label key={sub.id} className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedSubs.includes(sub.id)}
                                    onChange={() => toggleSub(sub.id)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">{sub.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={cancelEditModuleAccess}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingModuleAccess}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingModuleAccess ? 'Saving...' : 'Save Module Access'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2">
                  {Object.keys(company.module_access ?? {}).length === 0 ? (
                    <p className="text-sm text-gray-500">No modules assigned.</p>
                  ) : (
                    productModules.length === 0 ? (
                      <p className="text-sm text-gray-500">Loading...</p>
                    ) : (
                      <ul className="space-y-2">
                        {productModules
                          .filter((m) => m.id in (company.module_access ?? {}))
                          .map((m) => {
                            const subIds = company.module_access![m.id] ?? []
                            const subNames = m.submodules.filter((s) => subIds.includes(s.id)).map((s) => s.name)
                            const label = m.submodules.length === 0
                              ? m.name
                              : `${m.name}: ${subNames.length ? subNames.join(', ') : '—'}`
                            return (
                              <li key={m.id} className="text-sm text-gray-900">
                                <span className="font-medium">{m.name}</span>
                                {m.submodules.length > 0 && (
                                  <span className="text-gray-600"> — {subNames.length ? subNames.join(', ') : 'No submodules selected'}</span>
                                )}
                              </li>
                            )
                          })}
                      </ul>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Update Features */}
            {company.subscription && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Update Features</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Change licensed user count when you add more seats. New limit cannot be less than current users.
                </p>
                <form onSubmit={handleUpdateFeatures} className="space-y-4">
                  <div>
                    <label htmlFor="featuresMaxUsers" className="block text-sm font-medium text-gray-700 mb-1">
                      Licensed Users *
                    </label>
                    <input
                      id="featuresMaxUsers"
                      type="number"
                      min={Math.max(1, company.subscription.current_users ?? 0)}
                      max={10000}
                      value={featuresMaxUsers}
                      onChange={(e) => setFeaturesMaxUsers(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Number of users this company can create. Current: {company.subscription.current_users ?? 0} users.
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={savingFeatures || featuresMaxUsers === (company.subscription.user_limit ?? company.subscription.max_users)}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingFeatures ? 'Saving...' : 'Save Features'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Admin Info */}
            {company.primary_admin && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Primary Admin</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{company.primary_admin.full_name || company.primary_admin.username}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{company.primary_admin.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Username</label>
                    <p className="mt-1 text-sm text-gray-900">{company.primary_admin.username}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                {company.status === 'active' ? (
                  <button
                    onClick={handleSuspend}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Suspend Company
                  </button>
                ) : (
                  <button
                    onClick={handleActivate}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Activate Company
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
