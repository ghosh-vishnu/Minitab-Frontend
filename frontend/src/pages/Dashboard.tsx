import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { spreadsheetsAPI, Spreadsheet } from '../api/spreadsheets'
import { companiesAPI } from '../api/companies'
import ExcelImportDialog from '../components/ExcelImportDialog'
import CompanySuspendedScreen from '../components/CompanySuspendedScreen'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

/** Module ids matching backend PRODUCT_MODULES (for filtering by company.module_access) */
const DASHBOARD_MODULES = [
  { id: 'statistical_software', name: 'Excel® Statistical Software', desc: 'Analytics' },
  { id: 'brainstorm', name: 'Excel Brainstorm', desc: 'Brainstorm' },
  { id: 'data_center', name: 'Excel Data Center', desc: 'Data Prep' },
  { id: 'dashboards', name: 'Excel Dashboards', desc: 'Dashboard' },
  { id: 'workspace', name: 'Excel Workspace®', desc: 'Quality Project' },
] as const

const Dashboard = () => {
  const { user, hasPermission, companyDetail, setCompanyDetail } = useAuthStore()

  if (user?.company?.status === 'suspended') {
    return <CompanySuspendedScreen />
  }
  const [_spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([])
  const [recentSheets, setRecentSheets] = useState<Spreadsheet[]>([])
  const [favoriteSheets, setFavoriteSheets] = useState<Spreadsheet[]>([])
  const [loading, setLoading] = useState(true)
  const [contentTab, setContentTab] = useState<'recent' | 'favorites' | 'connect' | 'onedrive' | 'sharepoint' | 'googledrive' | 'local'>('recent')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch company detail (module_access) for company users so we only show allowed modules
  useEffect(() => {
    if (!user?.company?.id) return
    companiesAPI.getMyCompany()
      .then((company) => setCompanyDetail({
        id: company.id,
        name: company.name,
        module_access: company.module_access,
        effective_module_access: company.effective_module_access,
      }))
      .catch(() => setCompanyDetail(null))
  }, [user?.company?.id, setCompanyDetail])

  const loadAllData = async () => {
    try {
      setLoading(true)
      const [allData, recentData, favoriteData] = await Promise.all([
        spreadsheetsAPI.list(),
        spreadsheetsAPI.getRecent(),
        spreadsheetsAPI.getFavorites(),
      ])
      setSpreadsheets(Array.isArray(allData) ? allData : [])
      setRecentSheets(Array.isArray(recentData) ? recentData : [])
      setFavoriteSheets(Array.isArray(favoriteData) ? favoriteData : [])
    } catch (error: any) {
      toast.error('Failed to load data')
      console.error('Error loading data:', error)
      setSpreadsheets([])
      setRecentSheets([])
      setFavoriteSheets([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSpreadsheet = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this spreadsheet?')) {
      return
    }

    try {
      await spreadsheetsAPI.delete(id)
      // Remove from local state immediately
      setSpreadsheets(prev => prev.filter(sheet => sheet.id !== id))
      setRecentSheets(prev => prev.filter(sheet => sheet.id !== id))
      setFavoriteSheets(prev => prev.filter(sheet => sheet.id !== id))
      toast.success('Spreadsheet deleted successfully')
    } catch (error: any) {
      toast.error('Failed to delete spreadsheet')
    }
  }

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await spreadsheetsAPI.toggleFavorite(id)
      // Update all lists
      setSpreadsheets(prev => 
        prev.map(s => s.id === id ? { ...s, is_favorite: updated.is_favorite } : s)
      )
      setRecentSheets(prev =>
        prev.map(s => s.id === id ? { ...s, is_favorite: updated.is_favorite } : s)
      )
      setFavoriteSheets(prev => 
        updated.is_favorite
          ? [updated, ...prev]
          : prev.filter(s => s.id !== id)
      )
      toast.success(updated.is_favorite ? 'Added to favorites' : 'Removed from favorites')
    } catch (error: any) {
      toast.error('Failed to update favorite status')
    }
  }

  // Handle file selection - show import dialog
  const handleFileSelect = (file: File) => {
    if (!file) return

    // Validate file type
    const fileName = file.name.toLowerCase()
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]
    const isValid = validTypes.includes(file.type) || 
                    fileName.endsWith('.xlsx') || 
                    fileName.endsWith('.xls') || 
                    fileName.endsWith('.csv')
    
    if (!isValid) {
      toast.error('Please select a valid Excel or CSV file')
      return
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File size exceeds 50MB limit')
      return
    }

    setSelectedFile(file)
    setShowImportDialog(true)
  }

  // Handle import from dialog
  const handleImport = async (_data: unknown, options: { selectedSheet?: string }) => {
    if (!selectedFile) return

    try {
      setShowImportDialog(false)
      const loadingToast = toast.loading('Creating spreadsheet and importing file...')

      // Create new spreadsheet with file name
      const spreadsheetName = selectedFile.name.replace(/\.[^/.]+$/, '')
      const spreadsheet = await spreadsheetsAPI.create({
        name: spreadsheetName,
        row_count: 100,
        column_count: 26,
      })

      // Upload file to backend
      const response = await spreadsheetsAPI.importExcel(
        spreadsheet.id, 
        selectedFile,
        options.selectedSheet
      )
      
      toast.dismiss(loadingToast)
      toast.success(`${response.message}\n${response.rows} rows, ${response.columns} columns imported`)
      
      // Show validation warnings if any
      if (response.validation?.warnings?.length > 0) {
        response.validation.warnings.forEach((warning: string) => {
          toast(warning, { duration: 5000, icon: '⚠️' })
        })
      }

      // Navigate to spreadsheet
      navigate(`/minitab/spreadsheet/${spreadsheet.id}`)
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error(error.response?.data?.error || 'Failed to import file')
    } finally {
      setSelectedFile(null)
    }
  }

  const handleImportCancel = () => {
    setShowImportDialog(false)
    setSelectedFile(null)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    // Reset input to allow same file selection
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const SheetCard = ({ sheet, onDelete, onToggleFavorite }: { sheet: Spreadsheet; onDelete: (id: string, e: React.MouseEvent) => void; onToggleFavorite: (id: string, e: React.MouseEvent) => void }) => (
    <div
      onClick={() => navigate(`/minitab/spreadsheet/${sheet.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        <button
          onClick={(e) => onToggleFavorite(sheet.id, e)}
          className="p-2 rounded hover:bg-gray-100 transition-colors"
        >
          <svg
            className={`w-5 h-5 transition-colors ${
              sheet.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 truncate">{sheet.name}</h3>
      <p className="text-sm text-gray-600 mb-3">
        {new Date(sheet.updated_at).toLocaleDateString()}
      </p>
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/minitab/spreadsheet/${sheet.id}`)
          }}
          className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          Open
        </button>
        <button
          onClick={(e) => onDelete(sheet.id, e)}
          className="px-3 py-1 bg-red-100 text-red-600 text-sm rounded hover:bg-red-200 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* New Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">New</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {DASHBOARD_MODULES.filter((mod) => {
              // No company = show all; otherwise use effective (per-user) or company module access
              if (!user?.company) return true
              const access = companyDetail?.effective_module_access ?? companyDetail?.module_access
              if (!access) return true // still loading or no restriction
              return Object.prototype.hasOwnProperty.call(access, mod.id)
            }).map((mod) => {
              const isStatistical = mod.id === 'statistical_software'
              if (isStatistical) {
                if (!hasPermission('access_statistical_software')) return null
                return (
                  <button
                    key={mod.id}
                    onClick={async () => {
                      try {
                        const spreadsheet = await spreadsheetsAPI.create({
                          name: 'Untitled',
                          row_count: 100,
                          column_count: 26,
                        })
                        if (!spreadsheet?.id) {
                          toast.error('Failed to create spreadsheet: Missing ID in response')
                          return
                        }
                        navigate(`/minitab/spreadsheet/${spreadsheet.id}`)
                      } catch (error: any) {
                        const err = error.response?.data?.error || error.response?.data?.message || 'Failed to create spreadsheet'
                        toast.error(err)
                      }
                    }}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow text-left group"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{mod.name}</h3>
                    <p className="text-sm text-gray-600">{mod.desc}</p>
                  </button>
                )
              }
              return (
                <div key={mod.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                    mod.id === 'brainstorm' ? 'bg-purple-100' :
                    mod.id === 'data_center' ? 'bg-green-100' :
                    mod.id === 'dashboards' ? 'bg-orange-100' : 'bg-yellow-100'
                  }`}>
                    <svg className={`w-6 h-6 ${
                      mod.id === 'brainstorm' ? 'text-purple-600' :
                      mod.id === 'data_center' ? 'text-green-600' :
                      mod.id === 'dashboards' ? 'text-orange-600' : 'text-yellow-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{mod.name}</h3>
                  <p className="text-sm text-gray-600">{mod.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* My Content Section */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">My Content</h2>
          <div className="flex gap-6">
            {/* Left Sidebar Navigation */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-gray-50 rounded-lg p-2 space-y-1">
                <button
                  onClick={() => setContentTab('recent')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    contentTab === 'recent'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Recent</span>
                </button>

                <button
                  onClick={() => setContentTab('favorites')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    contentTab === 'favorites'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span>Favorites</span>
                </button>

                <button
                  onClick={() => setContentTab('local')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    contentTab === 'local'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Open Local File</span>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1">
              {contentTab === 'recent' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Used</h3>
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                  ) : recentSheets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No recent spreadsheets</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recentSheets.map(sheet => (
                        <SheetCard
                          key={sheet.id}
                          sheet={sheet}
                          onDelete={handleDeleteSpreadsheet}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {contentTab === 'favorites' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Favorite Files</h3>
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                  ) : favoriteSheets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No favorite spreadsheets</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {favoriteSheets.map(sheet => (
                        <SheetCard
                          key={sheet.id}
                          sheet={sheet}
                          onDelete={handleDeleteSpreadsheet}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {contentTab === 'local' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Open Local File</h3>
                  <div 
                    className="border-2 border-dashed border-blue-400 rounded-lg p-12 text-center hover:bg-blue-50 transition-colors cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <label className="cursor-pointer block">
                      <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-900 font-semibold mb-1 text-lg">Upload Excel or CSV File</p>
                      <p className="text-sm text-gray-600 mb-2">Click to browse or drag and drop your file here</p>
                      <p className="text-xs text-gray-500 mb-4">Supported formats: .xlsx, .xls, .csv (Max 50MB)</p>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          document.getElementById('file-upload-input')?.click()
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Select File
                      </button>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileInputChange}
                        className="hidden"
                        id="file-upload-input"
                      />
                    </label>
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">How to use:</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Click "Select File" or drag and drop your Excel/CSV file</li>
                      <li>• The file will be automatically imported into a new spreadsheet</li>
                      <li>• You can then edit, analyze, and save your data</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      {showImportDialog && selectedFile && (
        <ExcelImportDialog
          file={selectedFile}
          onLoad={handleImport}
          onCancel={handleImportCancel}
        />
      )}
    </div>
  )
}

export default Dashboard
