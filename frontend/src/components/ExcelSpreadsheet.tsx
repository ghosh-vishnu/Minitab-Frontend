/**
 * ExcelSpreadsheet Component - Production-ready Excel-like spreadsheet
 * Features: Copy/paste, keyboard navigation, import/export, auto-save
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  ColDef,
  CellValueChangedEvent,
  GridReadyEvent,
  CellClickedEvent,
  SelectionChangedEvent,
} from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { Cell, spreadsheetsAPI } from '../api/spreadsheets'
import { convertGridToExcel, exportToExcel, exportToCSV } from '../utils/excelUtils'
import ExcelUpload from './ExcelUpload'
import { ExcelData } from '../utils/excelUtils'
import toast from 'react-hot-toast'
import {
  parseClipboardData,
  normalizeValue,
  readClipboard,
  calculatePasteBounds,
  needsGridExpansion,
} from '../utils/clipboardUtils'

interface ExcelSpreadsheetProps {
  spreadsheetId: string
  worksheetId?: string
  rowCount: number
  columnCount: number
  cells: Cell[]
  onCellsUpdate: (cells: Cell[]) => void
  enableImport?: boolean
  enableExport?: boolean
  autoSaveDelay?: number // milliseconds
}

const ExcelSpreadsheet = ({
  spreadsheetId,
  worksheetId,
  rowCount,
  columnCount,
  cells,
  onCellsUpdate,
  enableImport = true,
  enableExport = true,
  autoSaveDelay = 1000,
}: ExcelSpreadsheetProps) => {
  const gridRef = useRef<AgGridReact>(null)
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>()
  const pendingUpdatesRef = useRef<Set<string>>(new Set()) // Track pending cell updates
  const formulaBarRef = useRef<HTMLInputElement>(null)
  const [selectedCell, setSelectedCell] = useState<{
    row: number
    col: number
    address: string
  } | null>(null)
  const [formulaValue, setFormulaValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [pasteRange, setPasteRange] = useState<{
    startRow: number
    startCol: number
    endRow: number
    endCol: number
  } | null>(null)
  const gridContainerRef = useRef<HTMLDivElement>(null)

  // Convert column index to Excel-style column name (A, B, C, ..., Z, AA, AB, ...)
  const getColumnName = (index: number): string => {
    let result = ''
    let num = index
    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result
      num = Math.floor(num / 26) - 1
    }
    return result
  }

  // Get cell address (A1, B2, etc.)
  const getCellAddress = (row: number, col: number): string => {
    return `${getColumnName(col)}${row + 1}`
  }

  // Determine cell style for visual feedback (highlight pasted range)
  const getCellStyle = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (!pasteRange) return undefined

      const { startRow, startCol, endRow, endCol } = pasteRange
      if (
        rowIndex >= startRow &&
        rowIndex <= endRow &&
        colIndex >= startCol &&
        colIndex <= endCol
      ) {
        return {
          backgroundColor: '#b3d9ff',
          border: '2px solid #0066cc',
        } as any
      }

      return undefined
    },
    [pasteRange]
  )

  // Create column definitions
  const columnDefs = useMemo<ColDef[]>(() => {
    const cols: ColDef[] = []
    for (let i = 0; i < columnCount; i++) {
      cols.push({
        headerName: getColumnName(i),
        field: `col_${i}`,
        editable: true,
        sortable: true,
        filter: true,
        resizable: true,
        width: 120,
        cellEditor: 'agTextCellEditor',
        cellEditorParams: {
          useFormatter: false,
        },
        // Ensure ag-Grid treats values as raw strings and does NOT attempt
        // to coerce/format numbers. This preserves exact source representation.
        valueFormatter: (params: any) => {
          if (params == null || params.value == null) return ''
          return String(params.value)
        },
        // Prevent ag-Grid from parsing user input into numbers implicitly.
        valueParser: (params: any) => {
          // Keep the raw input as string (preserve user intent). Caller
          // code will decide when to persist/convert to a number.
          return params.newValue == null ? '' : String(params.newValue)
        },
        cellStyle: (params: any) => {
          return getCellStyle(params.node.rowIndex, i)
        },
      })
    }
    return cols
  }, [columnCount, getCellStyle])

  // Convert cells to row data
  const rowData = useMemo(() => {
    const rows: Record<string, any>[] = []
    const cellMap = new Map<string, { value: string; formula?: string }>()

    cells.forEach((cell) => {
      const key = `${cell.row_index}_${cell.column_index}`
      cellMap.set(key, {
        value: cell.value?.toString() || '',
        formula: cell.formula || undefined,
      })
    })

    for (let row = 0; row < rowCount; row++) {
      const rowData: Record<string, any> = {}
      for (let col = 0; col < columnCount; col++) {
        const key = `${row}_${col}`
        const cellData = cellMap.get(key)
        rowData[`col_${col}`] = cellData?.formula || cellData?.value || ''
      }
      rows.push(rowData)
    }

    return rows
  }, [cells, rowCount, columnCount])

  // Handle cell click - update formula bar
  const onCellClicked = useCallback(
    (params: CellClickedEvent) => {
      if (!params.colDef?.field || params.node?.rowIndex === null || params.node?.rowIndex === undefined) return

      const columnIndex = parseInt(params.colDef.field.replace('col_', ''))
      const rowIndex = params.node.rowIndex
      const address = getCellAddress(rowIndex, columnIndex)

      const cell = cells.find(
        (c) => c.row_index === rowIndex && c.column_index === columnIndex
      )

      setSelectedCell({ row: rowIndex, col: columnIndex, address })
      setFormulaValue(cell?.formula || cell?.value?.toString() || '')
      setIsEditing(false)
    },
    [cells]
  )

  // Handle cell selection change
  const onSelectionChanged = useCallback(
    (params: SelectionChangedEvent) => {
      const selectedRows = params.api.getSelectedRows()
      if (selectedRows.length > 0) {
        const firstRow = selectedRows[0]
        const firstCol = columnDefs[0]
        if (firstCol?.field) {
          const colIndex = parseInt(firstCol.field.replace('col_', ''))
          const rowIndex = params.api.getRowNode(firstRow)?.rowIndex ?? 0
          const address = getCellAddress(rowIndex, colIndex)
          setSelectedCell({ row: rowIndex, col: colIndex, address })
        }
      }
    },
    [columnDefs]
  )

  // Handle cell value changes with auto-save
  const onCellValueChanged = useCallback(
    async (params: CellValueChangedEvent) => {
      if (!params.data || !params.colDef?.field) return

      const columnIndex = parseInt(params.colDef.field.replace('col_', ''))
      const rowIndex = params.node?.rowIndex ?? 0
      const newValue = params.newValue == null ? '' : String(params.newValue)
      const oldValue = params.oldValue == null ? '' : String(params.oldValue)

      // No-op if nothing changed (prevents repeated retries/loops)
      if (newValue === oldValue) return

      // Create unique cell key for deduplication
      const cellKey = `${rowIndex}-${columnIndex}`

      // If there's already a pending update for this cell, skip this request
      // This prevents race conditions when ag-Grid fires multiple change events
      if (pendingUpdatesRef.current.has(cellKey)) {
        console.log(`Skipping duplicate update for cell ${cellKey}`)
        return
      }

      setFormulaValue(newValue)

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      // Optimistic update: update UI immediately
      const updatedCells = [...cells]
      const cellIndex = updatedCells.findIndex(
        (c) => c.row_index === rowIndex && c.column_index === columnIndex
      )

      const isFormula = newValue.trim().startsWith('=')
      const dataType = isFormula ? 'formula' : 'text'
      const newCellData = {
        row_index: rowIndex,
        column_index: columnIndex,
        value: newValue,
        formula: isFormula ? newValue : undefined,
        data_type: dataType,
      }

      if (cellIndex >= 0) {
        updatedCells[cellIndex] = {
          ...updatedCells[cellIndex],
          ...newCellData,
        }
      } else {
        updatedCells.push(newCellData)
      }

      // Update UI immediately (optimistic)
      onCellsUpdate(updatedCells)

      updateTimeoutRef.current = setTimeout(async () => {
        // Mark this cell as having a pending update
        pendingUpdatesRef.current.add(cellKey)

        try {
          // Call API to persist the change
          await spreadsheetsAPI.updateCell(
            spreadsheetId,
            rowIndex,
            columnIndex,
            newValue,
            isFormula ? newValue : undefined,
            dataType,
            worksheetId
          )
          
          // API success - cell is persisted
          toast.success('Saved', { duration: 800 })
        } catch (error: any) {
          // Rollback on API failure: restore old value
          console.error('Failed to update cell:', error)
          
          // Only show error once per cell update attempt
          if (error.response?.status === 500) {
            toast.error('Server error. Please try again.', { duration: 3000 })
          } else {
            toast.error('Failed to save. Change was not persisted.', { duration: 3000 })
          }

          // Revert UI to old value via state update (avoid calling setDataValue which
          // can retrigger onCellValueChanged and cause loops). Use the original
          // `cells` array snapshot to compute rollback.
          const rollbackCells = [...cells]
          const rollbackIndex = rollbackCells.findIndex(
            (c) => c.row_index === rowIndex && c.column_index === columnIndex
          )

          if (rollbackIndex >= 0) {
            rollbackCells[rollbackIndex] = {
              ...rollbackCells[rollbackIndex],
              value: oldValue,
              formula: oldValue.startsWith('=') ? oldValue : undefined,
              data_type: oldValue.startsWith('=') ? 'formula' : 'text',
            }
          }

          onCellsUpdate(rollbackCells)
          setFormulaValue(oldValue)
          // Do not rethrow or retry here; we only retry on explicit user action
        } finally {
          // Always remove from pending set when done (success or failure)
          pendingUpdatesRef.current.delete(cellKey)
        }
      }, autoSaveDelay)
    },
    [spreadsheetId, worksheetId, cells, onCellsUpdate, autoSaveDelay]
  )

  // Handle copy (Ctrl+C)
  const handleCopy = useCallback(() => {
    if (!gridRef.current) return

    const selectedRanges = gridRef.current.api.getCellRanges()
    if (!selectedRanges || selectedRanges.length === 0) {
      const focusedCell = gridRef.current.api.getFocusedCell()
      if (focusedCell) {
        const value = focusedCell.rowIndex !== null
          ? rowData[focusedCell.rowIndex]?.[focusedCell.column?.getColId() || ''] || ''
          : ''
        navigator.clipboard.writeText(String(value))
        toast.success('Cell copied')
      }
      return
    }

    const range = selectedRanges[0]
    const startRow = range.startRow?.rowIndex ?? 0
    const endRow = range.endRow?.rowIndex ?? 0
    const startColId = range.startColumn?.getColId() || ''
    const endColId = (range as any).endColumn?.getColId() || ''

    const startColIndex = parseInt(startColId.replace('col_', ''))
    const endColIndex = endColId ? parseInt(endColId.replace('col_', '')) : startColIndex

    const copiedData: string[][] = []

    for (let r = startRow; r <= endRow; r++) {
      const row: string[] = []
      for (let c = startColIndex; c <= endColIndex; c++) {
        const value = rowData[r]?.[`col_${c}`] || ''
        row.push(String(value))
      }
      copiedData.push(row)
    }

    // Convert to tab-separated string for clipboard
    const clipboardText = copiedData.map((row) => row.join('\t')).join('\n')
    navigator.clipboard.writeText(clipboardText)
    toast.success(`Copied ${copiedData.length} row(s)`)
  }, [rowData])

  // Handle paste (Ctrl+V) - Enhanced with grid expansion and range selection
  const handlePaste = useCallback(
    async (e?: ClipboardEvent) => {
      // Only paste if a cell is selected and we're not in edit mode
      if (!gridRef.current || !selectedCell || isEditing) {
        return
      }

      // Prevent default browser paste behavior
      if (e) {
        e.preventDefault()
      }

      try {
        let clipboardText: string = ''

        // Try to get clipboard data from event, then fallback to Clipboard API
        if (e?.clipboardData) {
          clipboardText = e.clipboardData.getData('text')
        } else {
          clipboardText = await readClipboard()
        }

        // Parse the clipboard content into 2D array
        const pasteData = parseClipboardData(clipboardText)

        if (pasteData.length === 0 || pasteData[0].length === 0) {
          toast.error('No valid data to paste')
          return
        }

        const { row: startRow, col: startCol } = selectedCell

        // Calculate bounds of pasted data
        const bounds = calculatePasteBounds(startRow, startCol, pasteData)

        // Check if we need to expand grid
        const expansion = needsGridExpansion(bounds, rowCount, columnCount)

        // If grid expansion is needed, call API to expand it
        if (expansion.needsRowExpansion || expansion.needsColExpansion) {
          try {
            await spreadsheetsAPI.updateSpreadsheetDimensions(
              spreadsheetId,
              expansion.newRowCount,
              expansion.newColCount
            )
            // Grid expansion will be reflected in next render through props update
            toast.success(
              `Grid expanded to ${expansion.newRowCount} rows × ${expansion.newColCount} columns`
            )
          } catch (error) {
            console.error('Failed to expand grid:', error)
            toast.error('Could not expand grid to fit all data')
            // Continue with paste within current bounds
          }
        }

        // Update cells with pasted data
        const updatedCells = [...cells]
        let pastedCount = 0

        pasteData.forEach((row, rowOffset) => {
          row.forEach((cellValue, colOffset) => {
            const targetRow = startRow + rowOffset
            const targetCol = startCol + colOffset

            // Only update cells within current (or expanded) grid bounds
            const maxRow = expansion.needsRowExpansion ? expansion.newRowCount : rowCount
            const maxCol = expansion.needsColExpansion ? expansion.newColCount : columnCount

            if (targetRow < maxRow && targetCol < maxCol) {
              const field = `col_${targetCol}`
              const rowNode = gridRef.current?.api.getRowNode(targetRow.toString())

              if (rowNode && cellValue.trim() !== '') {
                // Normalize the value (convert to number if appropriate).
                // We explicitly request numeric parsing for clipboard paste,
                // but by default the app preserves exact string values.
                const normalizedValue = normalizeValue(cellValue, true)

                // Update grid display
                rowNode.setDataValue(field, normalizedValue)

                // Update internal cell tracking
                const cellIndex = updatedCells.findIndex(
                  (c) => c.row_index === targetRow && c.column_index === targetCol
                )

                const dataType =
                  typeof normalizedValue === 'number' ? 'number' : 'text'

                if (cellIndex >= 0) {
                  updatedCells[cellIndex] = {
                    ...updatedCells[cellIndex],
                    value: normalizedValue,
                    data_type: dataType,
                  }
                } else {
                  updatedCells.push({
                    row_index: targetRow,
                    column_index: targetCol,
                    value: normalizedValue,
                    data_type: dataType,
                  })
                }

                pastedCount++
              }
            }
          })
        })

        // Update cell state
        onCellsUpdate(updatedCells)

        // Highlight the pasted range for visual feedback
        setPasteRange(bounds)

        // Set active cell to bottom-right of pasted area
        const lastRow = Math.min(bounds.endRow, rowCount - 1)
        const lastCol = Math.min(bounds.endCol, columnCount - 1)
        setSelectedCell({
          row: lastRow,
          col: lastCol,
          address: getCellAddress(lastRow, lastCol),
        })

        // Focus on grid
        gridRef.current?.api.setFocusedCell(lastRow, `col_${lastCol}`)

        // Clear paste highlight after 1 second
        setTimeout(() => {
          setPasteRange(null)
        }, 1000)

        toast.success(
          `Pasted ${pastedCount} cell${pastedCount !== 1 ? 's' : ''} successfully`
        )
      } catch (error: any) {
        console.error('Paste error:', error)
        toast.error(error.message || 'Failed to paste data')
      }
    },
    [selectedCell, isEditing, cells, rowCount, columnCount, spreadsheetId, onCellsUpdate]

  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+C - Copy
      if (e.ctrlKey && e.key === 'c' && !isEditing) {
        e.preventDefault()
        handleCopy()
      }

      // Ctrl+V - Paste
      if (e.ctrlKey && e.key === 'v' && !isEditing) {
        e.preventDefault()
        handlePaste()
      }

      // F2 - Edit cell
      if (e.key === 'F2' && selectedCell && !isEditing) {
        e.preventDefault()
        setIsEditing(true)
        setTimeout(() => {
          formulaBarRef.current?.focus()
          formulaBarRef.current?.select()
        }, 0)
      }

      // Escape - Cancel editing
      if (e.key === 'Escape' && isEditing) {
        setIsEditing(false)
        if (selectedCell) {
          const cell = cells.find(
            (c) => c.row_index === selectedCell.row && c.column_index === selectedCell.col
          )
          setFormulaValue(cell?.formula || cell?.value?.toString() || '')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, isEditing, cells, handleCopy, handlePaste])

  // Handle formula bar
  const handleFormulaBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormulaValue(e.target.value)
  }

  const handleFormulaBarSubmit = useCallback(async () => {
    if (!selectedCell || !gridRef.current) return

    const { row, col } = selectedCell
    const field = `col_${col}`
    const rowNode = gridRef.current.api.getRowNode(row.toString())
    if (!rowNode) return

    rowNode.setDataValue(field, formulaValue)

    const params: any = {
      data: rowNode.data,
      colDef: columnDefs[col],
      newValue: formulaValue,
      oldValue: rowNode.data[field],
      node: rowNode,
    }

    await onCellValueChanged(params)
    setIsEditing(false)
  }, [selectedCell, formulaValue, columnDefs, onCellValueChanged])

  // Handle import
  const handleImport = useCallback(
    async (data: ExcelData | ExcelData[]) => {
      try {
        const excelData = Array.isArray(data) ? data[0] : data

        if (!excelData.data || excelData.data.length === 0) {
          toast.error('No data found in file')
          return
        }

        const updatedCells: Cell[] = []

        excelData.data.forEach((row) => {
          row.forEach((cell) => {
            if (cell.value !== null && cell.row < rowCount && cell.col < columnCount) {
              updatedCells.push({
                row_index: cell.row,
                column_index: cell.col,
                value: cell.value,
                data_type: 'text',
              })
            }
          })
        })

        // Bulk update cells
        await spreadsheetsAPI.bulkUpdateCells(spreadsheetId, updatedCells)
        onCellsUpdate(updatedCells)
        setShowImportModal(false)
        toast.success('File imported successfully')
      } catch (error: any) {
        toast.error(error.message || 'Failed to import file')
      }
    },
    [spreadsheetId, rowCount, columnCount, onCellsUpdate]
  )

  // Handle export
  const handleExport = useCallback(
    async (format: 'xlsx' | 'csv') => {
      try {
        if (!gridRef.current) return

        const columnDefsForExport = columnDefs.map((col) => ({
          field: col.field || '',
          headerName: col.headerName,
        }))

        const excelData = convertGridToExcel(rowData, columnDefsForExport)
        const filename = `spreadsheet_${spreadsheetId}.${format}`

        if (format === 'xlsx') {
          exportToExcel(excelData, 'Sheet1', filename)
        } else {
          exportToCSV(excelData, filename)
        }

        toast.success(`Exported to ${format.toUpperCase()}`)
      } catch (error: any) {
        toast.error('Failed to export file')
        console.error(error)
      }
    },
    [rowData, columnDefs, spreadsheetId]
  )

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit()
    params.api.setFocusedCell(0, 'col_0')
    setSelectedCell({ row: 0, col: 0, address: 'A1' })
    setFormulaValue('')
  }, [])

  const onCellDoubleClicked = useCallback(() => {
    setIsEditing(true)
    setTimeout(() => {
      formulaBarRef.current?.focus()
      formulaBarRef.current?.select()
    }, 0)
  }, [])

  return (
    <div className="excel-spreadsheet w-full">
      {/* Toolbar */}
      <div className="toolbar bg-white border-b border-gray-300 p-2 flex items-center gap-2 flex-wrap">
        {enableImport && (
          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary text-sm"
            title="Import Excel/CSV (Ctrl+I)"
          >
            📥 Import
          </button>
        )}
        {enableExport && (
          <>
            <button
              onClick={() => handleExport('xlsx')}
              className="btn btn-secondary text-sm"
              title="Export to Excel"
            >
              📤 Export Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="btn btn-secondary text-sm"
              title="Export to CSV"
            >
              📤 Export CSV
            </button>
          </>
        )}
        <div className="flex-1"></div>
        <div className="text-xs text-gray-500">
          Ctrl+C: Copy | Ctrl+V: Paste | F2: Edit | Esc: Cancel
        </div>
      </div>

      {/* Formula Bar */}
      <div className="formula-bar bg-white border-b border-gray-300 p-2 flex items-center gap-2">
        <div className="cell-address bg-gray-100 px-3 py-1.5 min-w-[60px] text-center font-mono text-sm border border-gray-300">
          {selectedCell?.address || 'A1'}
        </div>
        <div className="fx-icon text-gray-600 font-semibold px-2">fx</div>
        <input
          ref={formulaBarRef}
          type="text"
          value={formulaValue}
          onChange={handleFormulaBarChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleFormulaBarSubmit()
            } else if (e.key === 'Escape') {
              setIsEditing(false)
            }
          }}
          onBlur={() => setTimeout(() => setIsEditing(false), 200)}
          className="formula-input flex-1 px-3 py-1.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="Enter formula or value"
        />
        <button
          onClick={handleFormulaBarSubmit}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          title="Enter (Apply)"
        >
          ✓
        </button>
        <button
          onClick={() => {
            setIsEditing(false)
            if (selectedCell) {
              const cell = cells.find(
                (c) => c.row_index === selectedCell.row && c.column_index === selectedCell.col
              )
              setFormulaValue(cell?.formula || cell?.value?.toString() || '')
            }
          }}
          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          title="Cancel (Esc)"
        >
          ✕
        </button>
      </div>

      {/* Grid Container with Paste Handler */}
      <div
        ref={gridContainerRef}
        className="ag-theme-alpine"
        style={{ height: 'calc(100vh - 300px)', width: '100%' }}
        onPaste={handlePaste as any}
        tabIndex={0}
      >
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            editable: true,
            sortable: true,
            filter: true,
            resizable: true,
            cellStyle: { padding: '4px' },
          }}
          onCellValueChanged={onCellValueChanged}
          onCellClicked={onCellClicked}
          onCellDoubleClicked={onCellDoubleClicked}
          onSelectionChanged={onSelectionChanged}
          onGridReady={onGridReady}
          animateRows={true}
          rowSelection="single"
          suppressCellFocus={false}
          enableRangeSelection={false}
          enableFillHandle={true}
          enableRangeHandle={true}
          suppressRowClickSelection={false}
          enterNavigatesVertically={true}
          enterNavigatesVerticallyAfterEdit={true}
          suppressClipboardPaste={true}
        />
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Import Excel/CSV File</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <ExcelUpload onFileParsed={handleImport} />
          </div>
        </div>
      )}
    </div>
  )
}

export default ExcelSpreadsheet



