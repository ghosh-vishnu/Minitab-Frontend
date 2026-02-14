import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { spreadsheetsAPI, Spreadsheet } from '../api/spreadsheets'
import { analysisAPI, Analysis as AnalysisType } from '../api/analysis'
import { Link } from 'react-router-dom'
import CompanySuspendedScreen from '../components/CompanySuspendedScreen'

export default function UserDashboard() {
  const { user, hasPermission } = useAuthStore()

  if (user?.company?.status === 'suspended') {
    return <CompanySuspendedScreen />
  }
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([])
  const [analyses, setAnalyses] = useState<AnalysisType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const promises = []
      
      // Load spreadsheets if user has permission
      if (hasPermission('view_spreadsheet')) {
        promises.push(
          spreadsheetsAPI.list().then((data) => ({ type: 'spreadsheets', data }))
        )
      }

      // Load analyses if user has permission
      if (hasPermission('view_analysis')) {
        promises.push(
          analysisAPI.list()
            .then((data) => ({ type: 'analyses', data }))
            .catch(() => ({ type: 'analyses', data: [] }))
        )
      }

      const results = await Promise.all(promises)
      
      results.forEach((result) => {
        if (result.type === 'spreadsheets') {
          setSpreadsheets(result.data as Spreadsheet[])
        } else if (result.type === 'analyses') {
          setAnalyses(result.data as AnalysisType[])
        }
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Welcome back, {user?.full_name || user?.username}
            </p>
            {user?.company && (
              <p className="text-sm text-gray-500">
                Organization: <span className="font-medium">{user.company.name}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {hasPermission('add_spreadsheet') && (
              <Link
                to="/spreadsheets/new"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-blue-600"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">New Spreadsheet</h3>
                    <p className="text-sm text-gray-600">Create a new sheet</p>
                  </div>
                </div>
              </Link>
            )}

            {hasPermission('view_spreadsheet') && (
              <Link
                to="/spreadsheets"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-green-600"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">My Spreadsheets</h3>
                    <p className="text-sm text-gray-600">View all sheets</p>
                  </div>
                </div>
              </Link>
            )}

            {hasPermission('view_analysis') && (
              <Link
                to="/analysis"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-purple-600"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Analysis</h3>
                    <p className="text-sm text-gray-600">Run analyses</p>
                  </div>
                </div>
              </Link>
            )}

            {hasPermission('view_chart') && (
              <Link
                to="/charts"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-yellow-600"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Charts</h3>
                    <p className="text-sm text-gray-600">View charts</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Recent Spreadsheets */}
        {hasPermission('view_spreadsheet') && spreadsheets.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Spreadsheets</h2>
              <Link to="/spreadsheets" className="text-sm text-blue-600 hover:text-blue-800">
                View all →
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="divide-y divide-gray-200">
                {spreadsheets.slice(0, 5).map((sheet) => (
                  <Link
                    key={sheet.id}
                    to={`/spreadsheets/${sheet.id}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{sheet.name}</h3>
                          <p className="text-sm text-gray-500">
                            Updated {new Date(sheet.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {sheet.row_count || 0} rows
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Analyses */}
        {hasPermission('view_analysis') && analyses.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Analyses</h2>
              <Link to="/analysis" className="text-sm text-blue-600 hover:text-blue-800">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyses.slice(0, 6).map((analysis) => (
                <div
                  key={analysis.id}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900">Analysis #{analysis.analysis_type}</h3>
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                      {analysis.analysis_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Spreadsheet: {analysis.spreadsheet_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(analysis.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {spreadsheets.length === 0 && analyses.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Started</h3>
            <p className="text-gray-600 mb-6">
              You don't have any spreadsheets yet. Create one to get started!
            </p>
            {hasPermission('add_spreadsheet') && (
              <Link
                to="/spreadsheets/new"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Spreadsheet
              </Link>
            )}
          </div>
        )}

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Name</span>
              <span className="text-sm font-medium text-gray-900">
                {user?.full_name || `${user?.first_name} ${user?.last_name}`.trim() || user?.username}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Email</span>
              <span className="text-sm font-medium text-gray-900">{user?.email}</span>
            </div>
            {user?.company && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Company</span>
                <span className="text-sm font-medium text-gray-900">{user.company.name}</span>
              </div>
            )}
            {user?.roles && user.roles.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Roles</span>
                <div className="flex gap-1">
                  {user.roles.map(role => (
                    <span
                      key={role.id}
                      className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                    >
                      {role.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link
            to="/profile"
            className="mt-4 block w-full text-center py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
