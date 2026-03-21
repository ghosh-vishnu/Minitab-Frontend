import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { spreadsheetsAPI, Spreadsheet } from '../api/spreadsheets'
import { companiesAPI } from '../api/companies'
import ExcelImportDialog from '../components/ExcelImportDialog'
import CompanySuspendedScreen from '../components/CompanySuspendedScreen'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { BarChart2, Clock, Star, FolderOpen, Upload, Trash2 } from 'lucide-react'

/** Module ids matching backend PRODUCT_MODULES (for filtering by company.module_access) */
const DASHBOARD_MODULES = [
  { id: 'statistical_software', name: 'Excel® Statistical Software', desc: 'Analytics', icon: BarChart2 },
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
  const [contentTab, setContentTab] = useState<'recent' | 'favorites' | 'local'>('recent')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const handleFileSelect = (file: File) => {
    if (!file) return

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

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File size exceeds 50MB limit')
      return
    }

    setSelectedFile(file)
    setShowImportDialog(true)
  }

  const handleImport = async (_data: unknown, options: { selectedSheet?: string }) => {
    if (!selectedFile) return

    try {
      setShowImportDialog(false)
      const loadingToast = toast.loading('Creating spreadsheet and importing file...')

      const spreadsheetName = selectedFile.name.replace(/\.[^/.]+$/, '')
      const spreadsheet = await spreadsheetsAPI.create({
        name: spreadsheetName,
        row_count: 100,
        column_count: 26,
      })

      const response = await spreadsheetsAPI.importExcel(
        spreadsheet.id,
        selectedFile,
        options.selectedSheet
      )

      toast.dismiss(loadingToast)
      toast.success(`${response.message}\n${response.rows} rows, ${response.columns} columns imported`)

      if (response.validation?.warnings?.length > 0) {
        response.validation.warnings.forEach((warning: string) => {
          toast(warning, { duration: 5000, icon: '⚠️' })
        })
      }

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
    if (file) handleFileSelect(file)
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
    if (file) handleFileSelect(file)
  }

  const SheetCard = ({ sheet, onDelete, onToggleFavorite }: { sheet: Spreadsheet; onDelete: (id: string, e: React.MouseEvent) => void; onToggleFavorite: (id: string, e: React.MouseEvent) => void }) => (
    <div
      onClick={() => navigate(`/minitab/spreadsheet/${sheet.id}`)}
      className="group relative bg-white rounded-xl border border-slate-200/80 p-5 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer"
    >
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => onToggleFavorite(sheet.id, e)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Star
            className={`w-5 h-5 ${sheet.is_favorite ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`}
          />
        </button>
      </div>

      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
        <BarChart2 className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-semibold text-slate-900 mb-1 truncate pr-8">{sheet.name}</h3>
      <p className="text-sm text-slate-500 mb-4">
        {new Date(sheet.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/minitab/spreadsheet/${sheet.id}`)
          }}
          className="flex-1 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          Open
        </button>
        <button
          onClick={(e) => onDelete(sheet.id, e)}
          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  const tabs = [
    { id: 'recent' as const, label: 'Recently Used', icon: Clock },
    { id: 'favorites' as const, label: 'Favorites', icon: Star },
    { id: 'local' as const, label: 'Open Local File', icon: FolderOpen },
  ]

  const filteredModules = DASHBOARD_MODULES.filter((mod) => {
    if (!user?.company) return true
    const access = companyDetail?.effective_module_access ?? companyDetail?.module_access
    if (!access) return true
    return Object.prototype.hasOwnProperty.call(access, mod.id)
  })

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero / New Section */}
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Create New</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {filteredModules.map((mod) => {
              if (mod.id === 'statistical_software') {
                if (!hasPermission('access_statistical_software')) return null
                const Icon = mod.icon
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
                    className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-8 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 text-left"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{mod.name}</h3>
                      <p className="text-sm text-slate-500">{mod.desc}</p>
                    </div>
                  </button>
                )
              }
              return null
            })}
          </div>
        </section>

        {/* My Content */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">My Content</h2>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Side Navigation */}
            <div className="flex-shrink-0">
              <div className="inline-flex flex-col p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/60">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setContentTab(tab.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        contentTab === tab.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              {contentTab === 'recent' && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-5">Recently Used</h3>
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-600" />
                    </div>
                  ) : recentSheets.length === 0 ? (
                    <div className="text-center py-16 px-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                      <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">No recent spreadsheets</p>
                      <p className="text-sm text-slate-400 mt-1">Create a new one or open a local file to get started</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
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
                  <h3 className="text-lg font-semibold text-slate-900 mb-5">Favorite Files</h3>
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-600" />
                    </div>
                  ) : favoriteSheets.length === 0 ? (
                    <div className="text-center py-16 px-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                      <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">No favorites yet</p>
                      <p className="text-sm text-slate-400 mt-1">Click the star on any spreadsheet to add it here</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
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
                  <h3 className="text-lg font-semibold text-slate-900 mb-5">Open Local File</h3>
                  <div
                    className="rounded-2xl border-2 border-dashed border-slate-300 p-16 text-center bg-slate-50/30 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <label className="cursor-pointer block">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-6">
                        <Upload className="w-10 h-10 text-emerald-600" />
                      </div>
                      <p className="text-slate-900 font-semibold text-lg mb-1">Upload Excel or CSV</p>
                      <p className="text-sm text-slate-500 mb-6">Drag and drop or click to browse</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          document.getElementById('file-upload-input')?.click()
                        }}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
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
                  <p className="text-xs text-slate-400 mt-4">Supported: .xlsx, .xls, .csv · Max 50MB</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

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
