import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Cell } from '../../api/spreadsheets'

interface ScaleDialogProps {
  isOpen: boolean
  onClose: () => void
  onApply: (config: { 
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
      // Y-Axis Scale Configuration
      yScaleTickMode?: 'automatic' | 'number' | 'position'
      yScaleNumberOfTicks?: number
      yScaleTickPositions?: number[]
      yScaleMinEnabled?: boolean
      yScaleMinValue?: number
      yScaleMaxEnabled?: boolean
      yScaleMaxValue?: number
      yScaleMinorTicksEnabled?: boolean
      yScaleMinorTicksNumber?: number
      // X Scale checkboxes
      xScaleAxisLineLow?: boolean
      xScaleAxisLineHigh?: boolean
      xScaleMajorTicksLow?: boolean
      xScaleMajorTicksHigh?: boolean
      xScaleMajorTickLabelsLow?: boolean
      xScaleMajorTickLabelsHigh?: boolean
    }
  }) => void
  cells: Cell[]
  columnCount: number
  rowCount?: number
  initialTab?: 'time' | 'axes' | 'yScale' | 'scale'
  currentConfig?: { 
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
      // Y-Axis Scale Configuration
      yScaleTickMode?: 'automatic' | 'number' | 'position'
      yScaleNumberOfTicks?: number
      yScaleTickPositions?: number[]
      yScaleMinEnabled?: boolean
      yScaleMinValue?: number
      yScaleMaxEnabled?: boolean
      yScaleMaxValue?: number
      yScaleMinorTicksEnabled?: boolean
      yScaleMinorTicksNumber?: number
      // X Scale checkboxes
      xScaleAxisLineLow?: boolean
      xScaleAxisLineHigh?: boolean
      xScaleMajorTicksLow?: boolean
      xScaleMajorTicksHigh?: boolean
      xScaleMajorTickLabelsLow?: boolean
      xScaleMajorTickLabelsHigh?: boolean
    }
  }
}

interface ColumnMetadata {
  columnId: string
  columnName: string
  hasData: boolean
}

