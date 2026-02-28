import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analysisAPI, Analysis } from '../../api/analysis'

const analysisTypeLabels: Record<string, { label: string; color: string }> = {
  summary_stats: { label: 'Summary Statistics', color: 'bg-blue-100 text-blue-700' },
  correlation: { label: 'Correlation', color: 'bg-purple-100 text-purple-700' },
  regression: { label: 'Regression', color: 'bg-green-100 text-green-700' },
  custom: { label: 'Custom Analysis', color: 'bg-orange-100 text-orange-700' },
}

export default function AnalysisList() {
  const navigate = useNavigate()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = async () => {
    try {
      setLoading(true)
      const data = await analysisAPI.list()
      setAnalyses(data || [])
    } catch (error: any) {
      // Silently handle errors - show empty state
      setAnalyses([])
    } finally {
      setLoading(false)
    }
  }

  const filteredAnalyses = analyses.filter(a =>
    a.spreadsheet_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.analysis_type.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analysis History</h2>
          <p className="text-sm text-gray-500">{analyses.length} analyses performed</p>
        </div>
        <button
          onClick={() => navigate('/company-admin/spreadsheets')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          New Analysis
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search analyses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Analyses */}
      {filteredAnalyses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? 'No analyses found' : 'No analyses yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? 'Try adjusting your search.' : 'Open a spreadsheet and run your first analysis.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => navigate('/company-admin/spreadsheets')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Spreadsheets
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Analysis</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Spreadsheet</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Columns</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAnalyses.map((analysis) => {
                const typeInfo = analysisTypeLabels[analysis.analysis_type] || { label: analysis.analysis_type, color: 'bg-gray-100 text-gray-700' }
                return (
                  <tr key={analysis.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{typeInfo.label}</p>
                          <p className="text-sm text-gray-500">by {analysis.user_username || 'Unknown'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/company-admin/spreadsheet/${analysis.spreadsheet}`)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        {analysis.spreadsheet_name || 'View Spreadsheet'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {analysis.selected_columns?.length || 0} columns
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedAnalysis(analysis)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View Results
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Analysis Results Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedAnalysis(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {analysisTypeLabels[selectedAnalysis.analysis_type]?.label || selectedAnalysis.analysis_type}
                </h3>
                <p className="text-sm text-gray-500">{selectedAnalysis.spreadsheet_name}</p>
              </div>
              <button onClick={() => setSelectedAnalysis(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 mb-1">Performed By</p>
                  <p className="font-medium">{selectedAnalysis.user_username}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 mb-1">Date</p>
                  <p className="font-medium">{new Date(selectedAnalysis.created_at).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-gray-500 mb-1">Columns Analyzed</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedAnalysis.selected_columns?.map((col, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        Column {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Results</h4>
                <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(selectedAnalysis.results, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
