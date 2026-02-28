import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { companiesAPI, CompanyStats } from '../../api/companies'
import { subscriptionsAPI, Subscription } from '../../api/subscriptions'

export default function CompanyProfile() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    // Auto-refresh from License Server on mount
    refreshAndLoad()
  }, [])

  const refreshAndLoad = async () => {
    try {
      setLoading(true)
      // First sync with License Server
      await subscriptionsAPI.refreshSubscription().catch(() => null)
      // Then load all data
      const [statsRes, subRes] = await Promise.all([
        companiesAPI.getCompanyStats().catch(() => null),
        subscriptionsAPI.getActiveSubscription().catch(() => null),
      ])
      setStats(statsRes)
      setSubscription(subRes)
    } catch (err) {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshAndLoad()
    setRefreshing(false)
  }

  const company = user?.company

  // Calculate days remaining from subscription end_date
  const getDaysRemaining = () => {
    const expiryDate = subscription?.end_date || stats?.subscription_end_date
    if (!expiryDate) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(23, 59, 59, 999)
    const diff = expiry.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const daysRemaining = getDaysRemaining()
  const subscriptionStatus = subscription?.status || stats?.subscription_status || 'N/A'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Company Profile</h2>
          <p className="text-sm text-gray-500">View and manage company information</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg 
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Company Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-bold text-white">
              {(company?.name || 'C').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900">{company?.name || 'Company Name'}</h3>
            <p className="text-gray-500 mt-1">Code: <span className="font-mono">{company?.company_code || '—'}</span></p>
            <div className="flex items-center gap-4 mt-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                company?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {company?.status || 'Unknown'}
              </span>
              {company?.is_active && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Active
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats?.total_users ?? 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13-3.757a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          label="User Limit"
          value={stats?.user_limit ?? 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          label="Active Users"
          value={stats?.active_users ?? 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="purple"
        />
        <StatCard
          label="Subscription Status"
          value={subscriptionStatus}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color="orange"
        />
      </div>

      {/* Usage Summary */}
      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">User Capacity</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Users</span>
              <span className="font-medium">{stats.total_users} / {stats.user_limit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  stats.total_users >= stats.user_limit ? 'bg-red-500' : 
                  stats.total_users >= stats.user_limit * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((stats.total_users / stats.user_limit) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {stats.user_limit - stats.total_users > 0 
                ? `${stats.user_limit - stats.total_users} slots remaining`
                : 'User limit reached'}
            </p>
          </div>
        </div>
      )}

      {/* Subscription Info */}
      {subscription && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Subscription Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Plan</p>
              <p className="font-semibold text-gray-900">{subscription.plan_name || 'Standard'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {subscription.status}
              </span>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Start Date</p>
              <p className="font-medium">{new Date(subscription.start_date).toLocaleDateString()}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">End Date</p>
              <p className="font-medium">{new Date(subscription.end_date).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* License Information */}
      {(stats || subscription) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">License Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500">User Slots</span>
              <span className="font-medium">{stats?.user_limit || '—'}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500">Days Remaining</span>
              <span className={`font-medium ${
                daysRemaining !== null && daysRemaining <= 7 ? 'text-orange-600' :
                daysRemaining !== null && daysRemaining < 0 ? 'text-red-600' : ''
              }`}>
                {daysRemaining !== null 
                  ? daysRemaining <= 0 
                    ? (daysRemaining < 0 ? 'Expired' : 'Expires Today')
                    : `${daysRemaining} days`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }: { 
  label: string
  value: number | string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' 
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}