export const ScaleDialog: React.FC<ScaleDialogProps> = ({
  isOpen,
  onClose,
  onApply,
  cells,
  columnCount,
  rowCount: _rowCount = 0,
  initialTab = 'time',
  currentConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'time' | 'axes' | 'scale' | 'gridlines' | 'reference'>((initialTab === 'yScale' ? 'scale' : initialTab) || 'time')
  
  // Update activeTab when initialTab changes (when dialog opens)
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab === 'yScale' ? 'scale' : (initialTab || 'time'))
    }
  }, [isOpen, initialTab])
  const [xScaleType, setXScaleType] = useState<'index' | 'stamp'>(currentConfig?.xScaleType || 'index')
  const [selectedStampColumn, setSelectedStampColumn] = useState<string>(currentConfig?.stampColumn || '')
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null)
  
  // Axes and Ticks state - Table format with Low/High options
  const [xAxisLabel, setXAxisLabel] = useState<string>(currentConfig?.axesConfig?.xAxisLabel || '')
  const [yAxisLabel, setYAxisLabel] = useState<string>(currentConfig?.axesConfig?.yAxisLabel || '')
  
  // Y Scale - Low/High checkboxes
  const [yScaleAxisLineLow, setYScaleAxisLineLow] = useState<boolean>(currentConfig?.axesConfig?.yScaleAxisLineLow !== false)
  const [yScaleAxisLineHigh, setYScaleAxisLineHigh] = useState<boolean>(currentConfig?.axesConfig?.yScaleAxisLineHigh !== false)
  const [yScaleMajorTicksLow, setYScaleMajorTicksLow] = useState<boolean>(currentConfig?.axesConfig?.yScaleMajorTicksLow !== false)
  const [yScaleMajorTicksHigh, setYScaleMajorTicksHigh] = useState<boolean>(currentConfig?.axesConfig?.yScaleMajorTicksHigh !== false)
  const [yScaleMajorTickLabelsLow, setYScaleMajorTickLabelsLow] = useState<boolean>(currentConfig?.axesConfig?.yScaleMajorTickLabelsLow !== false)
  const [yScaleMajorTickLabelsHigh, setYScaleMajorTickLabelsHigh] = useState<boolean>(currentConfig?.axesConfig?.yScaleMajorTickLabelsHigh !== false)
  const [yScaleMinorTicksLow, setYScaleMinorTicksLow] = useState<boolean>(currentConfig?.axesConfig?.yScaleMinorTicksLow || false)
  
  // Y-Axis Scale Configuration
  const [yScaleTickMode, setYScaleTickMode] = useState<'automatic' | 'number' | 'position'>(currentConfig?.axesConfig?.yScaleTickMode || 'automatic')
  const [yScaleNumberOfTicks, setYScaleNumberOfTicks] = useState<string>(currentConfig?.axesConfig?.yScaleNumberOfTicks?.toString() || '10')
  const [yScaleTickPositions, setYScaleTickPositions] = useState<string>(currentConfig?.axesConfig?.yScaleTickPositions?.join(' ') || '')
  const [yScaleMinEnabled, setYScaleMinEnabled] = useState<boolean>(currentConfig?.axesConfig?.yScaleMinEnabled !== false)
  const [yScaleMinValue, setYScaleMinValue] = useState<string>(currentConfig?.axesConfig?.yScaleMinValue?.toString() || '')
  const [yScaleMaxEnabled, setYScaleMaxEnabled] = useState<boolean>(currentConfig?.axesConfig?.yScaleMaxEnabled !== false)
  const [yScaleMaxValue, setYScaleMaxValue] = useState<string>(currentConfig?.axesConfig?.yScaleMaxValue?.toString() || '')
  const [yScaleMinorTicksEnabled, setYScaleMinorTicksEnabled] = useState<boolean>(currentConfig?.axesConfig?.yScaleMinorTicksEnabled || false)
  const [yScaleMinorTicksNumber, setYScaleMinorTicksNumber] = useState<string>(currentConfig?.axesConfig?.yScaleMinorTicksNumber?.toString() || '1')
  
  // X Scale - Low/High checkboxes
  const [xScaleAxisLineLow, setXScaleAxisLineLow] = useState<boolean>(currentConfig?.axesConfig?.xScaleAxisLineLow !== false)
  const [xScaleAxisLineHigh, setXScaleAxisLineHigh] = useState<boolean>(currentConfig?.axesConfig?.xScaleAxisLineHigh !== false)
  const [xScaleMajorTicksLow, setXScaleMajorTicksLow] = useState<boolean>(currentConfig?.axesConfig?.xScaleMajorTicksLow !== false)
  const [xScaleMajorTicksHigh, setXScaleMajorTicksHigh] = useState<boolean>(currentConfig?.axesConfig?.xScaleMajorTicksHigh !== false)
  const [xScaleMajorTickLabelsLow, setXScaleMajorTickLabelsLow] = useState<boolean>(currentConfig?.axesConfig?.xScaleMajorTickLabelsLow !== false)
  const [xScaleMajorTickLabelsHigh, setXScaleMajorTickLabelsHigh] = useState<boolean>(currentConfig?.axesConfig?.xScaleMajorTickLabelsHigh !== false)
  
  // Y-axis Scale Configuration (using yScale prefix to match interface)

  // Extract column metadata
  const columns = useMemo(() => {
    const columnData: ColumnMetadata[] = []

    for (let colIdx = 1; colIdx <= columnCount; colIdx++) {
      const columnId = `C${colIdx}`
      const actualColIndex = colIdx - 1
      
      const headerCell = cells.find((c) => c.row_index === 0 && c.column_index === actualColIndex)
      const columnName = headerCell?.value?.toString() || columnId

      const dataCells = cells.filter((c) => {
        if (c.column_index !== actualColIndex) return false
        return c.row_index >= 0
      })
      
      const hasData = dataCells.length > 0 && dataCells.some((c) => c.value !== null && c.value !== '' && c.value !== undefined)

      if (!hasData) continue

      columnData.push({
        columnId,
        columnName,
        hasData: true,
      })
    }

    return columnData
  }, [cells, columnCount])

  useEffect(() => {
    if (currentConfig) {
      setXScaleType(currentConfig.xScaleType)
      setSelectedStampColumn(currentConfig.stampColumn || '')
      if (currentConfig.axesConfig) {
        setXAxisLabel(currentConfig.axesConfig.xAxisLabel || '')
        setYAxisLabel(currentConfig.axesConfig.yAxisLabel || '')
        
        // Y Scale checkboxes
        setYScaleAxisLineLow(currentConfig.axesConfig.yScaleAxisLineLow !== false)
        setYScaleAxisLineHigh(currentConfig.axesConfig.yScaleAxisLineHigh !== false)
        setYScaleMajorTicksLow(currentConfig.axesConfig.yScaleMajorTicksLow !== false)
        setYScaleMajorTicksHigh(currentConfig.axesConfig.yScaleMajorTicksHigh !== false)
        setYScaleMajorTickLabelsLow(currentConfig.axesConfig.yScaleMajorTickLabelsLow !== false)
        setYScaleMajorTickLabelsHigh(currentConfig.axesConfig.yScaleMajorTickLabelsHigh !== false)
        setYScaleMinorTicksLow(currentConfig.axesConfig.yScaleMinorTicksLow || false)
        
        // X Scale checkboxes
        setXScaleAxisLineLow(currentConfig.axesConfig.xScaleAxisLineLow !== false)
        setXScaleAxisLineHigh(currentConfig.axesConfig.xScaleAxisLineHigh !== false)
        setXScaleMajorTicksLow(currentConfig.axesConfig.xScaleMajorTicksLow !== false)
        setXScaleMajorTicksHigh(currentConfig.axesConfig.xScaleMajorTicksHigh !== false)
        setXScaleMajorTickLabelsLow(currentConfig.axesConfig.xScaleMajorTickLabelsLow !== false)
        setXScaleMajorTickLabelsHigh(currentConfig.axesConfig.xScaleMajorTickLabelsHigh !== false)
        
        // Y-axis Scale Configuration
        setYScaleTickMode(currentConfig.axesConfig.yScaleTickMode || 'automatic')
        setYScaleNumberOfTicks(currentConfig.axesConfig.yScaleNumberOfTicks?.toString() || '10')
        setYScaleTickPositions(Array.isArray(currentConfig.axesConfig.yScaleTickPositions) 
          ? currentConfig.axesConfig.yScaleTickPositions.join(' ')
          : (currentConfig.axesConfig.yScaleTickPositions != null ? String(currentConfig.axesConfig.yScaleTickPositions) : ''))
        setYScaleMinEnabled(currentConfig.axesConfig.yScaleMinEnabled !== false)
        setYScaleMinValue(currentConfig.axesConfig.yScaleMinValue?.toString() || '')
        setYScaleMaxEnabled(currentConfig.axesConfig.yScaleMaxEnabled !== false)
        setYScaleMaxValue(currentConfig.axesConfig.yScaleMaxValue?.toString() || '')
        setYScaleMinorTicksEnabled(currentConfig.axesConfig.yScaleMinorTicksEnabled || false)
        setYScaleMinorTicksNumber(currentConfig.axesConfig.yScaleMinorTicksNumber?.toString() || '1')
      }
    }
  }, [currentConfig])

  const handleSelectClick = () => {
    if (selectedColumnId === null) {
      return
    }

    setSelectedStampColumn(selectedColumnId)
  }

  const handleOK = () => {
    if (xScaleType === 'stamp' && !selectedStampColumn) {
      return
    }

    // Build axes config with all checkbox states
    const axesConfig: any = {
      xAxisLabel: xAxisLabel ? xAxisLabel.replace(/y$/i, '') : undefined,
      yAxisLabel: yAxisLabel || undefined,
      // Y Scale checkboxes
      yScaleAxisLineLow,
      yScaleAxisLineHigh,
      yScaleMajorTicksLow,
      yScaleMajorTicksHigh,
      yScaleMajorTickLabelsLow,
      yScaleMajorTickLabelsHigh,
      yScaleMinorTicksLow,
      // Y-Axis Scale Configuration
      yScaleTickMode: yScaleTickMode !== 'automatic' ? yScaleTickMode : undefined,
      yScaleNumberOfTicks: yScaleTickMode === 'number' && yScaleNumberOfTicks ? parseInt(yScaleNumberOfTicks) : undefined,
      yScaleTickPositions: yScaleTickMode === 'position' && yScaleTickPositions ? yScaleTickPositions.split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v)) : undefined,
      yScaleMinEnabled: yScaleMinEnabled ? undefined : false,
      yScaleMinValue: yScaleMinEnabled && yScaleMinValue ? parseFloat(yScaleMinValue) : undefined,
      yScaleMaxEnabled: yScaleMaxEnabled ? undefined : false,
      yScaleMaxValue: yScaleMaxEnabled && yScaleMaxValue ? parseFloat(yScaleMaxValue) : undefined,
      yScaleMinorTicksEnabled: yScaleMinorTicksEnabled || undefined,
      yScaleMinorTicksNumber: yScaleMinorTicksEnabled && yScaleMinorTicksNumber ? parseInt(yScaleMinorTicksNumber) : undefined,
      // X Scale checkboxes
      xScaleAxisLineLow,
      xScaleAxisLineHigh,
      xScaleMajorTicksLow,
      xScaleMajorTicksHigh,
      xScaleMajorTickLabelsLow,
      xScaleMajorTickLabelsHigh,
    }

    onApply({
      xScaleType,
      stampColumn: xScaleType === 'stamp' ? selectedStampColumn : undefined,
      axesConfig: Object.keys(axesConfig).length > 0 ? axesConfig : undefined,
    })
    onClose()
  }

  const handleCancel = () => {
    // Reset to current config
    if (currentConfig) {
      setXScaleType(currentConfig.xScaleType)
      setSelectedStampColumn(currentConfig.stampColumn || '')
      if (currentConfig.axesConfig) {
        setXAxisLabel(currentConfig.axesConfig.xAxisLabel || '')
        setYAxisLabel(currentConfig.axesConfig.yAxisLabel || '')
        
        // Y Scale checkboxes
        setYScaleAxisLineLow(currentConfig.axesConfig.yScaleAxisLineLow !== false)
        setYScaleAxisLineHigh(currentConfig.axesConfig.yScaleAxisLineHigh !== false)
        setYScaleMajorTicksLow(currentConfig.axesConfig.yScaleMajorTicksLow !== false)
        setYScaleMajorTicksHigh(currentConfig.axesConfig.yScaleMajorTicksHigh !== false)
        setYScaleMajorTickLabelsLow(currentConfig.axesConfig.yScaleMajorTickLabelsLow !== false)
        setYScaleMajorTickLabelsHigh(currentConfig.axesConfig.yScaleMajorTickLabelsHigh !== false)
        setYScaleMinorTicksLow(currentConfig.axesConfig.yScaleMinorTicksLow || false)
        
        // Y-Axis Scale Configuration
        setYScaleTickMode(currentConfig.axesConfig.yScaleTickMode || 'automatic')
        setYScaleNumberOfTicks(currentConfig.axesConfig.yScaleNumberOfTicks?.toString() || '10')
        setYScaleTickPositions(currentConfig.axesConfig.yScaleTickPositions?.join(' ') || '')
        setYScaleMinEnabled(currentConfig.axesConfig.yScaleMinEnabled !== false)
        setYScaleMinValue(currentConfig.axesConfig.yScaleMinValue?.toString() || '')
        setYScaleMaxEnabled(currentConfig.axesConfig.yScaleMaxEnabled !== false)
        setYScaleMaxValue(currentConfig.axesConfig.yScaleMaxValue?.toString() || '')
        setYScaleMinorTicksEnabled(currentConfig.axesConfig.yScaleMinorTicksEnabled || false)
        setYScaleMinorTicksNumber(currentConfig.axesConfig.yScaleMinorTicksNumber?.toString() || '1')
        
        // X Scale checkboxes
        setXScaleAxisLineLow(currentConfig.axesConfig.xScaleAxisLineLow !== false)
        setXScaleAxisLineHigh(currentConfig.axesConfig.xScaleAxisLineHigh !== false)
        setXScaleMajorTicksLow(currentConfig.axesConfig.xScaleMajorTicksLow !== false)
        setXScaleMajorTicksHigh(currentConfig.axesConfig.xScaleMajorTicksHigh !== false)
        setXScaleMajorTickLabelsLow(currentConfig.axesConfig.xScaleMajorTickLabelsLow !== false)
        setXScaleMajorTickLabelsHigh(currentConfig.axesConfig.xScaleMajorTickLabelsHigh !== false)
      } else {
        // Reset to defaults
        setXAxisLabel('')
        setYAxisLabel('')
        setYScaleAxisLineLow(true)
        setYScaleAxisLineHigh(true)
        setYScaleMajorTicksLow(true)
        setYScaleMajorTicksHigh(true)
        setYScaleMajorTickLabelsLow(true)
        setYScaleMajorTickLabelsHigh(true)
        setYScaleMinorTicksLow(false)
        // Reset Y-Axis Scale Configuration
        setYScaleTickMode('automatic')
        setYScaleNumberOfTicks('10')
        setYScaleTickPositions('')
        setYScaleMinEnabled(true)
        setYScaleMinValue('')
        setYScaleMaxEnabled(true)
        setYScaleMaxValue('')
        setYScaleMinorTicksEnabled(false)
        setYScaleMinorTicksNumber('1')
        setXScaleAxisLineLow(true)
        setXScaleAxisLineHigh(true)
        setXScaleMajorTicksLow(true)
        setXScaleMajorTicksHigh(true)
        setXScaleMajorTickLabelsLow(true)
        setXScaleMajorTickLabelsHigh(true)
      }
    } else {
      setXScaleType('index')
      setSelectedStampColumn('')
      setXAxisLabel('')
      setYAxisLabel('')
      // Reset checkboxes to defaults
      setYScaleAxisLineLow(true)
      setYScaleAxisLineHigh(true)
      setYScaleMajorTicksLow(true)
      setYScaleMajorTicksHigh(true)
      setYScaleMajorTickLabelsLow(true)
      setYScaleMajorTickLabelsHigh(true)
      setYScaleMinorTicksLow(false)
      // Reset Y-Axis Scale Configuration
      setYScaleTickMode('automatic')
      setYScaleNumberOfTicks('10')
      setYScaleTickPositions('')
      setYScaleMinEnabled(true)
      setYScaleMinValue('')
      setYScaleMaxEnabled(true)
      setYScaleMaxValue('')
      setYScaleMinorTicksEnabled(false)
      setYScaleMinorTicksNumber('1')
      setXScaleAxisLineLow(true)
      setXScaleAxisLineHigh(true)
      setXScaleMajorTicksLow(true)
      setXScaleMajorTicksHigh(true)
      setXScaleMajorTickLabelsLow(true)
      setXScaleMajorTickLabelsHigh(true)
    }
    onClose()
  }

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleCancel()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
      return () => document.removeEventListener('keydown', handleEscKey)
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={handleCancel} />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl pointer-events-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
            <h2 className="text-lg font-semibold">Individuals Chart: Scale</h2>
            <button
              onClick={handleCancel}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-300 bg-gray-50">
            <div className="flex">
              {(['time', 'axes', 'scale', 'gridlines', 'reference'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-white border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab === 'time' && 'Time'}
                  {tab === 'axes' && 'Axes and Ticks'}
                  {tab === 'scale' && 'Scale'}
                  {tab === 'gridlines' && 'Gridlines'}
                  {tab === 'reference' && 'Reference Lines'}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'time' && (
              <div className="grid grid-cols-2 gap-6">
                {/* Left Panel - Column List */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Columns
                  </label>
                  <div className="border border-gray-300 rounded bg-white h-64 overflow-y-auto">
                    {columns.length === 0 ? (
                      <p className="text-sm text-gray-500 p-3">No columns available</p>
                    ) : (
                      <div className="divide-y">
                        {columns.map((col) => (
                          <button
                            key={col.columnId}
                            onClick={() => setSelectedColumnId(col.columnId)}
                            className={`w-full text-left px-3 py-2 transition-colors ${
                              selectedColumnId === col.columnId
                                ? 'bg-blue-500 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span className="font-semibold">{col.columnId}</span>
                            <span className="text-xs ml-2 truncate">{col.columnName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Select Button */}
                  <button
                    onClick={handleSelectClick}
                    disabled={!selectedColumnId || xScaleType !== 'stamp'}
                    className={`w-full mt-3 px-4 py-2 rounded font-medium transition-colors ${
                      !selectedColumnId || xScaleType !== 'stamp'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Select
                  </button>
                </div>

                {/* Right Panel - X Scale Options */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    X Scale
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="xScale"
                        value="index"
                        checked={xScaleType === 'index'}
                        onChange={() => {
                          setXScaleType('index')
                          setSelectedStampColumn('')
                        }}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Index</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="xScale"
                        value="stamp"
                        checked={xScaleType === 'stamp'}
                        onChange={() => setXScaleType('stamp')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Stamp</span>
                    </label>
                  </div>

                  {xScaleType === 'stamp' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stamp columns (1-3, innermost first):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={selectedStampColumn}
                          onChange={(e) => {
                            const inputValue = e.target.value
                            // Allow typing - convert to uppercase and allow partial input
                            const upperValue = inputValue.toUpperCase()
                            // Allow empty, single C, or C followed by digits
                            if (upperValue === '' || upperValue === 'C' || upperValue.match(/^C\d*$/)) {
                              setSelectedStampColumn(upperValue)
                            }
                          }}
                          placeholder="e.g., C1 or select from list"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus={xScaleType === 'stamp'}
                        />
                        <button
                          onClick={() => setSelectedStampColumn('')}
                          className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
                          title="Clear"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Type column name (e.g., C1) or select from list
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'axes' && (
              <div className="space-y-6">
                {/* Labels Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      X-Axis Label:
                    </label>
                    <input
                      type="text"
                      value={xAxisLabel}
                      onChange={(e) => setXAxisLabel(e.target.value)}
                      placeholder="e.g., Observation"
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Y-Axis Label:
                    </label>
                    <input
                      type="text"
                      value={yAxisLabel}
                      onChange={(e) => setYAxisLabel(e.target.value)}
                      placeholder="e.g., Individual Value"
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Checkbox Grid Table */}
                <div className="border border-gray-300 rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">
                          Show
                        </th>
                        <th colSpan={2} className="px-4 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-300">
                          Y Scale
                        </th>
                        <th colSpan={2} className="px-4 py-2 text-center text-xs font-semibold text-gray-700">
                          X Scale
                        </th>
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300 border-t border-gray-300"></th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-300 border-t border-gray-300">
                          Low
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-300 border-t border-gray-300">
                          High
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 border-r border-gray-300 border-t border-gray-300">
                          Low
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 border-t border-gray-300">
                          High
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Axis line row */}
                      <tr>
                        <td className="px-4 py-2 text-xs text-gray-700 border-r border-gray-300">
                          Axis line
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-300">
                          <input
                            type="checkbox"
                            checked={yScaleAxisLineLow}
                            onChange={(e) => setYScaleAxisLineLow(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-300">
                          <input
                            type="checkbox"
                            checked={yScaleAxisLineHigh}
                            onChange={(e) => setYScaleAxisLineHigh(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-300">
                          <input
                            type="checkbox"
                            checked={xScaleAxisLineLow}
                            onChange={(e) => setXScaleAxisLineLow(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={xScaleAxisLineHigh}
                            onChange={(e) => setXScaleAxisLineHigh(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                      {/* Major ticks row */}
                      <tr>
                        <td className="px-4 py-2 text-xs text-gray-700 border-r border-gray-300">
                          Major ticks
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-300">
                          <input
                            type="checkbox"
                            checked={yScaleMajorTicksLow}
                            onChange={(e) => setYScaleMajorTicksLow(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-300">
                          <input
                            type="checkbox"
                            checked={yScaleMajorTicksHigh}
                            onChange={(e) => setYScaleMajorTicksHigh(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-300">
                          <input
                            type="checkbox"
                            checked={xScaleMajorTicksLow}
                            onChange={(e) => setXScaleMajorTicksLow(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={xScaleMajorTicksHigh}
                            onChange={(e) => setXScaleMajorTicksHigh(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                      {/* Major tick labels row */}
                      <tr>
                        <td className="px-4 py-2 text-xs text-gray-700 border-r border-gray-300">
                          Major tick labels
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-300">
                          <input
                            type="checkbox"
                            checked={yScaleMajorTickLabelsLow}
                            onChange={(e) => setYScaleMajorTickLabelsLow(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-300">
                          <input
                            type="checkbox"
                            checked={yScaleMajorTickLabelsHigh}
                            onChange={(e) => setYScaleMajorTickLabelsHigh(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-300">
                          <input
                            type="checkbox"
                            checked={xScaleMajorTickLabelsLow}
                            onChange={(e) => setXScaleMajorTickLabelsLow(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={xScaleMajorTickLabelsHigh}
                            onChange={(e) => setXScaleMajorTickLabelsHigh(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                      {/* Minor ticks row */}
                      <tr>
                        <td className="px-4 py-2 text-xs text-gray-700 border-r border-gray-300">
                          Minor ticks
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-300">
                          <input
                            type="checkbox"
                            checked={yScaleMinorTicksLow}
                            onChange={(e) => setYScaleMinorTicksLow(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-300">
                          {/* No High option for Y Scale Minor ticks */}
                        </td>
                        <td className="px-4 py-2 text-center border-r border-gray-300">
                          {/* No options for X Scale Minor ticks */}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {/* No options for X Scale Minor ticks */}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'scale' && (
              <div className="space-y-6">
                {/* Major Tick Positions */}
                <div className="border border-gray-300 rounded p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Major Tick Positions</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="yScaleTickMode"
                        value="automatic"
                        checked={yScaleTickMode === 'automatic'}
                        onChange={() => setYScaleTickMode('automatic')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Automatic</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="yScaleTickMode"
                        value="number"
                        checked={yScaleTickMode === 'number'}
                        onChange={() => setYScaleTickMode('number')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Number of ticks:</span>
                      <input
                        type="number"
                        value={yScaleNumberOfTicks}
                        onChange={(e) => setYScaleNumberOfTicks(e.target.value)}
                        disabled={yScaleTickMode !== 'number'}
                        min="1"
                        max="50"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="yScaleTickMode"
                        value="position"
                        checked={yScaleTickMode === 'position'}
                        onChange={() => setYScaleTickMode('position')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Position of ticks:</span>
                      <input
                        type="text"
                        value={yScaleTickPositions}
                        onChange={(e) => setYScaleTickPositions(e.target.value)}
                        disabled={yScaleTickMode !== 'position'}
                        placeholder="e.g., 0 100 200 300"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </label>
                  </div>
                </div>

                {/* Scale Range */}
                <div className="border border-gray-300 rounded p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Scale Range</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={yScaleMinEnabled}
                        onChange={(e) => setYScaleMinEnabled(e.target.checked)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="text-sm text-gray-700">Minimum:</label>
                      <input
                        type="number"
                        value={yScaleMinValue}
                        onChange={(e) => setYScaleMinValue(e.target.value)}
                        disabled={!yScaleMinEnabled}
                        step="any"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Auto"
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={yScaleMaxEnabled}
                        onChange={(e) => setYScaleMaxEnabled(e.target.checked)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="text-sm text-gray-700">Maximum:</label>
                      <input
                        type="number"
                        value={yScaleMaxValue}
                        onChange={(e) => setYScaleMaxValue(e.target.value)}
                        disabled={!yScaleMaxEnabled}
                        step="any"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Auto"
                      />
                    </div>
                  </div>
                </div>

                {/* Minor Ticks */}
                <div className="border border-gray-300 rounded p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Minor Ticks</h3>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={yScaleMinorTicksEnabled}
                      onChange={(e) => setYScaleMinorTicksEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="text-sm text-gray-700">Number:</label>
                    <input
                      type="number"
                      value={yScaleMinorTicksNumber}
                      onChange={(e) => setYScaleMinorTicksNumber(e.target.value)}
                      disabled={!yScaleMinorTicksEnabled}
                      min="0"
                      max="10"
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gridlines' && (
              <div className="text-center py-8 text-gray-500">
                Gridlines options coming soon
              </div>
            )}

            {activeTab === 'reference' && (
              <div className="text-center py-8 text-gray-500">
                Reference Lines options coming soon
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-100 px-6 py-4 rounded-b-lg flex justify-between items-center border-t border-gray-300">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              Help
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOK}
                disabled={xScaleType === 'stamp' && !selectedStampColumn}
                className={`px-6 py-2 text-sm font-medium rounded transition-colors ${
                  xScaleType === 'stamp' && !selectedStampColumn
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
