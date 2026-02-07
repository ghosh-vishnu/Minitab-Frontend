import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from '../../context/ModalContext'
import { Cell } from '../../api/spreadsheets'
import toast from 'react-hot-toast'
import { ScaleDialog } from './ScaleDialog'
import { LabelsDialog } from './LabelsDialog'
import { MultipleGraphsDialog } from './MultipleGraphsDialog'

interface IndividualsChartDialogProps {
  cells: Cell[]
  columnCount: number
  rowCount: number
  initialConfig?: {
    selectedColumn?: string
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
  }
  onGenerateCharts?: (
    chartData: Array<{ columnId: string; columnName: string; values: number[] }>,
    selectionInfo: { isRange: boolean; firstColumn: string; lastColumn: string },
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
    },
    labelsConfig?: {
      title?: string
      subtitle1?: string
      subtitle2?: string
      footnote1?: string
      footnote2?: string
    },
    multipleGraphsConfig?: {
      sameY?: boolean
    }
  ) => void
}

interface ColumnMetadata {
  columnId: string
  columnName: string
  hasData: boolean
  isNumeric: boolean
}

export const IndividualsChartDialog: React.FC<IndividualsChartDialogProps> = ({
  cells,
  columnCount,
  onGenerateCharts,
  initialConfig,
}) => {
  const { activeModal, closeModal } = useModal()
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(initialConfig?.selectedColumn || null)
  const [variablesInput, setVariablesInput] = useState<string>(initialConfig?.selectedColumn || '')
  const [showScaleDialog, setShowScaleDialog] = useState(false)
  const [showLabelsDialog, setShowLabelsDialog] = useState(false)
  const [showMultipleGraphsDialog, setShowMultipleGraphsDialog] = useState(false)
  const [scaleConfig, setScaleConfig] = useState<{ xScaleType: 'index' | 'stamp'; stampColumn?: string; axesConfig?: any }>(
    initialConfig?.scaleConfig || { xScaleType: 'index' }
  )
  const [labelsConfig, setLabelsConfig] = useState<{
    title?: string
    subtitle1?: string
    subtitle2?: string
    footnote1?: string
    footnote2?: string
  }>(initialConfig?.labelsConfig || {})
  const [multipleGraphsConfig, setMultipleGraphsConfig] = useState<{ sameY?: boolean }>({ sameY: false })

  const isOpen = activeModal === 'INDIVIDUALS_CHART'

  // Initialize from initialConfig when dialog opens
  useEffect(() => {
    if (isOpen && initialConfig) {
      if (initialConfig.selectedColumn) {
        setVariablesInput(initialConfig.selectedColumn)
        setSelectedColumnId(initialConfig.selectedColumn)
      }
      if (initialConfig.scaleConfig) {
        setScaleConfig(initialConfig.scaleConfig)
      }
      if (initialConfig.labelsConfig) {
        setLabelsConfig(initialConfig.labelsConfig)
      }
    } else if (!isOpen) {
      // Reset when dialog closes
      setVariablesInput('')
      setSelectedColumnId(null)
      setScaleConfig({ xScaleType: 'index' })
      setLabelsConfig({})
    }
  }, [isOpen, initialConfig])

  // Extract worksheet column metadata from cells
  // CRITICAL: Row 0 is typically header, data starts from row 1
  // Grid rows are 0-based, so row_index 0 = first visible row (usually header)
  const columns = useMemo(() => {
    const columnData: ColumnMetadata[] = []

    for (let colIdx = 1; colIdx <= columnCount; colIdx++) {
      const columnId = `C${colIdx}`
      // Cell indices are 0-based, so subtract 1
      const actualColIndex = colIdx - 1
      
      // Check for header in row 0 (first row)
      const headerCell = cells.find((c) => c.row_index === 0 && c.column_index === actualColIndex)
      const columnName = headerCell?.value?.toString() || columnId

      // Get all data cells for this column
      // Include all rows - we'll check if they're numeric later
      // Row 0 will be included if it has numeric data
      const dataCells = cells.filter((c) => {
        if (c.column_index !== actualColIndex) return false
        // Include all rows - numeric filtering happens below
        return c.row_index >= 0
      })
      
      const hasData = dataCells.length > 0 && dataCells.some((c) => c.value !== null && c.value !== '' && c.value !== undefined)

      if (!hasData) continue

      const nonEmptyCells = dataCells.filter((c) => c.value !== null && c.value !== '' && c.value !== undefined)
      const numericCount = nonEmptyCells.filter((c) => {
        const num = Number(c.value)
        return !isNaN(num) && isFinite(num)
      }).length

      const isNumeric = nonEmptyCells.length > 0 && numericCount === nonEmptyCells.length

      columnData.push({
        columnId,
        columnName,
        hasData: true,
        isNumeric,
      })
    }

    return columnData
  }, [cells, columnCount])

  // Parse range input like "C1-C5" or "C1,C2,C3" or "C1 C2 C3"
  const parseRangeInput = (input: string): string[] => {
    if (!input.trim()) return []

    const result: string[] = []
    const parts = input.split(/[,\s]+/).filter((p) => p.trim())

    for (const part of parts) {
      if (part.includes('-')) {
        // Handle range like "C1-C5"
        const [start, end] = part.split('-').map((s) => s.trim())
        const startNum = parseInt(start.replace('C', ''))
        const endNum = parseInt(end.replace('C', ''))

        if (!isNaN(startNum) && !isNaN(endNum)) {
          const min = Math.min(startNum, endNum)
          const max = Math.max(startNum, endNum)
          for (let i = min; i <= max; i++) {
            const colId = `C${i}`
            if (!result.includes(colId)) {
              result.push(colId)
            }
          }
        }
      } else {
        // Handle single column like "C1"
        const colId = part.toUpperCase()
        if (colId.match(/^C\d+$/)) {
          if (!result.includes(colId)) {
            result.push(colId)
          }
        }
      }
    }

    return result
  }

  // Get selected columns from variables input
  const selectedColumns = useMemo(() => {
    const columnIds = parseRangeInput(variablesInput)
    return columnIds
      .map((id) => columns.find((c) => c.columnId === id))
      .filter((c) => c !== undefined && c.isNumeric) as ColumnMetadata[]
  }, [variablesInput, columns])

  const handleSelectClick = () => {
    if (selectedColumnId === null) {
      toast.error('Please select a column')
      return
    }

    const selectedCol = columns.find((c) => c.columnId === selectedColumnId)
    if (!selectedCol?.isNumeric) {
      toast.error('Selected column must contain numeric data')
      return
    }

    // Add to variables input
    const currentIds = parseRangeInput(variablesInput)
    if (!currentIds.includes(selectedColumnId)) {
      const updatedIds = [...currentIds, selectedColumnId]
      // Format as range if consecutive, otherwise as comma-separated
      const numericIds = updatedIds
        .map((id) => parseInt(id.replace('C', '')))
        .sort((a, b) => a - b)

      if (
        numericIds.length > 1 &&
        numericIds[numericIds.length - 1] - numericIds[0] === numericIds.length - 1
      ) {
        // Consecutive range
        setVariablesInput(`C${numericIds[0]}-C${numericIds[numericIds.length - 1]}`)
      } else {
        // Comma separated
        setVariablesInput(updatedIds.join(', '))
      }
    }
  }

  const handleOK = () => {
    if (selectedColumns.length === 0) {
      toast.error('Please select at least one variable')
      return
    }

    // Extract numeric values for each selected column
    // CRITICAL: Use correct row indexing - row_index 0 is first row, not header
    const chartData = selectedColumns.map((col) => {
      const colNum = parseInt(col.columnId.replace('C', ''))
      const colIndex = colNum - 1 // Convert to 0-based index
      
      // Get all cells for this column
      // Include all rows with numeric data
      // Row 0 will be included if it has numeric data (it's data, not header)
      const columnCells = cells
        .filter((cell) => {
          if (cell.column_index !== colIndex) return false
          // Include all rows - we'll filter out non-numeric values later
          return cell.row_index >= 0
        })
        .sort((a, b) => a.row_index - b.row_index) // Maintain row order
      
      // Convert to numeric values - skip only truly empty cells
      const values = columnCells
        .map((cell) => {
          const rawValue = cell.value
          // If cell is empty/null, skip it
          if (rawValue === null || rawValue === undefined || rawValue === '') {
            return null
          }
          // Preserve integer format - remove .0 if present
          let strValue = String(rawValue).trim()
          // Check if it's a number ending with .0 and convert to integer string
          const num = Number(strValue)
          if (!isNaN(num) && isFinite(num)) {
            // If it's an integer, ensure no .0 suffix
            if (Number.isInteger(num)) {
              strValue = num.toString()
            }
            return num
          }
          return null
        })
        .filter((val) => val !== null) as number[]

      // CRITICAL DEBUG: Log extracted values to verify data correctness
      console.log(`[DEBUG I-Chart] Column ${col.columnId} (${col.columnName}):`)
      console.log(`  - Total cells found: ${columnCells.length}`)
      console.log(`  - Values extracted: ${values.length}`)
      console.log(`  - First 5 values:`, values.slice(0, 5))
      console.log(`  - All values:`, values)
      console.log(`  - Cell details:`, columnCells.map(c => ({ row: c.row_index, col: c.column_index, value: c.value })).slice(0, 5))

      return {
        columnId: col.columnId,
        columnName: col.columnName,
        values,
      }
    })

    // Determine selection type (single column vs range)
    const isRange = selectedColumns.length > 1
    const firstColumn = selectedColumns[0]?.columnId || ''
    const lastColumn = selectedColumns[selectedColumns.length - 1]?.columnId || ''
    
    // Generate charts with selection info, scale config, labels config, and multiple graphs config
    console.log('[IndividualsChartDialog] Sending labelsConfig:', labelsConfig)
    console.log('[IndividualsChartDialog] Sending multipleGraphsConfig:', multipleGraphsConfig)
    if (onGenerateCharts) {
      onGenerateCharts(chartData, {
        isRange,
        firstColumn,
        lastColumn,
      }, scaleConfig, labelsConfig, multipleGraphsConfig)
    } else {
      console.log('Chart data ready:', chartData)
      toast.success(`I-Charts generated for: ${selectedColumns.map((c) => c.columnId).join(', ')}`)
    }

    closeModal()
    setVariablesInput('')
    setSelectedColumnId(null)
  }

  const handleCancel = () => {
    closeModal()
    setVariablesInput('')
    setSelectedColumnId(null)
  }

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeModal()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
      return () => document.removeEventListener('keydown', handleEscKey)
    }
  }, [isOpen, closeModal])

  if (!isOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeModal} />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl pointer-events-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
            <h2 className="text-lg font-semibold">Individuals Chart</h2>
            <button
              onClick={closeModal}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
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
                          disabled={!col.isNumeric}
                          className={`w-full text-left px-3 py-2 transition-colors ${
                            selectedColumnId === col.columnId
                              ? 'bg-blue-500 text-white'
                              : col.isNumeric
                              ? 'text-gray-700 hover:bg-gray-100'
                              : 'text-gray-400 cursor-not-allowed bg-gray-50'
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
                  className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors"
                >
                  Select
                </button>
              </div>

              {/* Right Panel - Variables and Options */}
              <div className="space-y-4">
                {/* Variables Input Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Variables:
                  </label>
                  <input
                    type="text"
                    value={variablesInput}
                    onChange={(e) => setVariablesInput(e.target.value)}
                    placeholder="e.g., C1-C15 or C1,C3,C5"
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {selectedColumns.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">
                      <strong>Selected columns:</strong> {selectedColumns.map((c) => c.columnId).join(', ')}
                    </div>
                  )}
                </div>

                {/* Options Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setShowScaleDialog(true)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                  >
                    Scale...
                  </button>
                  <button
                    onClick={() => setShowLabelsDialog(true)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                  >
                    Labels...
                  </button>
                  <button
                    onClick={() => setShowMultipleGraphsDialog(true)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                  >
                    Multiple Graphs...
                  </button>
                </div>

                {/* More Options */}
                <div className="grid grid-cols-2 gap-2">
                  <button className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors">
                    Data Options...
                  </button>
                  <button className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors">
                    Chart Options...
                  </button>
                </div>
              </div>
            </div>
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
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scale Dialog */}
      <ScaleDialog
        isOpen={showScaleDialog}
        onClose={() => setShowScaleDialog(false)}
        onApply={(config) => {
          setScaleConfig(config)
          setShowScaleDialog(false)
        }}
        cells={cells}
        columnCount={columnCount}
        currentConfig={scaleConfig}
      />

      {/* Labels Dialog */}
      <LabelsDialog
        isOpen={showLabelsDialog}
        onClose={() => setShowLabelsDialog(false)}
        onApply={(config) => {
          setLabelsConfig(config)
          setShowLabelsDialog(false)
        }}
        currentConfig={labelsConfig}
      />

      {/* Multiple Graphs Dialog */}
      <MultipleGraphsDialog
        isOpen={showMultipleGraphsDialog}
        onClose={() => setShowMultipleGraphsDialog(false)}
        onApply={(config) => {
          setMultipleGraphsConfig(config)
          setShowMultipleGraphsDialog(false)
        }}
        currentConfig={multipleGraphsConfig}
      />
    </>,
    document.body
  )
}

