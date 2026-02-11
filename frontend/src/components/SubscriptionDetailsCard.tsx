/**
 * SubscriptionDetailsCard Component
 * Displays detailed information about the current subscription
 */

import React from 'react'
import { 
  Calendar, 
  CreditCard, 
  Users, 
  Database, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp
} from 'lucide-react'
import type { Subscription } from '../types/subscription'

interface SubscriptionDetailsCardProps {
  subscription: Subscription
  onCancel?: () => void
  onRenew?: () => void
  onUpgrade?: () => void
}

const SubscriptionDetailsCard: React.FC<SubscriptionDetailsCardProps> = ({
  subscription,
  onCancel,
  onRenew,
  onUpgrade,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatStorageLimit = (mb: number | null | undefined) => {
    if (!mb || mb === -1) return 'Unlimited'
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
    return `${mb} MB`
  }

  const getStatusIcon = () => {
    switch (subscription.status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'trial':
        return <Clock className="w-5 h-5 text-blue-600" />
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-orange-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusBadge = () => {
    const baseClasses = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold'
    
    switch (subscription.status) {
      case 'active':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            {getStatusIcon()}
            Active
          </span>
        )
      case 'trial':
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            {getStatusIcon()}
            Trial
          </span>
        )
      case 'expired':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            {getStatusIcon()}
            Expired
          </span>
        )
      case 'cancelled':
        return (
          <span className={`${baseClasses} bg-orange-100 text-orange-800`}>
            {getStatusIcon()}
            Cancelled
          </span>
        )
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            {getStatusIcon()}
            {subscription.status}
          </span>
        )
    }
  }

  const getDaysRemainingColor = () => {
    const days = subscription.days_remaining || 0
    if (days <= 7) return 'text-red-600'
    if (days <= 30) return 'text-orange-600'
    return 'text-green-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {subscription.plan_name || 'Unknown Plan'}
            </h2>
            <p className="text-blue-100 text-sm">Current Subscription</p>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Days Remaining Alert */}
        {subscription.status === 'active' && subscription.days_remaining !== undefined && (
          <div className={`mb-6 p-4 rounded-lg ${
            subscription.days_remaining <= 7 
              ? 'bg-red-50 border border-red-200'
              : subscription.days_remaining <= 30
              ? 'bg-orange-50 border border-orange-200'
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-2">
              <Calendar className={`w-5 h-5 ${getDaysRemainingColor()}`} />
              <span className={`font-semibold ${getDaysRemainingColor()}`}>
                {subscription.days_remaining} days remaining
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Your subscription will expire on {formatDate(subscription.end_date)}
            </p>
          </div>
        )}

        {/* Subscription Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Start Date */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="text-base font-semibold text-gray-900">
                {formatDate(subscription.start_date)}
              </p>
            </div>
          </div>

          {/* End Date */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">End Date</p>
              <p className="text-base font-semibold text-gray-900">
                {formatDate(subscription.end_date)}
              </p>
            </div>
          </div>

          {/* Amount Paid */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Amount Paid</p>
              <p className="text-base font-semibold text-gray-900">
                {subscription.currency} {parseFloat(subscription.amount_paid).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Auto Renew */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Auto Renew</p>
              <p className="text-base font-semibold text-gray-900">
                {subscription.auto_renew ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>

        {/* Usage Limits */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Limits</h3>
          <div className="space-y-4">
            {/* Max Users */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-700">Maximum Users</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {subscription.effective_limits?.max_users === -1 
                  ? 'Unlimited' 
                  : subscription.effective_limits?.max_users || subscription.max_users || 'N/A'}
              </span>
            </div>

            {/* Max Spreadsheets */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-700">Maximum Spreadsheets</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {subscription.effective_limits?.max_spreadsheets === -1 
                  ? 'Unlimited' 
                  : subscription.effective_limits?.max_spreadsheets || subscription.max_spreadsheets || 'N/A'}
              </span>
            </div>

            {/* Max Storage */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-700">Storage Limit</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatStorageLimit(
                  subscription.effective_limits?.max_storage_mb || subscription.max_storage_mb
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
          {onUpgrade && subscription.status === 'active' && (
            <button
              onClick={onUpgrade}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-semibold text-sm"
            >
              Upgrade Plan
            </button>
          )}
          
          {onRenew && (subscription.status === 'expired' || subscription.status === 'cancelled') && (
            <button
              onClick={onRenew}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm"
            >
              Renew Subscription
            </button>
          )}
          
          {onCancel && subscription.status === 'active' && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-semibold text-sm"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubscriptionDetailsCard
