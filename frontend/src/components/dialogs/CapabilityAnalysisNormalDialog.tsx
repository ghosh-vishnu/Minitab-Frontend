import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from '../../context/ModalContext'
import { Cell } from '../../api/spreadsheets'
import toast from 'react-hot-toast'
import {
  CapabilityInput,
  ArrangementMode,
  computeCapability,
  CapabilityResult,
} from '../../utils/capabilityNormal'

interface CapabilityAnalysisNormalDialogProps {
  cells: Cell[]
  columnCount: number
  rowCount: number
  onReportReady: (result: CapabilityResult) => void
}

interface ColumnMetadata {
  columnId: string
  columnName: string
  hasData: boolean
  isNumeric: boolean
}

export const CapabilityAnalysisNormalDialog: React.FC<CapabilityAnalysisNormalDialogProps> = ({
  cells,
  columnCount,
  rowCount,
  onReportReady,
}) => {
  const { activeModal, closeModal } = useModal()
  const [arrangement, setArrangement] = useState<ArrangementMode>('single-column')
  const [columnId, setColumnId] = useState<string>('C1')
  const [subgroupSizeRaw, setSubgroupSizeRaw] = useState<string>('')
  const [lsl, setLsl] = useState<string>('')
  const [usl, setUsl] = useState<string>('')
  const [historicalMean, setHistoricalMean] = useState<string>('')
  const [historicalSigma, setHistoricalSigma] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const isOpen = activeModal === 'CAPABILITY_ANALYSIS_NORMAL'

  // Get available columns with metadata
  const availableColumns = useMemo<ColumnMetadata[]>(() => {
    const cols: ColumnMetadata[] = []
    for (let i = 0; i < columnCount; i++) {
      const colId = `C${i + 1}`
      const colCells = cells.filter(
        c => c.column_index === i && c.row_index > 0 && c.value !== null && c.value !== ''
      )
      const numericValues = colCells
        .map(c => {
          const val = parseFloat(String(c.value))
          return isNaN(val) ? null : val
        })
        .filter(v => v !== null) as number[]

      cols.push({
        columnId: colId,
        columnName: colId,
        hasData: colCells.length > 0,
        isNumeric: numericValues.length > 0,
      })
    }
    return cols.filter(c => c.hasData && c.isNumeric)
  }, [cells, columnCount])

  // Get column data (Minitab-compatible parsing - EXACT match)
  const getColumnData = (colId: string): number[] => {
    const match = colId.match(/C(\d+)/)
    if (!match) return []
    const colIndex = parseInt(match[1]) - 1

    // Get all cells for this column (skip header row 0, include row 1 onwards)
    // First, check ALL cells for this column to see what row_indexes exist
    const allColCells = cells.filter(c => c.column_index === colIndex)
    const allRowIndexes = [...new Set(allColCells.map(c => c.row_index))].sort((a, b) => a - b)
    console.log(`[Capability] Column ${colId} (index ${colIndex}): All row_indexes found:`, allRowIndexes)
    console.log(`[Capability] Total cells in column: ${allColCells.length}`)
    console.log(`[Capability] Checking rows 1 to ${rowCount} for data...`)
    
    // CRITICAL: Check row_index 0 (header) - maybe data is stored there?
    const row0Cell = allColCells.find(c => c.row_index === 0)
    if (row0Cell) {
      console.log(`[Capability] 🔍 Row 0 (HEADER) cell found:`, {
        value: row0Cell.value,
        valueType: typeof row0Cell.value,
        valueString: String(row0Cell.value),
        isNumeric: !isNaN(Number(row0Cell.value))
      })
    }
    
    // Get cells with row_index >= 0, but check if row_index 0 is header or data
    // If row_index 0 contains numeric data (not a header), include it
    let colCells: typeof allColCells
    const row0IsNumeric = row0Cell && !isNaN(Number(row0Cell.value)) && isFinite(Number(row0Cell.value))
    
    if (row0IsNumeric) {
      // Row 0 contains numeric data, not a header - include it
      console.log(`[Capability] ⚠️ Row 0 contains NUMERIC data (${row0Cell.value}), including it in analysis`)
      colCells = allColCells
        .filter(c => c.row_index >= 0) // Include row 0
        .sort((a, b) => a.row_index - b.row_index)
    } else {
      // Row 0 is header or empty - skip it
      console.log(`[Capability] Row 0 is header or empty, skipping it`)
      colCells = allColCells
        .filter(c => c.row_index > 0) // Skip row 0
        .sort((a, b) => a.row_index - b.row_index)
    }
    
    // Check for gaps in row indices (missing rows)
    const dataRowIndexes = colCells.map(c => c.row_index).sort((a, b) => a - b)
    if (dataRowIndexes.length > 0) {
      const minRow = Math.min(...dataRowIndexes)
      const maxRow = Math.max(...dataRowIndexes)
      const expectedRows = maxRow - minRow + 1
      if (dataRowIndexes.length < expectedRows) {
        const missingRows: number[] = []
        for (let r = minRow; r <= maxRow; r++) {
          if (!dataRowIndexes.includes(r)) {
            missingRows.push(r)
          }
        }
        console.log(`[Capability] ⚠️ WARNING: Missing row indices in column ${colId}:`, missingRows)
        console.log(`[Capability] Expected ${expectedRows} rows (${minRow} to ${maxRow}), but found ${dataRowIndexes.length} cells`)
      }
    }
    
    // Debug: Check specific rows that might be missing - INCLUDING row 0
    console.log(`[Capability] 🔍 CHECKING ALL ROWS (0-10) for column ${colId}:`)
    for (let checkRow = 0; checkRow <= Math.min(10, rowCount); checkRow++) {
      const cell = allColCells.find(c => c.row_index === checkRow)
      if (!cell) {
        console.log(`[Capability]   Row ${checkRow}: NOT FOUND in cells array (may be empty)`)
      } else {
        const numValue = Number(cell.value)
        const isNumeric = !isNaN(numValue) && isFinite(numValue)
        console.log(`[Capability]   Row ${checkRow}: FOUND - value: ${JSON.stringify(cell.value)}, type: ${typeof cell.value}, numeric: ${isNumeric}${isNumeric ? ` (${numValue})` : ''}`)
      }
    }

    console.log(`[Capability] Column ${colId} (index ${colIndex}): Found ${colCells.length} cells with row_index > 0`)
    console.log(`[Capability] Cell details:`, colCells.map(c => ({ row: c.row_index, value: c.value, type: typeof c.value })))
    
    // CRITICAL: Check row 1 specifically
    const row1Cell = allColCells.find(c => c.row_index === 1)
    if (row1Cell) {
      console.log(`[Capability] 🔍 Row 1 DETAILED CHECK:`, {
        exists: true,
        value: row1Cell.value,
        valueType: typeof row1Cell.value,
        valueString: String(row1Cell.value),
        valueTrimmed: String(row1Cell.value).trim(),
        isInColCells: colCells.some(c => c.row_index === 1),
        willBeProcessed: colCells.find(c => c.row_index === 1) !== undefined
      })
    } else {
      console.log(`[Capability] 🔍 Row 1 DETAILED CHECK: NOT FOUND in allColCells!`)
    }

    // Minitab parsing: trim strings, convert to numbers, ignore blanks, keep all valid numbers
    const cleaned: number[] = []
    
    for (const cell of colCells) {
      let value = cell.value
      const originalValue = value
      const rowIdx = cell.row_index
      
      // CRITICAL DEBUG for row 1
      if (rowIdx === 1) {
        console.log(`[Capability] 🔍 PROCESSING ROW 1:`, {
          value: value,
          valueType: typeof value,
          originalValue: originalValue,
          cellObject: cell
        })
      }
      
      // Handle null/undefined - skip but don't break
      if (value === null || value === undefined) {
        console.log(`[Capability] Row ${rowIdx}: Skipping - null/undefined`)
        continue
      }
      
      // Convert to string first for consistent handling
      let strValue: string
      if (typeof value === 'number') {
        // If already a number, convert to string then parse (handles edge cases)
        strValue = String(value)
      } else if (typeof value === 'string') {
        strValue = value
      } else {
        // Try to convert to string
        strValue = String(value)
      }
      
      // Trim whitespace
      strValue = strValue.trim()
      
      // Ignore blanks (empty after trim)
      if (strValue === '') {
        console.log(`[Capability] Row ${rowIdx}: Skipping - empty after trim`)
        continue
      }
      
      // Convert to number
      const num = Number(strValue)
      
      // Only add if valid finite number (Minitab ignores NaN, Infinity, -Infinity)
      // Important: 0 is a valid number, so check isFinite, not truthy
      if (Number.isFinite(num)) {
        cleaned.push(num)
        console.log(`[Capability] Row ${rowIdx}: ✓ Added ${num} (original: ${JSON.stringify(originalValue)}, type: ${typeof originalValue})`)
        // Do NOT remove duplicates - Minitab counts all occurrences
      } else {
        console.log(`[Capability] Row ${rowIdx}: ✗ Skipping - not finite (original: ${JSON.stringify(originalValue)}, parsed: ${num}, type: ${typeof originalValue})`)
      }
    }

    console.log(`[Capability] Final cleaned data for ${colId}:`, cleaned, `(count: ${cleaned.length})`)
    return cleaned
  }

  // Build subgroups (for subgroups-across-rows arrangement)
  const buildSubgroups = (
    colId: string,
    subgroupSize: number | string
  ): number[][] => {
    const data = getColumnData(colId)
    if (data.length === 0) return []

    let size: number
    if (typeof subgroupSize === 'string') {
      // If it's a column ID, get values from that column
      const sizeData = getColumnData(subgroupSize)
      if (sizeData.length === 0) return []
      size = Math.round(sizeData[0])
    } else {
      size = subgroupSize
    }

    if (size < 1) return []

    const subgroups: number[][] = []
    for (let i = 0; i < data.length; i += size) {
      const subgroup = data.slice(i, i + size)
      if (subgroup.length > 0) {
        subgroups.push(subgroup)
      }
    }
    return subgroups
  }

  const handleOK = () => {
    try {
      setError(null)

      // Validation
      if (!lsl.trim() || !usl.trim()) {
        throw new Error('LSL and USL are required.')
      }

      const lslNum = Number(lsl)
      const uslNum = Number(usl)
      if (!Number.isFinite(lslNum) || !Number.isFinite(uslNum)) {
        throw new Error('LSL and USL must be numeric.')
      }
      if (lslNum >= uslNum) {
        throw new Error('LSL must be less than USL.')
      }

      const data = getColumnData(columnId)
      console.log(`[Capability] Column ${columnId}: Found ${data.length} data points:`, data)
      if (data.length < 2) {
        throw new Error('Sample size must be at least 2.')
      }

      let subgroups: number[][] | undefined
      let subgroupSize: number | string | undefined

      if (arrangement === 'subgroups-across-rows') {
        if (!subgroupSizeRaw.trim()) {
          throw new Error('Subgroup size is required for subgroups across rows.')
        }
        
        // Minitab rule: If subgroup column == data column → IGNORE subgroup
        const subgroupColMatch = subgroupSizeRaw.trim().match(/C(\d+)/)
        let shouldIgnoreSubgroup = false
        
        if (subgroupColMatch) {
          const subgroupColIndex = parseInt(subgroupColMatch[1]) - 1
          const dataColMatch = columnId.match(/C(\d+)/)
          if (dataColMatch) {
            const dataColIndex = parseInt(dataColMatch[1]) - 1
            if (subgroupColIndex === dataColIndex) {
              // Ignore subgroup - treat as single column (Minitab behavior)
              shouldIgnoreSubgroup = true
            }
          }
        }
        
        if (!shouldIgnoreSubgroup) {
          subgroupSize = isNaN(Number(subgroupSizeRaw)) ? subgroupSizeRaw : Number(subgroupSizeRaw)
          subgroups = buildSubgroups(columnId, subgroupSize)
          if (subgroups.length === 0) {
            throw new Error('No valid subgroups could be created.')
          }
        }
        // If shouldIgnoreSubgroup is true, leave subgroups and subgroupSize undefined (single column mode)
      }

      const input: CapabilityInput = {
        columnId,
        arrangement,
        subgroupSize,
        data,
        subgroups,
        lsl: lslNum,
        usl: uslNum,
        historicalMean: historicalMean.trim() ? Number(historicalMean) : undefined,
        historicalSigma: historicalSigma.trim() ? Number(historicalSigma) : undefined,
      }

      const result = computeCapability(input)
      onReportReady(result)
      closeModal()
      toast.success(`Process Capability Report for ${columnId} generated successfully`)
    } catch (e: any) {
      setError(e.message ?? 'Failed to compute capability.')
      toast.error(e.message ?? 'Failed to compute capability.')
    }
  }

  const handleCancel = () => {
    closeModal()
  }

  const numericHelper = (value: string) => {
    if (!value.trim()) return ''
    const num = Number(value)
    if (isNaN(num) || !isFinite(num)) return 'Must be numeric'
    return ''
  }

  if (!isOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 rounded-t-lg border-b border-gray-300">
            <h2 className="text-lg font-semibold text-gray-900">
              Process Capability Analysis (Normal)
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Determine how well your process output meets customer requirements when your data are reasonably normal.
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Panel - Data Arrangement */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data Arrangement:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="arrangement"
                        value="single-column"
                        checked={arrangement === 'single-column'}
                        onChange={(e) => setArrangement(e.target.value as ArrangementMode)}
                        className="mr-2"
                      />
                      <span className="text-sm">Single column</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="arrangement"
                        value="subgroups-across-rows"
                        checked={arrangement === 'subgroups-across-rows'}
                        onChange={(e) => setArrangement(e.target.value as ArrangementMode)}
                        className="mr-2"
                      />
                      <span className="text-sm">Subgroups across rows</span>
                    </label>
                  </div>

                  {arrangement === 'single-column' && (
                    <div className="mt-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Single column:
                      </label>
                      <select
                        value={columnId}
                        onChange={(e) => setColumnId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {availableColumns.map((col) => (
                          <option key={col.columnId} value={col.columnId}>
                            {col.columnId}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subgroup size:
                    </label>
                    <input
                      type="text"
                      value={subgroupSizeRaw}
                      onChange={(e) => setSubgroupSizeRaw(e.target.value)}
                      placeholder="Constant (e.g. 5) or column (e.g. C3)"
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional. Enter a constant number or column ID.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Panel - Specification Limits & Historical Data */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Specification Limits:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">LSL</label>
                      <input
                        type="text"
                        value={lsl}
                        onChange={(e) => setLsl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Lower"
                      />
                      {numericHelper(lsl) && (
                        <p className="text-xs text-red-600 mt-1">{numericHelper(lsl)}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">USL</label>
                      <input
                        type="text"
                        value={usl}
                        onChange={(e) => setUsl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Upper"
                      />
                      {numericHelper(usl) && (
                        <p className="text-xs text-red-600 mt-1">{numericHelper(usl)}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Historical Parameters (Optional):
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Historical Mean</label>
                      <input
                        type="text"
                        value={historicalMean}
                        onChange={(e) => setHistoricalMean(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                      {numericHelper(historicalMean) && (
                        <p className="text-xs text-red-600 mt-1">{numericHelper(historicalMean)}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Historical StDev</label>
                      <input
                        type="text"
                        value={historicalSigma}
                        onChange={(e) => setHistoricalSigma(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                      {numericHelper(historicalSigma) && (
                        <p className="text-xs text-red-600 mt-1">{numericHelper(historicalSigma)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                disabled
              >
                Transform...
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                disabled
              >
                Estimate...
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                disabled
              >
                Options...
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                disabled
              >
                Storage...
              </button>
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
    </>,
    document.body
  )
}
