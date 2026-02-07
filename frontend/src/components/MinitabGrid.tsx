import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AgGridReact } from 'ag-grid-react'
import {
  ColDef,
  CellValueChangedEvent,
  GridReadyEvent,
  CellClickedEvent,
} from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { Cell, spreadsheetsAPI } from '../api/spreadsheets'
import toast from 'react-hot-toast'

interface MinitabGridProps {
  spreadsheetId: string
  // Backend worksheet ID for the currently active sheet, if any.
  // When provided, all cell updates will be saved against this worksheet
  // so that reloads using `getWorksheetCells` see the latest values.
  activeWorksheetId?: string
  rowCount: number
  columnCount: number
  cells: Cell[]
  onCellsUpdate: (cells: Cell[]) => void
  spreadsheetName?: string
  worksheetNames?: Record<string, string>
  onWorksheetNamesUpdate?: (names: Record<string, string>) => Promise<void>
}

interface WorksheetData {
  id: number
  name: string
  cells: Cell[]
}

const MinitabGrid = ({
  spreadsheetId,
  activeWorksheetId,
  rowCount,
  columnCount,
  cells,
  onCellsUpdate,
  spreadsheetName = 'Worksheet 1',
  worksheetNames = {},
  onWorksheetNamesUpdate,
}: MinitabGridProps) => {
  const gridRef = useRef<AgGridReact>(null)
  const updateTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map()) // Track timeouts per cell
  const pendingUpdatesRef = useRef<Set<string>>(new Set()) // Track pending cell updates

  // Store worksheets with their own data
  const [worksheets, setWorksheets] = useState<WorksheetData[]>([
    { id: 1, name: spreadsheetName, cells: [] },
  ])
  const [activeTab, setActiveTab] = useState(1)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    worksheetId: number
  } | null>(null)

  // Rename modal state
  const [renameModal, setRenameModal] = useState<{
    visible: boolean
    worksheetId: number
    currentName: string
  } | null>(null)

  // Inline rename state
  const [editingTabId, setEditingTabId] = useState<number | null>(null)
  const [editingTabName, setEditingTabName] = useState('')

  // Get current worksheet data
  const currentWorksheet = useMemo(() => {
    return worksheets.find((ws) => ws.id === activeTab) || worksheets[0]
  }, [worksheets, activeTab])

  // Initialize first worksheet with cells from props - only once
  useEffect(() => {
    if (cells.length > 0 && worksheets.length === 1 && worksheets[0].cells.length === 0) {
      setWorksheets([{ id: 1, name: spreadsheetName, cells: [...cells] }])
    }
  }, []) // Only run once on mount

  // Update worksheet when cells prop changes (from parent)
  const prevCellsRef = useRef<Cell[]>([])
  useEffect(() => {
    const cellsChanged = JSON.stringify(cells) !== JSON.stringify(prevCellsRef.current)
    if (cellsChanged && cells.length > 0) {
      prevCellsRef.current = cells
      setWorksheets((prev) =>
        prev.map((ws, idx) => {
          if (idx === 0) {
            return { ...ws, cells: [...cells] }
          }
          return ws
        })
      )
    }
  }, [cells])

  // Load worksheet names from backend
  useEffect(() => {
    if (worksheetNames && Object.keys(worksheetNames).length > 0) {
      setWorksheets((prev) =>
        prev.map((ws) => {
          const newName = worksheetNames[String(ws.id)]
          if (newName && newName !== ws.name) {
            return { ...ws, name: newName }
          }
          return ws
        })
      )
    }
  }, [worksheetNames])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      // Clean up all pending timeouts on unmount
      updateTimeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout)
      })
      updateTimeoutsRef.current.clear()
    }
  }, [])

  // Calculate actual column count from cells
  const actualColumnCount = useMemo(() => {
    const worksheetCells =
      currentWorksheet?.cells && currentWorksheet.cells.length > 0
        ? currentWorksheet.cells
        : cells
    let maxCol = columnCount - 1
    worksheetCells.forEach((cell) => {
      if (cell.column_index !== undefined) {
        maxCol = Math.max(maxCol, cell.column_index)
      }
    })
    return maxCol + 1
  }, [currentWorksheet?.cells, cells, columnCount])

  // Create column definitions
  const columnDefs = useMemo(() => {
    const cols: ColDef[] = []

    // Row number column
    cols.push({
      headerName: '',
      field: '_rowNumber',
      width: 48,
      pinned: 'left',
      lockPosition: true,
      suppressMovable: true,
      cellRenderer: (params: any) => params.node.rowIndex + 1,
      cellStyle: {
        padding: '0 8px',
        fontSize: '13px',
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        fontWeight: '500',
        borderRight: '1px solid #e6e6e6',
        color: '#6b7280',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      headerClass: 'minitab-row-header',
      editable: false,
      sortable: false,
      filter: false,
      resizable: false,
    })

    // Data columns
    const colsToCreate = Math.max(columnCount, actualColumnCount)
    for (let i = 0; i < colsToCreate; i++) {
      cols.push({
        headerName: `C${i + 1}`,
        field: `col_${i}`,
        editable: true,
        sortable: true,
        filter: true,
        resizable: true,
        width: 100,
        minWidth: 80,
        cellStyle: {
          padding: '0 8px',
          fontSize: '13px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          borderRight: '1px solid #e9ecef',
          borderBottom: '1px solid #e9ecef',
        },
        headerClass: 'minitab-column-header',
      })
    }
    return cols
  }, [columnCount, actualColumnCount])

  // Convert cells to row data
  const rowData = useMemo(() => {
    const rows: Record<string, any>[] = []
    const cellMap = new Map<string, string>()

    const worksheetCells =
      currentWorksheet?.cells && currentWorksheet.cells.length > 0
        ? currentWorksheet.cells
        : cells

    worksheetCells.forEach((cell) => {
      if (cell.row_index !== undefined && cell.column_index !== undefined) {
        const key = `${cell.row_index}_${cell.column_index}`
        const value = cell.value?.toString() || ''
        if (value) {
          cellMap.set(key, value)
        }
      }
    })

    let maxRow = 0
    let maxCol = 0
    cellMap.forEach((_, key) => {
      const [row, col] = key.split('_').map(Number)
      maxRow = Math.max(maxRow, row)
      maxCol = Math.max(maxCol, col)
    })

    const actualRowCount = Math.max(rowCount, maxRow + 1)
    const actualColCount = Math.max(columnCount, maxCol + 1)

    for (let row = 0; row < actualRowCount; row++) {
      const rowDataObj: Record<string, any> = {
        _rowNumber: row + 1,
      }
      for (let col = 0; col < actualColCount; col++) {
        const key = `${row}_${col}`
        const cellValue = cellMap.get(key) || ''
        rowDataObj[`col_${col}`] = cellValue
      }
      rows.push(rowDataObj)
    }

    return rows
  }, [currentWorksheet?.cells, cells, rowCount, columnCount])

  const onCellClicked = useCallback((params: CellClickedEvent) => {
    if (!params.colDef?.field || params.node?.rowIndex === undefined) return
    // Cell selection is handled by AG-Grid, just keep focus state
  }, [])

  // Handle keyboard navigation in edit mode
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key

      // Check if we're in edit mode by checking focused cell
      const focusedCell = gridRef.current?.api.getFocusedCell()
      if (!focusedCell) return

      const currentRowIndex = focusedCell.rowIndex
      const currentColField = focusedCell.column.getColId()
      const currentColIndex = parseInt(currentColField.replace('col_', ''))

      // Handle Enter key - save and move to next row
      if (key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        // Stop editing (will trigger onCellValueChanged)
        gridRef.current?.api.stopEditing(false)
        // Move to next row
        setTimeout(() => {
          const nextRowIndex = currentRowIndex + 1
          gridRef.current?.api.setFocusedCell(nextRowIndex, currentColField)
        }, 0)
        return
      }

      // Handle Shift+Enter - save and move to previous row
      if (key === 'Enter' && event.shiftKey) {
        event.preventDefault()
        gridRef.current?.api.stopEditing(false)
        setTimeout(() => {
          const prevRowIndex = Math.max(0, currentRowIndex - 1)
          gridRef.current?.api.setFocusedCell(prevRowIndex, currentColField)
        }, 0)
        return
      }

      // Handle Tab - move to next column
      if (key === 'Tab' && !event.shiftKey) {
        event.preventDefault()
        gridRef.current?.api.stopEditing(false)
        setTimeout(() => {
          const nextColIndex = currentColIndex + 1
          const nextColField = `col_${nextColIndex}`
          gridRef.current?.api.setFocusedCell(currentRowIndex, nextColField)
        }, 0)
        return
      }

      // Handle Shift+Tab - move to previous column
      if (key === 'Tab' && event.shiftKey) {
        event.preventDefault()
        gridRef.current?.api.stopEditing(false)
        setTimeout(() => {
          if (currentColIndex > 0) {
            const prevColIndex = currentColIndex - 1
            const prevColField = `col_${prevColIndex}`
            gridRef.current?.api.setFocusedCell(currentRowIndex, prevColField)
          }
        }, 0)
        return
      }

      // Handle Escape - cancel edit mode
      if (key === 'Escape') {
        event.preventDefault()
        gridRef.current?.api.stopEditing(true)
        return
      }
    },
    []
  )

  // Attach keyboard handler to grid container
  useEffect(() => {
    // Attach to the grid wrapper div which is the closest reliable target
    const handleKeyDownOnDocument = (event: Event) => {
      const keyEvent = event as KeyboardEvent
      // Only intercept if the event is from the grid
      const target = event.target as HTMLElement
      if (target?.closest('.ag-theme-alpine')) {
        handleKeyDown(keyEvent)
      }
    }
    
    document.addEventListener('keydown', handleKeyDownOnDocument as EventListener, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDownOnDocument as EventListener, true)
    }
  }, [handleKeyDown])

  const onCellValueChanged = useCallback(
    async (params: CellValueChangedEvent) => {
      if (!params.data || !params.colDef?.field) return

      const columnIndex = parseInt(params.colDef.field.replace('col_', ''))
      const rowIndex = params.node?.rowIndex ?? 0
      const newValue = params.newValue?.toString() || ''
      const oldValue = params.oldValue?.toString() || ''

      // Skip if no change
      if (newValue === oldValue) return

      // Create unique cell key for deduplication
      const cellKey = `${rowIndex}-${columnIndex}`

      // If there's already a pending update for this cell, skip
      if (pendingUpdatesRef.current.has(cellKey)) {
        return
      }

      // Cancel any existing timeout for this specific cell
      const existingTimeout = updateTimeoutsRef.current.get(cellKey)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
        updateTimeoutsRef.current.delete(cellKey)
      }

      // Debounce: wait 800ms before sending the update
      // This prevents rapid typing from triggering multiple API calls
      const timeoutId = setTimeout(async () => {
        // Remove timeout from map
        updateTimeoutsRef.current.delete(cellKey)
        
        // Mark cell as having a pending update
        pendingUpdatesRef.current.add(cellKey)

        try {
          const isFormula = newValue.trim().startsWith('=')
          const dataType = isFormula ? 'formula' : 'text'

          await spreadsheetsAPI.updateCell(
            spreadsheetId,
            rowIndex,
            columnIndex,
            newValue,
            isFormula ? newValue : undefined,
            dataType,
            activeWorksheetId
          )

          let nextActiveCells: Cell[] | null = null

          setWorksheets((prev) => {
            const updatedWorksheets = prev.map((ws) => {
              if (ws.id === activeTab) {
                const updatedCells = [...ws.cells]
                const cellIndex = updatedCells.findIndex(
                  (c) => c.row_index === rowIndex && c.column_index === columnIndex
                )

                const newCell: Cell = {
                  row_index: rowIndex,
                  column_index: columnIndex,
                  value: newValue,
                  formula: isFormula ? newValue : undefined,
                  data_type: dataType,
                }

                if (cellIndex >= 0) {
                  updatedCells[cellIndex] = { ...updatedCells[cellIndex], ...newCell }
                } else {
                  updatedCells.push(newCell)
                }

                // Capture the latest cells for the currently active worksheet
                nextActiveCells = updatedCells
                return { ...ws, cells: updatedCells }
              }
              return ws
            })

            return updatedWorksheets
          })

          // Propagate latest cells for the active worksheet up to the parent
          if (nextActiveCells) {
            onCellsUpdate(nextActiveCells)
          }
        } catch (error: any) {
          // Specific error handling for different error types
          if (error.response?.status === 500) {
            toast.error('Server error. Please try again.', { duration: 3000 })
          } else {
            toast.error('Failed to update cell', { duration: 3000 })
          }
          console.error('Cell update error:', error)
          
          // Rollback to old value
          if (params.colDef?.field) {
            params.node?.setDataValue(params.colDef.field, oldValue)
          }
        } finally {
          // Always remove from pending set
          pendingUpdatesRef.current.delete(cellKey)
        }
      }, 800) // Increased debounce to 800ms to prevent rapid-fire requests

      // Store timeout ID for this cell
      updateTimeoutsRef.current.set(cellKey, timeoutId)
    },
    [spreadsheetId, activeWorksheetId, activeTab]
  )

  const saveCurrentGridData = useCallback((): Cell[] => {
    const gridData: Cell[] = []
    if (gridRef.current?.api) {
      const rowCount = gridRef.current.api.getDisplayedRowCount()
      for (let row = 0; row < rowCount; row++) {
        const rowNode = gridRef.current.api.getDisplayedRowAtIndex(row)
        if (rowNode && rowNode.data) {
          for (let col = 0; col < columnCount; col++) {
            const value = rowNode.data[`col_${col}`]
            if (value && value.toString().trim()) {
              gridData.push({
                row_index: row,
                column_index: col,
                value: value.toString(),
                data_type: 'text',
              })
            }
          }
        }
      }
    }
    return gridData
  }, [columnCount])

  const handleTabChange = useCallback(
    (tabId: number) => {
      if (tabId === activeTab) return

      const gridData = saveCurrentGridData()

      setWorksheets((prev) =>
        prev.map((ws) => {
          if (ws.id === activeTab) {
            return { ...ws, cells: gridData }
          }
          return ws
        })
      )

      setActiveTab(tabId)
    },
    [activeTab, saveCurrentGridData]
  )

  const handleAddWorksheet = useCallback(() => {
    const gridData = saveCurrentGridData()

    setWorksheets((prev) => {
      const updated = prev.map((ws) => {
        if (ws.id === activeTab) {
          return { ...ws, cells: gridData }
        }
        return ws
      })

      const newTabId = Math.max(...prev.map((ws) => ws.id), 0) + 1
      const newWorksheet: WorksheetData = {
        id: newTabId,
        name: `Worksheet ${newTabId}`,
        cells: [],
      }

      const result = [...updated, newWorksheet]

      if (onWorksheetNamesUpdate) {
        const names: Record<string, string> = {}
        result.forEach((ws) => {
          names[String(ws.id)] = ws.name
        })
        onWorksheetNamesUpdate(names).catch(() => {
          toast.error('Failed to save worksheet names')
        })
      }

      return result
    })

    const newTabId = Math.max(...worksheets.map((ws) => ws.id), 0) + 1
    setActiveTab(newTabId)
  }, [worksheets, activeTab, saveCurrentGridData, onWorksheetNamesUpdate])

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit()
    params.api.setFocusedCell(0, 'col_0')
  }, [])

  // When the user switches tabs, persist the previous tab's cells to the parent
  useEffect(() => {
    if (currentWorksheet) {
      onCellsUpdate(currentWorksheet.cells)
    }
  }, [activeTab])

  const handleTabRightClick = useCallback((e: React.MouseEvent, worksheetId: number) => {
    e.preventDefault()
    e.stopPropagation()

    const menuWidth = 200
    const menuHeight = 200
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x = e.clientX
    let y = e.clientY

    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10
    }
    if (x < 10) {
      x = 10
    }

    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10
    }
    if (y < 10) {
      y = 10
    }

    setContextMenu({
      visible: true,
      x,
      y,
      worksheetId,
    })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu()
      }
    }

    const handleResize = () => {
      if (contextMenu) {
        const menuWidth = 200
        const menuHeight = 250
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        let x = contextMenu.x
        let y = contextMenu.y

        if (x + menuWidth > viewportWidth) {
          x = Math.max(10, viewportWidth - menuWidth - 10)
        }
        if (y + menuHeight > viewportHeight) {
          y = Math.max(10, viewportHeight - menuHeight - 10)
        }

        setContextMenu((prev) => (prev ? { ...prev, x, y } : null))
      }
    }

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      window.addEventListener('resize', handleResize)
      return () => {
        document.removeEventListener('click', handleClickOutside)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [contextMenu, closeContextMenu])

  const handleDeleteWorksheet = useCallback(
    (worksheetId: number) => {
      if (worksheets.length <= 1) {
        toast.error('Cannot delete the last worksheet', { duration: 2000 })
        closeContextMenu()
        return
      }

      closeContextMenu()

      if (window.confirm('Are you sure you want to delete this worksheet?')) {
        setWorksheets((prev) => {
          const filtered = prev.filter((ws) => ws.id !== worksheetId)
          if (worksheetId === activeTab) {
            setActiveTab(filtered[0]?.id || 1)
          }
          return filtered
        })
        toast.success('Worksheet deleted successfully', { duration: 2000 })
      }
    },
    [worksheets, activeTab, closeContextMenu]
  )

  const handleRenameWorksheet = useCallback(
    (worksheetId: number) => {
      const worksheet = worksheets.find((ws) => ws.id === worksheetId)
      if (worksheet) {
        setRenameModal({
          visible: true,
          worksheetId,
          currentName: worksheet.name,
        })
        closeContextMenu()
      }
    },
    [worksheets, closeContextMenu]
  )

  const handleTabDoubleClick = useCallback(
    (e: React.MouseEvent, worksheetId: number) => {
      e.preventDefault()
      e.stopPropagation()
      const worksheet = worksheets.find((ws) => ws.id === worksheetId)
      if (worksheet) {
        setEditingTabId(worksheetId)
        setEditingTabName(worksheet.name)
      }
    },
    [worksheets]
  )

  const handleInlineRenameSave = useCallback(
    (worksheetId: number) => {
      const newName = editingTabName.trim()
      if (!newName) {
        toast.error('Worksheet name cannot be empty')
        setEditingTabId(null)
        return
      }

      setWorksheets((prev) =>
        prev.map((ws) => {
          if (ws.id === worksheetId) {
            return { ...ws, name: newName }
          }
          return ws
        })
      )

      setEditingTabId(null)
      toast.success('Worksheet renamed')

      if (onWorksheetNamesUpdate) {
        setWorksheets((prev) => {
          const names: Record<string, string> = {}
          prev.forEach((ws) => {
            names[String(ws.id)] = ws.name
          })
          onWorksheetNamesUpdate(names).catch(() => {
            toast.error('Failed to save worksheet names')
          })
          return prev
        })
      }
    },
    [editingTabName, onWorksheetNamesUpdate]
  )

  const handleInlineRenameCancel = useCallback(() => {
    setEditingTabId(null)
    setEditingTabName('')
  }, [])

  const handleSaveRename = useCallback(() => {
    if (!renameModal) return

    const newName = renameModal.currentName.trim()
    if (!newName) {
      toast.error('Worksheet name cannot be empty')
      return
    }

    setWorksheets((prev) =>
      prev.map((ws) => {
        if (ws.id === renameModal.worksheetId) {
          return { ...ws, name: newName }
        }
        return ws
      })
    )

    setRenameModal(null)
    toast.success('Worksheet renamed')

    if (onWorksheetNamesUpdate) {
      setWorksheets((prev) => {
        const names: Record<string, string> = {}
        prev.forEach((ws) => {
          names[String(ws.id)] = ws.name
        })
        onWorksheetNamesUpdate(names).catch(() => {
          toast.error('Failed to save worksheet names')
        })
        return prev
      })
    }
  }, [renameModal, onWorksheetNamesUpdate])

  const handleDuplicateWorksheet = useCallback(
    (worksheetId: number) => {
      const worksheet = worksheets.find((ws) => ws.id === worksheetId)
      if (!worksheet) return

      const newTabId = Math.max(...worksheets.map((ws) => ws.id), 0) + 1
      const duplicatedWorksheet: WorksheetData = {
        id: newTabId,
        name: `${worksheet.name} (Copy)`,
        cells: [...worksheet.cells],
      }

      setWorksheets((prev) => {
        const result = [...prev, duplicatedWorksheet]

        if (onWorksheetNamesUpdate) {
          const names: Record<string, string> = {}
          result.forEach((ws) => {
            names[String(ws.id)] = ws.name
          })
          onWorksheetNamesUpdate(names).catch(() => {
            toast.error('Failed to save worksheet names')
          })
        }

        return result
      })

      setActiveTab(newTabId)
      closeContextMenu()
      toast.success('Worksheet duplicated')
    },
    [worksheets, closeContextMenu, onWorksheetNamesUpdate]
  )

  const handleExportWorksheet = useCallback(
    async (worksheetId: number) => {
      const worksheet = worksheets.find((ws) => ws.id === worksheetId)
      if (!worksheet) return

      try {
        const csvRows: string[] = []
        let maxRow = 0
        let maxCol = 0

        worksheet.cells.forEach((cell) => {
          maxRow = Math.max(maxRow, cell.row_index)
          maxCol = Math.max(maxCol, cell.column_index)
        })

        for (let row = 0; row <= maxRow; row++) {
          const rowData: string[] = []
          for (let col = 0; col <= maxCol; col++) {
            const cell = worksheet.cells.find(
              (c) => c.row_index === row && c.column_index === col
            )
            const value = cell?.value || ''
            const escapedValue = String(value).replace(/"/g, '""')
            rowData.push(
              value &&
                (value.toString().includes(',') || value.toString().includes('"'))
                ? `"${escapedValue}"`
                : escapedValue
            )
          }
          csvRows.push(rowData.join(','))
        }

        const csvContent = csvRows.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `${worksheet.name}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        closeContextMenu()
        toast.success('Worksheet exported')
      } catch (error) {
        toast.error('Failed to export worksheet')
        console.error(error)
      }
    },
    [worksheets, closeContextMenu]
  )

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <svg
            width="400"
            height="400"
            viewBox="0 0 400 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g>
              <rect x="50" y="100" width="60" height="200" fill="#2E7D32" rx="4" />
              <rect x="130" y="50" width="60" height="250" fill="#2E7D32" rx="4" />
              <rect x="210" y="120" width="60" height="180" fill="#2E7D32" rx="4" />
              <rect x="290" y="80" width="60" height="220" fill="#2E7D32" rx="4" />
            </g>
            <text
              x="200"
              y="340"
              fontFamily="Arial, sans-serif"
              fontSize="48"
              fontWeight="bold"
              fill="#2E7D32"
              textAnchor="middle"
            >
              Minitab
            </text>
            <path
              d="M 370 40 L 390 60 L 370 80 Z"
              fill="#2E7D32"
              opacity="0.8"
            />
          </svg>
        </div>

        <div className="ag-theme-alpine h-full relative z-10">
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            onGridReady={onGridReady}
            onCellValueChanged={onCellValueChanged}
            onCellClicked={onCellClicked}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true,
            }}
            suppressMenuHide={true}
            enableRangeSelection={true}
            rowSelection="multiple"
            animateRows={true}
            stopEditingWhenCellsLoseFocus={true}
            enterNavigatesVerticallyAfterEdit={false}
            enterNavigatesVertically={false}
          />
        </div>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 flex items-center px-2 py-1 overflow-x-auto">
        {worksheets.map((tab) => (
          <div
            key={tab.id}
            className={`relative flex-shrink-0 mr-1 rounded-t ${
              activeTab === tab.id
                ? 'bg-white border-t-2 border-l border-r border-green-600'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {editingTabId === tab.id ? (
              <input
                type="text"
                value={editingTabName}
                onChange={(e) => setEditingTabName(e.target.value)}
                onBlur={() => handleInlineRenameSave(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleInlineRenameSave(tab.id)
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    handleInlineRenameCancel()
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-transparent border-none outline-none text-xs px-3 py-1 text-gray-900 min-w-[80px] max-w-[200px]"
                autoFocus
              />
            ) : (
              <button
                onClick={() => handleTabChange(tab.id)}
                onDoubleClick={(e) => handleTabDoubleClick(e, tab.id)}
                onContextMenu={(e) => handleTabRightClick(e, tab.id)}
                className="px-3 py-1 block text-left whitespace-nowrap cursor-pointer hover:bg-gray-50 text-xs"
              >
                {tab.name}
              </button>
            )}
          </div>
        ))}

        <button
          onClick={handleAddWorksheet}
          className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded flex-shrink-0"
        >
          +
        </button>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-3 py-1 flex justify-between items-center text-xs text-gray-600">
        <div>
          {worksheets.find((w) => w.id === activeTab)?.name || 'Worksheet'} | {rowCount}{' '}
          rows × {columnCount} columns
        </div>
        <div>Ready</div>
      </div>

      {contextMenu &&
        contextMenu.visible &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.preventDefault()
                closeContextMenu()
              }}
            />

            <div
              className="fixed z-50 bg-white rounded shadow-lg border border-gray-200 min-w-[200px] py-1"
              style={{
                left: `${contextMenu.x}px`,
                top: `${contextMenu.y}px`,
              }}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              <button
                onClick={() => handleExportWorksheet(contextMenu.worksheetId)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Export Worksheet
              </button>
              <button
                onClick={() => handleDeleteWorksheet(contextMenu.worksheetId)}
                disabled={worksheets.length <= 1}
                className={`w-full text-left px-3 py-1.5 text-xs ${
                  worksheets.length <= 1
                    ? 'text-gray-400 cursor-not-allowed opacity-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={
                  worksheets.length <= 1
                    ? 'Cannot delete the last worksheet'
                    : 'Delete this worksheet'
                }
              >
                Delete Worksheet
              </button>
              <button
                onClick={() => handleRenameWorksheet(contextMenu.worksheetId)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Rename Worksheet
              </button>
              <button
                onClick={() => handleDuplicateWorksheet(contextMenu.worksheetId)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Duplicate Worksheet
              </button>
              <hr className="my-1 border-gray-200" />
              <button
                onClick={() => {
                  const ws = worksheets.find((w) => w.id === contextMenu.worksheetId)
                  toast.success(
                    `Worksheet: ${ws?.name}\nCells: ${ws?.cells.length || 0}`,
                    { duration: 3000 }
                  )
                  closeContextMenu()
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Worksheet Information
              </button>
            </div>
          </>,
          document.body
        )}

      {renameModal && renameModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Rename Worksheet</h3>
            <input
              type="text"
              value={renameModal.currentName}
              onChange={(e) =>
                setRenameModal({
                  ...renameModal,
                  currentName: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Worksheet name"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSaveRename()
                } else if (e.key === 'Escape') {
                  setRenameModal(null)
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameModal(null)}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MinitabGrid