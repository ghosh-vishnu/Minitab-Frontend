import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { spreadsheetsAPI, Spreadsheet } from '../api/spreadsheets'
import toast from 'react-hot-toast'

export default function SpreadsheetsList() {
  const { user, hasPermission } = useAuthStore()
  const navigate = useNavigate()
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadSpreadsheets()
  }, [])

  const loadSpreadsheets = async () => {
    try {
      setLoading(true)
      const data = await spreadsheetsAPI.list()
      setSpreadsheets(data)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load spreadsheets')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = async () => {
    try {
      const newSheet = await spreadsheetsAPI.create({
        name: `Spreadsheet ${spreadsheets.length + 1}`,
        description: ''
      })
      toast.success('Spreadsheet created successfully')
      navigate(`/minitab/spreadsheet/${newSheet.id}`)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create spreadsheet')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this spreadsheet?')) return
    
    try {
      await spreadsheetsAPI.delete(id)
      toast.success('Spreadsheet deleted successfully')
      loadSpreadsheets()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete spreadsheet')
    }
  }

  const filteredSpreadsheets = spreadsheets.filter(sheet =>
    sheet.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Spreadsheets</h1>
              <p className="mt-1 text-sm text-gray-600">
                {user?.company?.name || 'Manage your data'}
              </p>
            </div>
            {hasPermission('create_spreadsheet') && (
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Spreadsheet
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search spreadsheets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Empty State */}
        {filteredSpreadsheets.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {searchTerm ? 'No spreadsheets found' : 'No spreadsheets yet'}
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {searchTerm 
                ? 'Try a different search term' 
                : 'Create your first spreadsheet to start analyzing data'}
            </p>
            {hasPermission('create_spreadsheet') && !searchTerm && (
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Spreadsheet
              </button>
            )}
          </div>
        )}

        {/* Spreadsheets Grid */}
        {filteredSpreadsheets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpreadsheets.map((sheet) => (
              <div
                key={sheet.id}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-all duration-200 overflow-hidden group"
              >
                <Link
                  to={`/minitab/spreadsheet/${sheet.id}`}
                  className="block p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    </div>
                    {hasPermission('delete_spreadsheet') && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          handleDelete(sheet.id)
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete spreadsheet"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {sheet.name}
                  </h3>
                  
                  {sheet.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {sheet.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                      {sheet.row_count || 0} rows
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(sheet.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
