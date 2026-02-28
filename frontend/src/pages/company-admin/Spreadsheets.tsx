import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { spreadsheetsAPI, Spreadsheet } from '../../api/spreadsheets'
import toast from 'react-hot-toast'

export default function Spreadsheets() {
  const { hasPermission } = useAuthStore()
  const navigate = useNavigate()
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    loadSpreadsheets()
  }, [])

  const loadSpreadsheets = async () => {
    try {
      setLoading(true)
      const data = await spreadsheetsAPI.list()
      setSpreadsheets(data || [])
    } catch (error: any) {
      setSpreadsheets([])
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
      toast.success('Spreadsheet created')
      navigate(`/company-admin/spreadsheet/${newSheet.id}`)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create spreadsheet')
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this spreadsheet?')) return
    
    try {
      await spreadsheetsAPI.delete(id)
      toast.success('Spreadsheet deleted')
      loadSpreadsheets()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete')
    }
  }

  const filteredSpreadsheets = spreadsheets.filter(sheet =>
    sheet.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Spreadsheets</h2>
          <p className="text-sm text-gray-500">{spreadsheets.length} spreadsheets</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow' : 'text-gray-500'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow' : 'text-gray-500'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          {hasPermission('create_spreadsheet') && (
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Spreadsheet
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search spreadsheets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Spreadsheets */}
      {filteredSpreadsheets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? 'No spreadsheets found' : 'No spreadsheets yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? 'Try adjusting your search.' : 'Create your first spreadsheet to get started.'}
          </p>
          {!searchTerm && hasPermission('create_spreadsheet') && (
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Spreadsheet
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpreadsheets.map((sheet) => (
            <div
              key={sheet.id}
              onClick={() => navigate(`/company-admin/spreadsheet/${sheet.id}`)}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                {hasPermission('delete_spreadsheet') && (
                  <button
                    onClick={(e) => handleDelete(sheet.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{sheet.name}</h3>
              <p className="text-sm text-gray-500 truncate">{sheet.description || 'No description'}</p>
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                <span>{sheet.row_count || 0} rows</span>
                <span>{sheet.column_count || 0} cols</span>
                {sheet.updated_at && (
                  <span className="ml-auto">{new Date(sheet.updated_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Size</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Modified</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSpreadsheets.map((sheet) => (
                <tr
                  key={sheet.id}
                  onClick={() => navigate(`/company-admin/spreadsheet/${sheet.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{sheet.name}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{sheet.description || 'No description'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {sheet.row_count || 0} × {sheet.column_count || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {sheet.updated_at ? new Date(sheet.updated_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {hasPermission('delete_spreadsheet') && (
                      <button
                        onClick={(e) => handleDelete(sheet.id, e)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
