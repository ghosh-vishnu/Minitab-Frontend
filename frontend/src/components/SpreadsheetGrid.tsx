import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef, CellValueChangedEvent, GridReadyEvent, CellClickedEvent, SelectionChangedEvent } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { Cell, spreadsheetsAPI } from '../api/spreadsheets'
import toast from 'react-hot-toast'

interface SpreadsheetGridProps {
  spreadsheetId: string
  worksheetId?: string
  rowCount: number
  columnCount: number
  cells: Cell[]
  onCellsUpdate: (cells: Cell[]) => void
  enableImport?: boolean
  enableExport?: boolean
}

const SpreadsheetGrid = ({
  spreadsheetId,
  worksheetId,
  rowCount,
  columnCount,
  cells,
  onCellsUpdate,
  enableImport = false,
  enableExport = false,
}: SpreadsheetGridProps) => {
  const gridRef = useRef<AgGridReact>(null)
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const pendingUpdatesRef = useRef<Set<string>>(new Set()) // Track pending cell updates
  const formulaBarRef = useRef<HTMLInputElement>(null)
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number; address: string } | null>(null)
  const [formulaValue, setFormulaValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)

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

  // Extract headers from row 0 (if present)
  const dynamicHeaders = useMemo<string[]>(() => {
    const headers: string[] = []
    for (let i = 0; i < columnCount; i++) {
      // Look for header in row 0
      const headerCell = cells.find(c => c.row_index === 0 && c.column_index === i)
      if (headerCell && headerCell.value != null && String(headerCell.value).trim() !== '') {
        headers.push(String(headerCell.value).trim())
      } else {
        // Fallback to Excel-style column name
        headers.push(getColumnName(i))
      }
    }
    return headers
  }, [cells, columnCount])

  // Check if row 0 contains headers (all cells are text and non-empty)
  const hasHeaderRow = useMemo<boolean>(() => {
    const row0Cells = cells.filter(c => c.row_index === 0)
    if (row0Cells.length === 0) return false
    // If more than 50% of row 0 cells are filled, consider it a header row
    return row0Cells.length >= columnCount * 0.5
  }, [cells, columnCount])

  // Create column definitions with dynamic headers
  const columnDefs = useMemo<ColDef[]>(() => {
    const cols: ColDef[] = []
    for (let i = 0; i < columnCount; i++) {
      cols.push({
        headerName: dynamicHeaders[i] || getColumnName(i),
        field: `col_${i}`,
        editable: true,
        sortable: true,
        filter: true,
        resizable: true,
        width: 120,
        minWidth: 80,
        maxWidth: 500,
        cellEditor: 'agTextCellEditor',
        cellEditorParams: {
          useFormatter: false,
          maxLength: 32767, // Excel cell text limit
        },
        cellStyle: {
          padding: '4px 8px',
          fontSize: '13px',
          fontFamily: 'Segoe UI, -apple-system, sans-serif',
        },
        headerClass: 'excel-header',
      })
    }
    return cols
  }, [columnCount, dynamicHeaders])

  // Convert cells to row data (skip row 0 if it's a header row)
  const rowData = useMemo(() => {
    const rows: Record<string, any>[] = []
    const cellMap = new Map<string, { value: string; formula?: string }>()

    // Map cells by row and column
    cells.forEach((cell) => {
      const key = `${cell.row_index}_${cell.column_index}`
      cellMap.set(key, {
        value: cell.value?.toString() || '',
        formula: cell.formula || undefined,
      })
    })

    // Create rows - skip row 0 if it contains headers
    const startRow = hasHeaderRow ? 1 : 0
    for (let row = startRow; row < rowCount; row++) {
      const rowData: Record<string, any> = {}
      for (let col = 0; col < columnCount; col++) {
        const key = `${row}_${col}`
        const cellData = cellMap.get(key)
        // Show formula if exists, otherwise show value
        rowData[`col_${col}`] = cellData?.formula || cellData?.value || ''
      }
      rows.push(rowData)
    }

    return rows
  }, [cells, rowCount, columnCount, hasHeaderRow])

  // Handle cell click - update formula bar
  const onCellClicked = useCallback((params: CellClickedEvent) => {
    if (!params.colDef?.field || params.node?.rowIndex === undefined) return

    const columnIndex = parseInt(params.colDef.field.replace('col_', ''))
    // Adjust row index if headers are present (grid row 0 = actual row 1)
    const actualRowIndex = hasHeaderRow ? (params.node.rowIndex ?? 0) + 1 : params.node.rowIndex ?? 0
    const address = getCellAddress(actualRowIndex, columnIndex)

    // Find cell data using actual row index
    const cell = cells.find(
      (c) => c.row_index === actualRowIndex && c.column_index === columnIndex
    )

    setSelectedCell({ row: actualRowIndex, col: columnIndex, address })
    // Show formula if exists, otherwise show value
    setFormulaValue(cell?.formula || cell?.value?.toString() || '')
    setIsEditing(false)
  }, [cells, hasHeaderRow])

  // Handle cell selection change
  const onSelectionChanged = useCallback((params: SelectionChangedEvent) => {
    const selectedRows = params.api.getSelectedRows()
    if (selectedRows.length > 0) {
      const firstRow = selectedRows[0]
      const firstCol = columnDefs[0]
      if (firstCol?.field) {
        const colIndex = parseInt(firstCol.field.replace('col_', ''))
        const gridRowIndex = params.api.getRowNode(firstRow)?.rowIndex ?? 0
        // Adjust row index if headers are present
        const actualRowIndex = hasHeaderRow ? gridRowIndex + 1 : gridRowIndex
        const address = getCellAddress(actualRowIndex, colIndex)
        setSelectedCell({ row: actualRowIndex, col: colIndex, address })
      }
    }
  }, [columnDefs, hasHeaderRow])

  // Handle cell value changes
  const onCellValueChanged = useCallback(
    async (params: CellValueChangedEvent) => {
      if (!params.data || !params.colDef?.field) return

      const columnIndex = parseInt(params.colDef.field.replace('col_', ''))
      const gridRowIndex = params.node?.rowIndex ?? 0
      // Adjust row index if headers are present (grid row 0 = actual row 1)
      const actualRowIndex = hasHeaderRow ? gridRowIndex + 1 : gridRowIndex
      const newValue = params.newValue?.toString() || ''
      const oldValue = params.oldValue?.toString() || ''

      // Skip if no change
      if (newValue === oldValue) return

      // Create unique cell key for deduplication
      const cellKey = `${actualRowIndex}-${columnIndex}`

      // If there's already a pending update for this cell, skip
      if (pendingUpdatesRef.current.has(cellKey)) {
        console.log(`Skipping duplicate update for cell ${cellKey}`)
        return
      }

      // Update formula bar immediately
      setFormulaValue(newValue)
      
      // Update local state immediately for instant UI feedback
      const updatedCells = [...cells]
      const cellIndex = updatedCells.findIndex(
        (c) => c.row_index === actualRowIndex && c.column_index === columnIndex
      )
      
      const isFormula = newValue.trim().startsWith('=')
      const dataType = isFormula ? 'formula' : 'text'

      if (cellIndex >= 0) {
        updatedCells[cellIndex] = {
          ...updatedCells[cellIndex],
          value: newValue,
          formula: isFormula ? newValue : undefined,
          data_type: dataType,
        }
      } else {
        updatedCells.push({
          row_index: actualRowIndex,
          column_index: columnIndex,
          value: newValue,
          formula: isFormula ? newValue : undefined,
          data_type: dataType,
        })
      }
      
      // Update parent state immediately
      onCellsUpdate(updatedCells)

      // Clear previous timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      // Debounce API calls
      updateTimeoutRef.current = setTimeout(async () => {
        // Mark cell as having a pending update
        pendingUpdatesRef.current.add(cellKey)

        try {
          // Update cell via API - use updateWorksheetCells for worksheet cells
          if (worksheetId) {
            await spreadsheetsAPI.updateWorksheetCells(spreadsheetId, worksheetId, [{
              row_index: actualRowIndex,
              column_index: columnIndex,
              value: newValue,
              data_type: dataType,
              formula: isFormula ? newValue : undefined,
            }])
          } else {
            // Fallback to single cell update if no worksheet
            await spreadsheetsAPI.updateCell(
              spreadsheetId,
              actualRowIndex,
              columnIndex,
              newValue,
              isFormula ? newValue : undefined,
              dataType
            )
          }
          
          // Show success feedback
          toast.success('Saved', { duration: 800 })
        } catch (error: any) {
          console.error('Failed to update cell', error)
          
          // Specific error messages based on error type
          if (error.response?.status === 500) {
            toast.error('Server error. Please try again.', { duration: 3000 })
          } else {
            toast.error('Failed to update cell', { duration: 3000 })
          }
          
          // Revert cell value
          params.node?.setDataValue(params.colDef?.field ?? '', oldValue)
        } finally {
          // Always remove from pending set
          pendingUpdatesRef.current.delete(cellKey)
        }
      }, 500) // 500ms debounce
    },
    [spreadsheetId, cells, worksheetId, onCellsUpdate, hasHeaderRow]
  )

  // Handle formula bar input
  const handleFormulaBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormulaValue(e.target.value)
  }

  // Handle formula bar submit (Enter key)
  const handleFormulaBarSubmit = useCallback(async () => {
    if (!selectedCell || !gridRef.current) return

    const { row, col } = selectedCell
    const field = `col_${col}`

    // Get the row node
    const rowNode = gridRef.current.api.getRowNode(row.toString())
    if (!rowNode) return

    // Update cell value
    rowNode.setDataValue(field, formulaValue)
    
    // Trigger cell value changed event
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

  // Handle copy (Ctrl+C)
  const handleCopy = useCallback(() => {
    if (!gridRef.current || !selectedCell) return

    const { row, col } = selectedCell
    const value = rowData[row]?.[`col_${col}`] || ''
    navigator.clipboard.writeText(String(value))
    toast.success('Cell copied')
  }, [selectedCell, rowData])

  // Handle paste (Ctrl+V)
  const handlePaste = useCallback(
    async () => {
      if (!gridRef.current || !selectedCell) return

      try {
        const text = await navigator.clipboard.readText()
        const { row, col } = selectedCell
        const field = `col_${col}`
        const rowNode = gridRef.current.api.getRowNode(row.toString())
        
        if (rowNode) {
          rowNode.setDataValue(field, text.trim())
          
          const params: any = {
            data: rowNode.data,
            colDef: columnDefs[col],
            newValue: text.trim(),
            oldValue: rowNode.data[field],
            node: rowNode,
          }
          
          await onCellValueChanged(params)
          toast.success('Pasted successfully')
        }
      } catch (error) {
        toast.error('Failed to paste')
      }
    },
    [selectedCell, columnDefs, rowData, onCellValueChanged]
  )

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 to edit cell
      if (e.key === 'F2' && selectedCell && !isEditing) {
        e.preventDefault()
        setIsEditing(true)
        setTimeout(() => {
          formulaBarRef.current?.focus()
          formulaBarRef.current?.select()
        }, 0)
      }

      // Escape to cancel editing
      if (e.key === 'Escape' && isEditing) {
        setIsEditing(false)
        if (selectedCell) {
          const cell = cells.find(
            (c) => c.row_index === selectedCell.row && c.column_index === selectedCell.col
          )
          setFormulaValue(cell?.formula || cell?.value?.toString() || '')
        }
      }

      // Ctrl+C for copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isEditing) {
        e.preventDefault()
        handleCopy()
      }

      // Ctrl+V for paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isEditing) {
        e.preventDefault()
        handlePaste()
      }

      // Tab navigation
      if (e.key === 'Tab' && selectedCell && !isEditing) {
        e.preventDefault()
        const nextCol = e.shiftKey ? selectedCell.col - 1 : selectedCell.col + 1
        if (nextCol >= 0 && nextCol < columnCount) {
          setSelectedCell({
            ...selectedCell,
            col: nextCol,
            address: getCellAddress(selectedCell.row, nextCol),
          })
          const cell = cells.find(
            (c) => c.row_index === selectedCell.row && c.column_index === nextCol
          )
          setFormulaValue(cell?.formula || cell?.value?.toString() || '')
        }
      }

      // Arrow key navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isEditing) {
        const { row, col } = selectedCell || { row: 0, col: 0 }
        let newRow = row
        let newCol = col

        if (e.key === 'ArrowUp' && row > 0) newRow--
        if (e.key === 'ArrowDown' && row < rowCount - 1) newRow++
        if (e.key === 'ArrowLeft' && col > 0) newCol--
        if (e.key === 'ArrowRight' && col < columnCount - 1) newCol++

        if (newRow !== row || newCol !== col) {
          e.preventDefault()
          setSelectedCell({
            row: newRow,
            col: newCol,
            address: getCellAddress(newRow, newCol),
          })
          const cell = cells.find(
            (c) => c.row_index === newRow && c.column_index === newCol
          )
          setFormulaValue(cell?.formula || cell?.value?.toString() || '')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, isEditing, cells, columnCount, rowCount])

  const onGridReady = useCallback((params: GridReadyEvent) => {
    // Don't auto-fit columns to allow horizontal scrolling
    // params.api.sizeColumnsToFit()
    
    // Select first cell by default
    params.api.setFocusedCell(0, 'col_0')
    setSelectedCell({ row: 0, col: 0, address: 'A1' })
    setFormulaValue('')
  }, [])

  // Handle double click to edit
  const onCellDoubleClicked = useCallback(() => {
    setIsEditing(true)
    setTimeout(() => {
      formulaBarRef.current?.focus()
      formulaBarRef.current?.select()
    }, 0)
  }, [])

  return (
    <div className="excel-spreadsheet w-full h-full flex flex-col">
      {/* Header Detection Info Banner */}
      {hasHeaderRow && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800 flex items-center gap-2">
          <span className="font-semibold">ℹ️ Headers Detected:</span>
          <span className="text-blue-600">{dynamicHeaders.slice(0, 5).join(', ')}</span>
          {dynamicHeaders.length > 5 && <span className="text-blue-500">... and {dynamicHeaders.length - 5} more</span>}
        </div>
      )}

      {/* Toolbar */}
      {(enableImport || enableExport) && (
        <div className="toolbar bg-white border-b border-gray-300 p-2 flex items-center gap-2 flex-wrap">\n          {enableImport && (
            <button
              onClick={() => {}}
              className="btn btn-secondary text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              title="Import Excel/CSV"
            >
              📥 Import
            </button>
          )}
          {enableExport && (
            <>
              <button
                onClick={() => {}}
                className="btn btn-secondary text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                title="Export to Excel"
              >
                📤 Export
              </button>
            </>
          )}
          <div className="flex-1"></div>
          <div className="text-xs text-gray-500">
            Ctrl+C: Copy | Ctrl+V: Paste | F2: Edit | Arrow Keys: Navigate | Tab: Next Cell
          </div>
        </div>
      )}

      {/* Formula Bar - Excel style */}
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
          onBlur={() => {
            // Don't blur if clicking on grid
            setTimeout(() => setIsEditing(false), 200)
          }}
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

      {/* Grid */}
      <div className="ag-theme-alpine flex-1 w-full" style={{ minHeight: 0 }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            editable: true,
            sortable: true,
            filter: true,
            resizable: true,
            cellStyle: { padding: '4px 8px' },
            minWidth: 80,
            valueFormatter: (params) => {
              // Ensure empty cells show as empty string, not null/undefined
              return params.value ?? ''
            },
          }}
          onCellValueChanged={onCellValueChanged}
          onCellClicked={onCellClicked}
          onCellDoubleClicked={onCellDoubleClicked}
          onSelectionChanged={onSelectionChanged}
          onGridReady={onGridReady}
          animateRows={false}
          rowSelection="multiple"
          suppressCellFocus={false}
          enableRangeSelection={true}
          enableFillHandle={false}
          enableRangeHandle={false}
          suppressRowClickSelection={false}
          enterNavigatesVertically={true}
          enterNavigatesVerticallyAfterEdit={true}
          suppressClipboardPaste={false}
          rowHeight={28}
          headerHeight={28}
          groupDisplayType="singleColumn"
          suppressColumnVirtualisation={false}
          suppressRowVirtualisation={false}
          suppressHorizontalScroll={false}
          alwaysShowHorizontalScroll={true}
          alwaysShowVerticalScroll={true}
          tabIndex={1}
        />
      </div>
    </div>
  )
}

export default SpreadsheetGrid
