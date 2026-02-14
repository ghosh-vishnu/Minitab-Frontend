/**
 * Minitab-like Layout Component
 * Mimics Minitab Statistical Software interface
 */

import { Outlet, Link, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import CompanySuspendedScreen from './CompanySuspendedScreen'
import toast from 'react-hot-toast'
import { useState, useEffect, useRef } from 'react'
import GraphBuilder from './GraphBuilder'
import { spreadsheetsAPI, Cell, Spreadsheet } from '../api/spreadsheets'
import { ModalManager } from './ModalManager'
import { ChartsPanel } from './charts/ChartsPanel'
import { useModal } from '../context/ModalContext'
import { calculateIChart } from '../utils/chartCalculations'
import { CapabilityResult } from '../utils/capabilityNormal'
import { ProcessCapabilityReport } from './stat/ProcessCapabilityReport'

// Worksheet Charts Navigator Component
interface WorksheetChartsNavigatorProps {
  charts: Array<{
    id: string
    columnId: string
    columnName: string
    values: number[]
    worksheetId: string | number
    worksheetName: string
    createdAt: number
    chartTitle: string
    isRange: boolean
    firstColumn: string
    lastColumn: string
    allCharts: Array<{ columnId: string; columnName: string; values: number[] }>
  }>
  selectedChartId: string | null
  onChartSelect: (chartId: string) => void
  onViewAllCharts?: (worksheetId: string | number, charts: Array<WorksheetChartsNavigatorProps['charts'][0]>) => void
  onDeleteChart?: (chartId: string) => void
  onRenameChart?: (chartId: string, newTitle: string) => void
}

const WorksheetChartsNavigator: React.FC<WorksheetChartsNavigatorProps> = ({
  charts,
  selectedChartId,
  onChartSelect,
  onViewAllCharts: _onViewAllCharts,
  onDeleteChart,
  onRenameChart,
}) => {
  // Group charts by worksheet
  const chartsByWorksheet = new Map<string | number, typeof charts>()
  charts.forEach((chart) => {
    // Ensure worksheetId is valid
    const wsId = chart.worksheetId || '1'
    if (!chartsByWorksheet.has(wsId)) {
      chartsByWorksheet.set(wsId, [])
    }
    chartsByWorksheet.get(wsId)!.push(chart)
  })

  // Track expanded state for each worksheet
  const [expandedWorksheets, setExpandedWorksheets] = useState<Set<string | number>>(
    new Set(Array.from(chartsByWorksheet.keys()))
  )

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    chartId: string
    x: number
    y: number
  } | null>(null)
  
  // Rename state
  const [renamingChart, setRenamingChart] = useState<{
    chartId: string
    currentTitle: string
  } | null>(null)

  const toggleWorksheet = (wsId: string | number) => {
    setExpandedWorksheets((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(wsId)) {
        newSet.delete(wsId)
      } else {
        newSet.add(wsId)
      }
      return newSet
    })
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null)
    }
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  if (charts.length === 0) {
    return null
  }

  return (
    <>
      {/* Context Menu - Minitab Style */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu(null)
            }}
          />
          <div
            className="fixed bg-white border border-gray-300 rounded shadow-lg z-50 py-1 min-w-[180px]"
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                const chart = charts.find(c => c.id === contextMenu.chartId)
                if (chart && onRenameChart) {
                  setRenamingChart({
                    chartId: contextMenu.chartId,
                    currentTitle: chart.chartTitle || ''
                  })
                }
                setContextMenu(null)
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200"
            >
              Rename
            </button>
            <button
              onClick={() => {
                if (onDeleteChart) {
                  onDeleteChart(contextMenu.chartId)
                }
                setContextMenu(null)
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </>
      )}

      {/* Rename Modal */}
      {renamingChart && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-30"
            onClick={() => setRenamingChart(null)}
          />
          <div
            className="fixed bg-white border border-gray-300 rounded shadow-lg z-50 p-4 min-w-[300px]"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Rename Chart</h3>
            <input
              type="text"
              value={renamingChart.currentTitle}
              onChange={(e) => setRenamingChart({
                ...renamingChart,
                currentTitle: e.target.value
              })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (onRenameChart && renamingChart.currentTitle.trim()) {
                    onRenameChart(renamingChart.chartId, renamingChart.currentTitle.trim())
                    setRenamingChart(null)
                  }
                } else if (e.key === 'Escape') {
                  setRenamingChart(null)
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenamingChart(null)}
                className="px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onRenameChart && renamingChart.currentTitle.trim()) {
                    onRenameChart(renamingChart.chartId, renamingChart.currentTitle.trim())
                    setRenamingChart(null)
                  }
                }}
                className="px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                OK
              </button>
            </div>
          </div>
        </>
      )}

      {Array.from(chartsByWorksheet.entries()).map(([wsId, wsCharts]) => {
        // Get worksheet name from first chart, with proper fallback
        let worksheetName = wsCharts[0]?.worksheetName
        // Clean up undefined or invalid names
        if (!worksheetName || 
            worksheetName === 'undefined' || 
            worksheetName === 'Worksheet undefined' ||
            worksheetName.trim() === '') {
          worksheetName = `Worksheet ${wsId === '1' ? '1' : wsId}`
        }
        const isExpanded = expandedWorksheets.has(wsId)
        
        // Sort charts by creation time (newest first)
        const sortedCharts = [...wsCharts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        
        return (
          <div key={String(wsId)} className="mb-1">
            {/* Worksheet Header - Collapsible (Minitab Style) */}
            <button
              onClick={() => toggleWorksheet(wsId)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 text-gray-600 ${isExpanded ? '' : '-rotate-90'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="text-sm">{worksheetName}</span>
            </button>

            {/* Charts List - Shown when expanded (Minitab Style) */}
            {isExpanded && (
              <div className="ml-6 space-y-0">
                {sortedCharts.length > 0 ? (
                  sortedCharts.map((chart) => (
                    <div key={chart.id} className="relative">
                      <button
                        onClick={() => onChartSelect(chart.id)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setContextMenu({
                            chartId: chart.id,
                            x: e.clientX,
                            y: e.clientY,
                          })
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedChartId === chart.id
                            ? 'bg-blue-50 text-blue-900 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {chart.chartTitle}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-400 italic">
                    No charts available
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

// Stat Menu Structure
const STAT_MENU_ITEMS = [
  {
    label: 'Basic Statistics',
    submenu: ['Display Descriptive Statistics...', 'Store Descriptive Statistics...', 'Correlation...', 'Covariance...'],
  },
  {
    label: 'Regression',
    submenu: ['Regression...', 'Logistic Regression...', 'Poisson Regression...', 'Nominal Logistic Regression...', 'Ordinal Logistic Regression...'],
  },
  {
    label: 'ANOVA',
    submenu: ['One-Way...', 'Two-Way...', 'General Linear Model...', 'Main Effects Plot...'],
  },
  {
    label: 'DOE',
    submenu: ['Factorial...', 'Response Surface...', 'Mixture...', 'Taguchi...'],
  },
  {
    label: 'Control Charts',
    submenu: [
      { label: 'Box-Cox Transformation...' },
      {
        label: 'Variables Charts for Subgroups',
        submenu: [
          'Xbar-R...',
          'Xbar-S...',
          'I-MR/S (Between/Within)...',
          'Zone...',
        ],
      },
      {
        label: 'Variables Charts for Individuals',
        submenu: [
        'I-MR...' ,
          'Z-MR...',
          'Individuals',
          'Moving Range...',
        ],
      },
      {
        label: 'Attributes Charts',
        submenu: [
          'P Chart Diagnostic...',
          'P...',
          'Laney P...',
          'NP...',
          'U Chart Diagnostic...',
          'U...',
          'Laney U...',
          'C...',
        ],
      },
      {
        label: 'Time-Weighted Charts',
        submenu: [
          'Moving Average...',
          'EWMA...',
          'CUSUM...',
        ],
      },
      {
        label: 'Multivariate Charts',
        submenu: [
          'T²-Generalized Variance...',
          'T²...',
          'Generalized Variance...',
          'Multivariate EWMA...',
        ],
      },
      {
        label: 'Rare Event Charts',
        submenu: [
          'G...',
          'T...',
        ],
      },
    ],
  },
  {
    label: 'Quality Tools',
    submenu: [
      'Pareto Chart...',
      'Cause-and-Effect...',
      'Measurement System Analysis...',
      'Run Chart...',
      'Individual Distribution Identification...',
      'Johnson Transformation...',
      {
        label: 'Capability Analysis',
        submenu: [
          'Normal...',
          'Between/Within...',
          'Nonnormal...',
          'Nonparametric...',
          'Automated...',
        ],
      },
      {
        label: 'Capability Sixpack',
        submenu: [
          'Normal...',
          'Between/Within...',
          'Nonnormal...',
          'Nonparametric...',
          'Automated...',
        ],
      },
      'Tolerance Intervals (Normal Distribution)...',
      'Tolerance Intervals (Nonnormal Distribution)...',
      'Gage Study',
      'Create Attribute Agreement Analysis Worksheet...',
      'Attribute Agreement Analysis...',
      'Acceptance Sampling by Attributes...',
      {
        label: 'Acceptance Sampling by Variables',
        submenu: [
          'Normal...',
          'Binomial...',
          'Poisson...',
        ],
      },
      'Multi-Vari Chart...',
      'Variability Chart...',
      'Symmetry Plot...',
    ],
  },
  {
    label: 'Reliability/Survival',
    submenu: ['Distribution Analysis...', 'Life Data (Right Censoring)...', 'Parametric Survival Regression...'],
  },
  {
    label: 'Multivariate',
    submenu: ['Principal Components Analysis...', 'Factor Analysis...', 'Cluster Observations...', 'Discriminant Analysis...'],
  },
  {
    label: 'Time Series',
    submenu: ['Trend Analysis...', 'Decomposition...', 'Moving Average...', 'Exponential Smoothing...'],
  },
  {
    label: 'Tables',
    submenu: ['Tally...', 'Cross Tabulation and Chi-Square...'],
  },
  {
    label: 'Nonparametrics',
    submenu: ['One-Sample Sign...', 'One-Sample Wilcoxon...', 'Kruskal-Wallis...'],
  },
  {
    label: 'Equivalence Tests',
    submenu: ['One-Sample...', 'Two-Sample...', 'Paired...'],
  },
  {
    label: 'Power and Sample Size',
    submenu: ['Sample Size for Estimation...', 'Sample Size for Hypothesis Tests...', 'Power Curve...'],
  },
]

const MinitabLayout = () => {
  const { user } = useAuthStore()
  const { id: spreadsheetId } = useParams<{ id?: string }>()
  const { openModal } = useModal()
  const [cells, setCells] = useState<Cell[]>([])
  const [spreadsheet, setSpreadsheet] = useState<Spreadsheet | null>(null)
  const [showNavigator, setShowNavigator] = useState(true)
  const [showNavigatorDropdown, setShowNavigatorDropdown] = useState(false)
  const [groupByWorksheet, setGroupByWorksheet] = useState(true)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('oldest')
  const [showDataMenu, setShowDataMenu] = useState(false)
  const [showStatMenu, setShowStatMenu] = useState(false)
  const [showGraphMenu, setShowGraphMenu] = useState(false)
  const [activeStatSubmenu, setActiveStatSubmenu] = useState<string | null>(null)
  const [showGraphBuilder, setShowGraphBuilder] = useState(false)
  // Updated chart structure to include worksheet information
  interface SavedChart {
    id: string // Unique chart ID (for navigation entry)
    columnId: string
    columnName: string
    values: number[]
    worksheetId: string | number
    worksheetName: string
    createdAt: number // Timestamp for sorting
    chartTitle: string // Navigation title: "I Chart of C1" or "I Chart of C1-C14"
    isRange: boolean // true if this entry represents a range
    firstColumn: string // First column in selection
    lastColumn: string // Last column in selection
    allCharts: Array<{ 
      columnId: string
      columnName: string
      values: number[]
      scaleConfig?: {
        xScaleType: 'index' | 'stamp'
        stampColumn?: string
        axesConfig?: any
      }
      labelsConfig?: {
        title?: string
        subtitle1?: string
        subtitle2?: string
        footnote1?: string
        footnote2?: string
      }
    }> // All charts in this entry with individual configs
    scaleConfig?: { 
      xScaleType: 'index' | 'stamp'
      stampColumn?: string
      axesConfig?: {
        xAxisLabel?: string
        yAxisLabel?: string
        // Y Scale checkboxes
        yScaleAxisLineLow?: boolean
        yScaleAxisLineHigh?: boolean
        yScaleMajorTicksLow?: boolean
        yScaleMajorTicksHigh?: boolean
        yScaleMajorTickLabelsLow?: boolean
        yScaleMajorTickLabelsHigh?: boolean
        yScaleMinorTicksLow?: boolean
        // X Scale checkboxes
        xScaleAxisLineLow?: boolean
        xScaleAxisLineHigh?: boolean
        xScaleMajorTicksLow?: boolean
        xScaleMajorTicksHigh?: boolean
        xScaleMajorTickLabelsLow?: boolean
        xScaleMajorTickLabelsHigh?: boolean
      }
    } // X-axis scale configuration
    labelsConfig?: {
      title?: string
      subtitle1?: string
      subtitle2?: string
      footnote1?: string
      footnote2?: string
    } // Chart labels configuration
  }
  const [allSavedCharts, setAllSavedCharts] = useState<SavedChart[]>([]) // All saved charts
  // Charts currently displayed (subset of fields needed for rendering)
  type DisplayedChartItem = { columnId: string; columnName: string; values: number[]; scaleConfig?: SavedChart['scaleConfig']; labelsConfig?: SavedChart['labelsConfig'] }
  const [displayedCharts, setDisplayedCharts] = useState<DisplayedChartItem[]>([]) // Charts currently displayed
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null) // Currently viewed chart
  const [editingChartConfig, setEditingChartConfig] = useState<{
    selectedColumn?: string
    scaleConfig?: any
    labelsConfig?: any
  } | null>(null) // Configuration for editing a chart
  const [editingChartGroupId, setEditingChartGroupId] = useState<string | null>(null) // ID of the group being edited (if part of a range)
  
  // Capability reports state
  const [capabilityReports, setCapabilityReports] = useState<CapabilityResult[]>([])
  const [selectedCapabilityReportIndex, setSelectedCapabilityReportIndex] = useState<number | null>(null)
  
  // Load charts from localStorage on mount
  useEffect(() => {
    if (!spreadsheetId) return
    const savedCharts = localStorage.getItem(`charts_${spreadsheetId}`)
    if (savedCharts) {
      try {
        const parsed = JSON.parse(savedCharts)
        // Ensure all charts have valid worksheet names and clean xAxisLabel
        const validatedCharts = parsed.map((chart: SavedChart) => {
          // Clean xAxisLabel if it has trailing 'y' in scaleConfig
          const cleanScaleConfig = chart.scaleConfig ? {
            ...chart.scaleConfig,
            axesConfig: chart.scaleConfig.axesConfig ? {
              ...chart.scaleConfig.axesConfig,
              xAxisLabel: chart.scaleConfig.axesConfig.xAxisLabel 
                ? chart.scaleConfig.axesConfig.xAxisLabel.replace(/y$/i, '') 
                : undefined
            } : undefined
          } : undefined
          
          // Clean xAxisLabel in allCharts as well
          const cleanedAllCharts = chart.allCharts ? chart.allCharts.map(c => ({
            ...c,
            scaleConfig: c.scaleConfig ? {
              ...c.scaleConfig,
              axesConfig: c.scaleConfig.axesConfig ? {
                ...c.scaleConfig.axesConfig,
                xAxisLabel: c.scaleConfig.axesConfig.xAxisLabel 
                  ? c.scaleConfig.axesConfig.xAxisLabel.replace(/y$/i, '') 
                  : undefined
              } : undefined
            } : undefined
          })) : chart.allCharts
          
          return {
            ...chart,
            worksheetName: chart.worksheetName && chart.worksheetName !== 'undefined' 
              ? chart.worksheetName 
              : `Worksheet ${chart.worksheetId || '1'}`,
            worksheetId: chart.worksheetId || '1',
            scaleConfig: cleanScaleConfig,
            allCharts: cleanedAllCharts,
          }
        })
        setAllSavedCharts(validatedCharts)
        // Don't auto-show charts on load - let user select from navigation
        setDisplayedCharts([])
      } catch (error) {
        console.error('Error loading saved charts:', error)
      }
    }
  }, [spreadsheetId])

  // Save charts to localStorage whenever they change
  useEffect(() => {
    if (allSavedCharts.length > 0 && spreadsheetId) {
      localStorage.setItem(`charts_${spreadsheetId}`, JSON.stringify(allSavedCharts))
    }
  }, [allSavedCharts, spreadsheetId])

  const dropdownRef = useRef<HTMLDivElement>(null)
  const dataMenuRef = useRef<HTMLDivElement>(null)
  const graphMenuRef = useRef<HTMLDivElement>(null)

  // Load spreadsheet and cells data when spreadsheet ID is available
  useEffect(() => {
    const loadData = async () => {
      if (spreadsheetId && spreadsheetId !== 'undefined') {
        try {
          const spreadsheetData = await spreadsheetsAPI.get(spreadsheetId)
          setSpreadsheet(spreadsheetData)
          
          const cellsData = await spreadsheetsAPI.getCells(spreadsheetId)
          setCells(cellsData || [])
        } catch (error: any) {
          console.warn('Failed to load spreadsheet data:', error)
          setCells([])
        }
      } else {
        setCells([])
        setSpreadsheet(null)
      }
    }
    loadData()
    
    // Refresh cells periodically when GraphBuilder is open or every 2 seconds
    const intervalId = setInterval(() => {
      if (spreadsheetId && spreadsheetId !== 'undefined' && showGraphBuilder) {
        loadData()
      }
    }, 2000) // Refresh every 2 seconds when GraphBuilder is open
    
    return () => clearInterval(intervalId)
  }, [spreadsheetId, showGraphBuilder])
  
  // Also refresh cells when GraphBuilder opens
  useEffect(() => {
    if (showGraphBuilder && spreadsheetId && spreadsheetId !== 'undefined') {
      const refreshCells = async () => {
        try {
          const cellsData = await spreadsheetsAPI.getCells(spreadsheetId)
          setCells(cellsData || [])
        } catch (error: any) {
          console.warn('Failed to refresh cells:', error)
        }
      }
      refreshCells()
    }
  }, [showGraphBuilder, spreadsheetId])

  // CRITICAL: Refresh cells when Individuals Chart modal opens to get latest data
  const { activeModal, closeModal } = useModal()
  
  // Reset editing config when modal closes
  useEffect(() => {
    if (activeModal !== 'INDIVIDUALS_CHART') {
      setEditingChartConfig(null)
      setEditingChartGroupId(null)
    }
  }, [activeModal])
  
  useEffect(() => {
    if (activeModal === 'INDIVIDUALS_CHART' && spreadsheetId && spreadsheetId !== 'undefined') {
      const refreshCells = async () => {
        try {
          const cellsData = await spreadsheetsAPI.getCells(spreadsheetId)
          setCells(cellsData || [])
          console.log('[DEBUG] Refreshed cells for Individuals Chart:', cellsData?.length || 0, 'cells')
        } catch (error: any) {
          console.warn('Failed to refresh cells for chart:', error)
        }
      }
      refreshCells()
    }
  }, [activeModal, spreadsheetId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNavigatorDropdown(false)
      }
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target as Node)) {
        setShowDataMenu(false)
      }
      if (graphMenuRef.current && !graphMenuRef.current.contains(event.target as Node)) {
        setShowGraphMenu(false)
      }
    }

    if (showNavigatorDropdown || showDataMenu || showGraphMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNavigatorDropdown, showDataMenu, showGraphMenu])

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  if (user?.company?.status === 'suspended') {
    return <CompanySuspendedScreen />
  }

  return (
    <div className="minitab-layout h-screen bg-white flex flex-col overflow-hidden">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-gray-300">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: Logo and Title */}
          <div className="flex items-center gap-3">
            {/* Green Minitab Logo */}
            <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-800">Excel® Statistical Software</span>
            
            {/* File Name Dropdown */}
            <div className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-sm">
              <span className="text-gray-700">{spreadsheet?.name || 'Untitled'} -</span>
              {false && (
                <>
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 text-xs">Not currently saved</span>
                </>
              )}
            </div>
          </div>

          {/* Right: Help, Settings, User */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded" title="Help">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <Link
              to="/minitab/profile"
              className="p-2 hover:bg-gray-100 rounded"
              title="Settings"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <Link
              to="/minitab/profile"
              className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium hover:bg-blue-700 cursor-pointer"
            >
              {getUserInitials()}
            </Link>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="border-t border-gray-200 bg-white px-4 py-1 flex items-center justify-between relative">
          <nav className="flex items-center gap-1">
            {/* Navigator Button - Toggles Sidebar */}
            <button
              onClick={() => {
                setShowNavigator(!showNavigator)
                setShowNavigatorDropdown(false)
              }}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
                showNavigator
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Navigator
              <svg
                className={`w-4 h-4 transition-transform ${showNavigator ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Navigator Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNavigatorDropdown(!showNavigatorDropdown)}
                className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
                  showNavigatorDropdown
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showNavigatorDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showNavigatorDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-20 min-w-[240px] py-1">
                  <button
                    onClick={() => {
                      toast.success('Create New Report feature coming soon')
                      setShowNavigatorDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Create New Report
                  </button>
                  
                  <div className="border-t border-gray-200 my-1"></div>
                  
                  <button
                    onClick={() => {
                      setGroupByWorksheet(!groupByWorksheet)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>Group Commands By Worksheet</span>
                    {groupByWorksheet && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  
                  <div className="border-t border-gray-200 my-1"></div>
                  
                  <button
                    onClick={() => {
                      setSortOrder('newest')
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                      sortOrder === 'newest' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                    }`}
                  >
                    <span>Sort Newest To Oldest</span>
                    {sortOrder === 'newest' && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setSortOrder('oldest')
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                      sortOrder === 'oldest' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                    }`}
                  >
                    <span>Sort Oldest To Newest</span>
                    {sortOrder === 'oldest' && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setSortOrder('name')
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                      sortOrder === 'name' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                    }`}
                  >
                    <span>Sort By Command Name</span>
                    {sortOrder === 'name' && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Data Menu */}
            <div className="relative" ref={dataMenuRef}>
              <button
                onClick={() => {
                  setShowDataMenu(!showDataMenu)
                  setShowNavigatorDropdown(false)
                }}
                className={`px-3 py-1.5 text-sm rounded ${
                  showDataMenu
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Data
              </button>

              {/* Data Dropdown Menu */}
              {showDataMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-30 min-w-[200px] py-1">
                  <button
                    onClick={() => {
                      toast.success('Subset Worksheet feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Subset Worksheet...
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Split Worksheet feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Split Worksheet...
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Stack Worksheets feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Stack Worksheets...
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Merge Worksheets feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Merge Worksheets
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => {
                      toast.success('Copy feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Unstack Columns feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Unstack Columns...
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Stack feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Stack
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Transpose Columns feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Transpose Columns...
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => {
                      toast.success('Sort feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sort...
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Rank feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Rank...
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => {
                      toast.success('Delete Rows feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Delete Rows...
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Erase Variables feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Erase Variables...
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => {
                      toast.success('Recode feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Recode
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Change Data Type feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Change Data Type...
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Date/Time feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Date/Time
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Concatenate feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Concatenate...
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => {
                      toast.success('Display Data feature coming soon')
                      setShowDataMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Display Data...
                  </button>
                </div>
              )}
            </div>

            <button className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded">Calc</button>

            {/* Stat Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowStatMenu(!showStatMenu)
                  setShowNavigatorDropdown(false)
                  setShowDataMenu(false)
                  setShowGraphMenu(false)
                  setActiveStatSubmenu(null)
                }}
                className={`px-3 py-1.5 text-sm rounded ${
                  showStatMenu
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Stat
              </button>

              {/* Stat Dropdown Menu with Submenus */}
              {showStatMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-30 min-w-[220px] py-1">
                  {STAT_MENU_ITEMS.map((item, index) => (
                    <div
                      key={index}
                      className="relative"
                      onMouseEnter={() => setActiveStatSubmenu(item.label)}
                      onMouseLeave={() => setActiveStatSubmenu(null)}
                    >
                      <button
                        onClick={() => {
                          if (!item.submenu || item.submenu.length === 0) {
                            toast.success(`${item.label} feature coming soon`)
                            setShowStatMenu(false)
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                      >
                        {item.label}
                        {item.submenu && item.submenu.length > 0 && (
                          <span className="text-xs text-gray-500">▶</span>
                        )}
                      </button>

                      {/* First Level Submenu */}
                      {activeStatSubmenu === item.label && item.submenu && item.submenu.length > 0 && (
                        <div className="absolute top-0 left-full ml-1 bg-white border border-gray-300 rounded-md shadow-lg z-40 min-w-[240px] py-1">
                          {item.submenu.map((subitem, subindex) => {
                            const isSubitemObject = typeof subitem === 'object' && subitem.label
                            
                            return (
                              <div
                                key={subindex}
                                className="relative group"
                              >
                                <button
                                  onClick={() => {
                                    if (!isSubitemObject) {
                                      toast.success(`${typeof subitem === 'string' ? subitem : subitem.label} feature coming soon`)
                                      setShowStatMenu(false)
                                    }
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                >
                                  <span>{isSubitemObject ? (subitem as any).label : (subitem as string)}</span>
                                  {isSubitemObject && (subitem as any).submenu && (subitem as any).submenu.length > 0 && (
                                    <span className="text-xs text-gray-500">▶</span>
                                  )}
                                </button>

                                {/* Second Level Submenu (For items like Variables Charts for Individuals, Capability Analysis) */}
                                {isSubitemObject && (subitem as any).submenu && (subitem as any).submenu.length > 0 && (
                                  <div className="absolute top-0 left-full ml-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-[240px] py-1 hidden group-hover:block">
                                    {(subitem as any).submenu.map((thirditem: string, thirdindex: number) => {
                                      // Check if this is under "Capability Analysis"
                                      const isCapabilityAnalysis = (subitem as any).label === 'Capability Analysis'
                                      
                                      return (
                                        <button
                                          key={thirdindex}
                                          onClick={() => {
                                            // Handle specific dialog opens
                                            if (thirditem === 'Individuals') {
                                              openModal('INDIVIDUALS_CHART')
                                            } else if (thirditem === 'I-MR...') {
                                              openModal('IMR_CHART')
                                            } else if (thirditem === 'Xbar-R...') {
                                              openModal('XBAR_R_CHART')
                                            } else if (thirditem === 'Xbar-S...') {
                                              openModal('XBAR_S_CHART')
                                            } else if (isCapabilityAnalysis && thirditem === 'Normal...') {
                                              openModal('CAPABILITY_ANALYSIS_NORMAL')
                                            } else {
                                              toast.success(`${thirditem} feature coming soon`)
                                            }
                                            setShowStatMenu(false)
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                          {thirditem}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Graph Menu */}
            <div className="relative" ref={graphMenuRef}>
              <button
                onClick={() => {
                  setShowGraphMenu(!showGraphMenu)
                  setShowNavigatorDropdown(false)
                  setShowDataMenu(false)
                }}
                className={`px-3 py-1.5 text-sm rounded ${
                  showGraphMenu
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Graph
              </button>

              {/* Graph Dropdown Menu */}
              {showGraphMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-30 min-w-[220px] py-1 max-h-[600px] overflow-y-auto">
                  <button
                    onClick={() => {
                      setShowGraphBuilder(true)
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Graph Builder...
                  </button>
                  
                  <button
                    onClick={() => {
                      toast('Scatterplot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Scatterplot...
                  </button>
                  <button
                    onClick={() => {
                      toast('Binned Scatterplot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Binned Scatterplot...
                  </button>
                  <button
                    onClick={() => {
                      toast('Matrix Plot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Matrix Plot...
                  </button>
                  <button
                    onClick={() => {
                      toast('Correlogram... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Correlogram...
                  </button>
                  <button
                    onClick={() => {
                      toast('Bubble Plot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Bubble Plot...
                  </button>
                  <button
                    onClick={() => {
                      toast('Marginal Plot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Marginal Plot...
                  </button>
                  
                  <div className="border-t border-gray-200 my-1"></div>
                  
                  <button
                    onClick={() => {
                      toast('Histogram... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Histogram...
                  </button>
                  <button
                    onClick={() => {
                      toast('Dotplot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Dotplot...
                  </button>
                  <button
                    onClick={() => {
                      toast('Stem-and-Leaf... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Stem-and-Leaf...
                  </button>
                  <button
                    onClick={() => {
                      toast('Probability Plot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Probability Plot...
                  </button>
                  <button
                    onClick={() => {
                      toast('Empirical CDF... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Empirical CDF...
                  </button>
                  <button
                    onClick={() => {
                      toast('Probability Distribution Plot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Probability Distribution Plot...
                  </button>
                  
                  <div className="border-t border-gray-200 my-1"></div>
                  
                  <button
                    onClick={() => {
                      toast('Boxplot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Boxplot...
                  </button>
                  <button
                    onClick={() => {
                      toast('Interval Plot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Interval Plot...
                  </button>
                  <button
                    onClick={() => {
                      toast('Individual Value Plot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Individual Value Plot...
                  </button>
                  <button
                    onClick={() => {
                      toast('Line Plot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Line Plot...
                  </button>
                  <button
                    onClick={() => {
                      toast('Parallel Coordinates Plot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Parallel Coordinates Plot...
                  </button>
                  
                  <div className="border-t border-gray-200 my-1"></div>
                  
                  <div className="relative group">
                    <button
                      onClick={() => {
                        toast('Bar Chart submenu coming soon')
                        setShowGraphMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Bar Chart</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      toast('Heatmap... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Heatmap...
                  </button>
                  <button
                    onClick={() => {
                      toast('Pie Chart... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Pie Chart...
                  </button>
                  
                  <div className="border-t border-gray-200 my-1"></div>
                  
                  <button
                    onClick={() => {
                      toast('Time Series Plot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Time Series Plot...
                  </button>
                  <button
                    onClick={() => {
                      toast('Area Graph... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Area Graph...
                  </button>
                  <button
                    onClick={() => {
                      toast('Contour Plot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Contour Plot...
                  </button>
                  <button
                    onClick={() => {
                      toast('3D Scatterplot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    3D Scatterplot...
                  </button>
                  <button
                    onClick={() => {
                      toast('3D Surface Plot... coming soon')
                      setShowGraphMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    3D Surface Plot...
                  </button>
                </div>
              )}
            </div>

            <button className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded">View</button>
            <button className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded">Predictive Analytics Module</button>
            <button className="px-2 py-1.5 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </nav>

          {/* Right: Search and Layout Icons */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="px-3 py-1.5 text-sm border border-gray-300 rounded w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <svg className="absolute right-2 top-1.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {/* Layout Icons */}
            <button className="p-1.5 hover:bg-gray-100 rounded" title="Single Sheet View">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded" title="Multiple Sheets View">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
              </svg>
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded" title="Blank">
              <div className="w-5 h-5 border border-gray-400"></div>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Navigator with Slide Animation */}
        <aside
          className={`bg-white border-r border-gray-300 flex flex-col transition-all duration-300 ease-in-out ${
            showNavigator ? 'w-64' : 'w-0'
          }`}
          style={{
            transform: showNavigator ? 'translateX(0)' : 'translateX(-100%)',
            opacity: showNavigator ? 1 : 0,
            overflow: showNavigator ? 'visible' : 'hidden',
          }}
        >
          <div className="p-3 border-b border-gray-200 min-w-[256px] bg-white">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-semibold text-gray-800">Navigator</span>
              <button
                onClick={() => setShowNavigator(!showNavigator)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Toggle Navigator"
              >
                <svg 
                  className="w-4 h-4 text-gray-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 min-w-[256px]">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded mb-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Home</span>
              </Link>

              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded mb-1 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Navigator</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded mb-1 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Open from Excel Connect®</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded mb-1 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>Open</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-gray-100 rounded mb-1 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>{spreadsheet?.name || 'Untitled'}</span>
              </div>

              {/* Capability Reports Section */}
              {capabilityReports.length > 0 && (
                <div className="mt-2 mb-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Capability Reports
                  </div>
                  {capabilityReports.map((report, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedCapabilityReportIndex(idx)
                        setDisplayedCharts([])
                        setSelectedChartId(null)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        selectedCapabilityReportIndex === idx
                          ? 'bg-blue-50 text-blue-900 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Process Capability Report for {report.input.columnId}
                    </button>
                  ))}
                </div>
              )}

              {/* Worksheets and Charts Section - Minitab Style */}
              {allSavedCharts.length > 0 && (
                <div className="mt-2">
                  <WorksheetChartsNavigator
                    charts={allSavedCharts}
                    selectedChartId={selectedChartId}
                    onChartSelect={(chartId) => {
                      setSelectedChartId(chartId)
                      setSelectedCapabilityReportIndex(null) // Clear capability report when chart is selected
                      // Find the selected chart entry
                      const selectedChart = allSavedCharts.find(c => c.id === chartId)
                      if (selectedChart) {
                        if (selectedChart.isRange) {
                          // Range selection: show all charts in the range
                          setDisplayedCharts(selectedChart.allCharts.map(c => ({
                            columnId: c.columnId,
                            columnName: c.columnName,
                            values: c.values,
                            // Use individual chart config if available, otherwise fall back to group config
                            scaleConfig: c.scaleConfig || selectedChart.scaleConfig || { xScaleType: 'index' },
                            labelsConfig: c.labelsConfig || selectedChart.labelsConfig,
                          })))
                        } else {
                          // Single column: show only that one chart
                          setDisplayedCharts([{
                            columnId: selectedChart.columnId,
                            columnName: selectedChart.columnName,
                            values: selectedChart.values,
                            scaleConfig: selectedChart.scaleConfig || { xScaleType: 'index' },
                            labelsConfig: selectedChart.labelsConfig,
                          }])
                        }
                      }
                    }}
                    onViewAllCharts={(_worksheetId, wsCharts) => {
                      // Show all charts for this worksheet
                      setDisplayedCharts(wsCharts)
                      setSelectedChartId(null) // Clear selection to show all
                    }}
                    onDeleteChart={(chartId) => {
                      // Remove chart from saved charts
                      setAllSavedCharts((prev) => {
                        const updated = prev.filter(c => c.id !== chartId)
                        // If deleted chart was selected, clear selection
                        if (selectedChartId === chartId) {
                          setSelectedChartId(null)
                          setDisplayedCharts([])
                        }
                        return updated
                      })
                      toast.success('Chart deleted successfully')
                    }}
                    onRenameChart={(chartId, newTitle) => {
                      // Update chart title in saved charts
                      setAllSavedCharts((prev) => {
                        const updated = prev.map(chart => {
                          if (chart.id === chartId) {
                            return {
                              ...chart,
                              chartTitle: newTitle
                            }
                          }
                          return chart
                        })
                        return updated
                      })
                      toast.success('Chart renamed successfully')
                    }}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded mb-1 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Learn</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded mb-1 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Discover</span>
              </div>
            </nav>
          </aside>

        {/* Main Content Area */}
        <main
          className="flex-1 flex flex-col overflow-auto bg-gray-50 transition-all duration-300"
          style={{
            marginLeft: showNavigator ? '256px' : '0',
          }}
        >
          {selectedCapabilityReportIndex !== null && capabilityReports[selectedCapabilityReportIndex] ? (
            <div className="p-6">
              <ProcessCapabilityReport 
                result={capabilityReports[selectedCapabilityReportIndex]} 
                onEdit={() => openModal('CAPABILITY_ANALYSIS_NORMAL')}
              />
            </div>
          ) : displayedCharts.length > 0 ? (
            <div className="p-6">
              <ChartsPanel
                chartData={displayedCharts.map(c => ({
                  columnId: c.columnId,
                  columnName: c.columnName,
                  values: c.values,
                  xScaleType: c.scaleConfig?.xScaleType,
                  stampColumn: c.scaleConfig?.stampColumn,
                  axesConfig: c.scaleConfig?.axesConfig,
                  labelsConfig: c.labelsConfig,
                }))}
                cells={cells}
                columnCount={spreadsheet?.column_count || 0}
                rowCount={spreadsheet?.row_count || 0}
                onClose={() => {
                  setDisplayedCharts([])
                  setSelectedChartId(null)
                }}
                onEditChart={(columnId, scaleConfig, labelsConfig) => {
                  // Find the chart in displayedCharts to get full data
                  const chartData = displayedCharts.find(c => c.columnId === columnId)
                  if (chartData) {
                    // Check if this chart is part of a range group
                    // Find the group that contains this column
                    const parentGroup = allSavedCharts.find(group => {
                      if (group.isRange) {
                        // Check if columnId is within the range
                        const firstColNum = parseInt(group.firstColumn.replace('C', ''))
                        const lastColNum = parseInt(group.lastColumn.replace('C', ''))
                        const currentColNum = parseInt(columnId.replace('C', ''))
                        return currentColNum >= firstColNum && currentColNum <= lastColNum
                      }
                      return false
                    })
                    
                    // Open dialog with pre-filled configuration
                    setEditingChartConfig({
                      selectedColumn: columnId,
                      scaleConfig: scaleConfig || chartData.scaleConfig,
                      labelsConfig: labelsConfig || chartData.labelsConfig,
                    })
                    // Store the group ID if this chart is part of a range
                    setEditingChartGroupId(parentGroup ? parentGroup.id : null)
                    openModal('INDIVIDUALS_CHART')
                  }
                }}
                onScaleConfigChange={(columnId, config) => {
                  // Find the chart being edited
                  const chartIndex = displayedCharts.findIndex(c => c.columnId === columnId)
                  if (chartIndex !== -1) {
                    const updatedCharts = [...displayedCharts]
                    updatedCharts[chartIndex] = {
                      ...updatedCharts[chartIndex],
                      scaleConfig: {
                        ...updatedCharts[chartIndex].scaleConfig,
                        ...config,
                      },
                    }
                    setDisplayedCharts(updatedCharts)
                    
                    // Update in saved charts
                    if (selectedChartId) {
                      const savedChartIndex = allSavedCharts.findIndex(c => c.id === selectedChartId)
                      if (savedChartIndex !== -1) {
                        const savedChart = allSavedCharts[savedChartIndex]
                        if (savedChart.isRange) {
                          // Update individual chart config in range
                          const updatedAllCharts = savedChart.allCharts.map(c => {
                            if (c.columnId === columnId) {
                              return {
                                ...c,
                                scaleConfig: {
                                  ...c.scaleConfig,
                                  ...config,
                                },
                              }
                            }
                            return c
                          })
                          const updatedSavedCharts = [...allSavedCharts]
                          updatedSavedCharts[savedChartIndex] = {
                            ...savedChart,
                            allCharts: updatedAllCharts,
                          }
                          setAllSavedCharts(updatedSavedCharts)
                          localStorage.setItem('savedCharts', JSON.stringify(updatedSavedCharts))
                        } else {
                          // Update single chart config
                          const updatedSavedCharts = [...allSavedCharts]
                          updatedSavedCharts[savedChartIndex] = {
                            ...savedChart,
                            scaleConfig: {
                              ...savedChart.scaleConfig,
                              ...config,
                            },
                          }
                          setAllSavedCharts(updatedSavedCharts)
                          localStorage.setItem('savedCharts', JSON.stringify(updatedSavedCharts))
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Status Bar */}
      <footer className="bg-gray-100 border-t border-gray-300 px-4 py-1 text-xs text-gray-600 flex items-center justify-between">
        <span>Ready</span>
        <span>NaN Days Remaining</span>
      </footer>

      {/* Graph Builder Modal */}
      <GraphBuilder
        isOpen={showGraphBuilder}
        onClose={() => setShowGraphBuilder(false)}
        cells={cells}
        spreadsheetId={spreadsheetId}
      />

      {/* Stat Dialogs Modal Manager */}
      <ModalManager
        cells={cells}
        columnCount={spreadsheet?.column_count || 0}
        rowCount={spreadsheet?.row_count || 0}
        initialConfig={editingChartConfig || undefined}
        onCapabilityReportReady={(result) => {
          // Add new capability report
          setCapabilityReports(prev => [...prev, result])
          setSelectedCapabilityReportIndex(capabilityReports.length) // Select the newly added report
          // Clear chart display to show capability report
          setDisplayedCharts([])
          setSelectedChartId(null)
        }}
        onGenerateCharts={(chartData, selectionInfo, scaleConfig, labelsConfig, multipleGraphsConfig) => {
          // Debug: Log labelsConfig to verify it's being received
          console.log('[MinitabLayout] Received labelsConfig:', labelsConfig)
          
          // Check if we're editing an existing group
          if (editingChartGroupId) {
            // Find the existing group
            const existingGroupIndex = allSavedCharts.findIndex(c => c.id === editingChartGroupId)
            if (existingGroupIndex !== -1) {
              const existingGroup = allSavedCharts[existingGroupIndex]
              
              if (existingGroup.isRange) {
                // This is a range group - update ONLY the specific chart(s) being edited
                // Update charts that match the edited columns with their individual configs
                const updatedAllCharts = existingGroup.allCharts.map(chart => {
                  const editedChart = chartData.find(c => c.columnId === chart.columnId)
                  if (editedChart) {
                    // This chart was edited - update it with new data AND individual config
                    // Clean xAxisLabel if it has trailing 'y'
                    const cleanedScaleConfig = scaleConfig ? {
                      ...scaleConfig,
                      axesConfig: scaleConfig.axesConfig ? {
                        ...scaleConfig.axesConfig,
                        xAxisLabel: scaleConfig.axesConfig.xAxisLabel ? scaleConfig.axesConfig.xAxisLabel.replace(/y$/i, '') : undefined
                      } : undefined
                    } : chart.scaleConfig
                    return {
                      ...chart,
                      columnId: editedChart.columnId,
                      columnName: editedChart.columnName,
                      values: editedChart.values,
                      scaleConfig: cleanedScaleConfig,
                      labelsConfig: labelsConfig || chart.labelsConfig,
                    }
                  }
                  // This chart wasn't edited - keep it as is (with its existing individual config)
                  return chart
                })
                
                // If a new column was selected (not in the original range), add it with config
                chartData.forEach(editedChart => {
                  const exists = updatedAllCharts.some(c => c.columnId === editedChart.columnId)
                  if (!exists) {
                    updatedAllCharts.push({
                      columnId: editedChart.columnId,
                      columnName: editedChart.columnName,
                      values: editedChart.values,
                      scaleConfig: scaleConfig,
                      labelsConfig: labelsConfig,
                    })
                  }
                })
                
                // Keep group-level config as default/fallback, but don't override individual configs
                const updatedGroup: SavedChart = {
                  ...existingGroup,
                  allCharts: updatedAllCharts,
                  // Group-level config remains as fallback (only used if chart doesn't have individual config)
                  scaleConfig: existingGroup.scaleConfig,
                  labelsConfig: existingGroup.labelsConfig,
                  // Update metadata if first chart was edited
                  columnId: chartData[0]?.columnId || existingGroup.columnId,
                  columnName: chartData[0]?.columnName || existingGroup.columnName,
                  values: chartData[0]?.values || existingGroup.values,
                }
                
                // Update the saved charts array
                const updatedSavedCharts = [...allSavedCharts]
                updatedSavedCharts[existingGroupIndex] = updatedGroup
                setAllSavedCharts(updatedSavedCharts)
                
                // Save to localStorage
                localStorage.setItem('savedCharts', JSON.stringify(updatedSavedCharts))
                
                // Update displayed charts if this group is currently selected
                if (selectedChartId === editingChartGroupId) {
                  setDisplayedCharts(updatedGroup.allCharts.map(c => ({
                    columnId: c.columnId,
                    columnName: c.columnName,
                    values: c.values,
                    // Use individual chart config if available, otherwise fall back to group config
                    scaleConfig: c.scaleConfig || updatedGroup.scaleConfig || { xScaleType: 'index' },
                    labelsConfig: c.labelsConfig || updatedGroup.labelsConfig,
                  })))
                }
                
                // Reset editing state
                setEditingChartConfig(null)
                setEditingChartGroupId(null)
                closeModal()
                
                toast.success('Chart updated in group successfully!')
                console.log('[MinitabLayout] Updated existing group:', updatedGroup)
                return // Exit early, don't create a new chart
              } else {
                // This is a single chart - update it directly
                const updatedChart: SavedChart = {
                  ...existingGroup,
                  columnId: chartData[0]?.columnId || existingGroup.columnId,
                  columnName: chartData[0]?.columnName || existingGroup.columnName,
                  values: chartData[0]?.values || existingGroup.values,
                  scaleConfig: scaleConfig || existingGroup.scaleConfig,
                  labelsConfig: labelsConfig || existingGroup.labelsConfig,
                  allCharts: chartData,
                }
                
                // Update the saved charts array
                const updatedSavedCharts = [...allSavedCharts]
                updatedSavedCharts[existingGroupIndex] = updatedChart
                setAllSavedCharts(updatedSavedCharts)
                
                // Save to localStorage
                localStorage.setItem('savedCharts', JSON.stringify(updatedSavedCharts))
                
                // Update displayed charts if this chart is currently selected
                if (selectedChartId === editingChartGroupId) {
                  setDisplayedCharts([{
                    columnId: updatedChart.columnId,
                    columnName: updatedChart.columnName,
                    values: updatedChart.values,
                    scaleConfig: updatedChart.scaleConfig || { xScaleType: 'index' },
                    labelsConfig: updatedChart.labelsConfig,
                  }])
                }
              
                
                // Reset editing state
                setEditingChartConfig(null)
                setEditingChartGroupId(null)
                closeModal()
                
                toast.success('Chart updated successfully!')
                console.log('[MinitabLayout] Updated existing chart:', updatedChart)
                return // Exit early, don't create a new chart
              }
            }
          }
          
          // Calculate shared Y-axis scale from C1 if "Same Y" is enabled
          let sharedYAxisDomain: { min: number; max: number } | undefined = undefined
          if (multipleGraphsConfig?.sameY && chartData.length > 0) {
            // Find C1 column data
            const c1Data = chartData.find(c => c.columnId === 'C1')
            if (c1Data && c1Data.values.length > 0) {
              // Calculate I-Chart stats for C1
              const stats = calculateIChart(c1Data.values)
              
              // Calculate Y-axis domain same way as IChartComponent
              const minData = Math.min(...c1Data.values)
              const maxData = Math.max(...c1Data.values)
              const allPoints = [minData, maxData, stats.ucl, stats.lcl, stats.mean]
              const minPoint = Math.min(...allPoints)
              const maxPoint = Math.max(...allPoints)
              
              const controlRange = stats.ucl - stats.lcl
              const padding = Math.max(controlRange * 0.08, (maxPoint - minPoint) * 0.05)
              
              let yAxisMin = minPoint - padding
              let yAxisMax = maxPoint + padding
              
              const minControlMargin = (maxPoint - minPoint) * 0.03
              if (stats.lcl - yAxisMin < minControlMargin) {
                yAxisMin = stats.lcl - minControlMargin
              }
              if (yAxisMax - stats.ucl < minControlMargin) {
                yAxisMax = stats.ucl + minControlMargin
              }
              
              sharedYAxisDomain = { min: yAxisMin, max: yAxisMax }
            }
          }
          
          // Get current worksheet name (default to "Worksheet 1" if not available)
          let worksheetName = 'Worksheet 1' // Default
          if (spreadsheet?.worksheet_names && Object.keys(spreadsheet.worksheet_names).length > 0) {
            // Get first worksheet name or use spreadsheet name
            const firstWsKey = Object.keys(spreadsheet.worksheet_names)[0]
            worksheetName = spreadsheet.worksheet_names[firstWsKey] || spreadsheet.name || 'Worksheet 1'
          } else if (spreadsheet?.name && spreadsheet.name !== 'Untitled') {
            worksheetName = spreadsheet.name
          }
          const worksheetId = '1' // Default worksheet ID, can be enhanced later
          
          // Generate chart title based on selection type
          let chartTitle: string
          if (selectionInfo.isRange) {
            // Range selection: "I Chart of C1-C14"
            chartTitle = `I Chart of ${selectionInfo.firstColumn}-${selectionInfo.lastColumn}`
          } else {
            // Single column: "I Chart of C1"
            chartTitle = `I Chart of ${selectionInfo.firstColumn}`
          }
          
          // Create ONE navigation entry for this selection
          // This entry contains all charts in the selection
          const finalScaleConfig = {
            ...(scaleConfig || { xScaleType: 'index' }),
            ...(sharedYAxisDomain && {
              axesConfig: {
                ...(scaleConfig?.axesConfig || {}),
                sharedYAxisDomain,
              }
            })
          }
          
          const savedChart: SavedChart = {
            id: `${worksheetId}-${selectionInfo.isRange ? `${selectionInfo.firstColumn}-${selectionInfo.lastColumn}` : selectionInfo.firstColumn}-${Date.now()}`,
            columnId: chartData[0]?.columnId || selectionInfo.firstColumn,
            columnName: chartData[0]?.columnName || '',
            values: chartData[0]?.values || [],
            worksheetId,
            worksheetName,
            scaleConfig: finalScaleConfig,
            labelsConfig: labelsConfig,
            createdAt: Date.now(),
            chartTitle,
            isRange: selectionInfo.isRange,
            firstColumn: selectionInfo.firstColumn,
            lastColumn: selectionInfo.lastColumn,
            allCharts: chartData.map(c => ({
              ...c,
              // Store group-level config as default for each chart
              scaleConfig: finalScaleConfig,
              labelsConfig: labelsConfig,
            })), // Store all charts in this entry with configs
          }
          
          // Add new chart entry to existing ones
          setAllSavedCharts((prev) => {
            const updated = [...prev, savedChart]
            // Show all charts for this entry
            setDisplayedCharts(savedChart.allCharts.map(c => ({
              columnId: c.columnId,
              columnName: c.columnName,
              values: c.values,
              scaleConfig: c.scaleConfig || scaleConfig || { xScaleType: 'index' },
              labelsConfig: c.labelsConfig || labelsConfig,
            })))
            return updated
          })
          
          // Auto-select this chart entry
          setSelectedChartId(savedChart.id)
          
          toast.success(`Generated ${chartData.length} I-Chart${chartData.length !== 1 ? 's' : ''}`)
        }}
      />
    </div>
  )
}

export default MinitabLayout
